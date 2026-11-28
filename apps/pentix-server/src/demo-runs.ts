/**
 * Background demo batches: play a batch of demo games with every registered
 * engine and rank them winner to loser.
 *
 * A run lives in memory only. It never touches the user, game, or session
 * repositories, so a demo batch cannot change retained state. Runs play one at a
 * time so plan timings stay comparable, and the playback yields whenever a new
 * piece is planned so the HTTP server keeps answering while a long batch runs.
 *
 * Within one game every engine plays its own demo session created from one
 * shared `PentixGame`, so the engines face the same piece sequence and the
 * standings compare planning, not luck.
 */
import {
  DEFAULT_DEMO_STARTING_LEVEL,
  advanceDemoPlayback,
  createDemoPlayback,
  createDemoSession,
  createPentixGame,
  demoEngineRegistry,
  type DemoEngine,
  type GameSessionStatistics,
  type PieceIdSelector,
} from '../../../packages/pentix-core/dist/index.js'
import type { PentixStorage } from './storage/repositories.js'

/** The most games one run may play. */
export const MAX_DEMO_RUN_GAME_COUNT = 256

/** The game count a run uses when the request names none. */
export const DEFAULT_DEMO_RUN_GAME_COUNT = 1

/** How many completed runs stay readable before the oldest is dropped. */
export const MAX_RETAINED_DEMO_RUNS = 32

export type DemoRunStatus = 'queued' | 'running' | 'completed' | 'failed'

/** One engine's aggregate result for a finished run. */
export interface DemoRunEngineStanding {
  readonly engineId: string
  readonly name: string
  /** The sum of `points` over the run's game rows. */
  readonly totalPoints: number
  /** The sum of `lines` over the run's game rows. */
  readonly totalLines: number
  /** The sum of `pieces` over the run's game rows. */
  readonly totalPieces: number
  /** Milliseconds spent inside this engine's plan calls. */
  readonly playingTimeMs: number
  /** Playing time per `1000` placed pieces, or `null` when none was placed. */
  readonly playingTimePer1000PiecesMs: number | null
}

/** One engine's result for one game of a run. */
export interface DemoRunGameStanding {
  readonly engineId: string
  readonly points: number
  readonly lines: number
  readonly pieces: number
  /** Milliseconds spent inside this engine's plan calls during the game. */
  readonly playingTimeMs: number
}

/** One finished game of a run. */
export interface DemoRunGameResult {
  /** Zero-based position of the game in the run. */
  readonly index: number
  /** The id of the stored `PentixGame`. */
  readonly id: string
  /** Every engine of the run, ranked for this game. */
  readonly standings: readonly DemoRunGameStanding[]
}

/** A run as the HTTP layer reports it. */
export interface DemoRunSnapshot {
  readonly id: string
  readonly status: DemoRunStatus
  readonly gameCount: number
  readonly completedGameCount: number
  /** Every engine, ranked by the run totals. */
  readonly engines: readonly DemoRunEngineStanding[]
  /** One entry per finished game. */
  readonly games: readonly DemoRunGameResult[]
  /** Present only when the status is `failed`. */
  readonly error?: string
}

export interface DemoRunServiceOptions {
  /** Piece selector applied to every demo game, as the lifecycle does. */
  readonly selectPieceId?: PieceIdSelector
  /** The competing engines. Defaults to every registered demo engine. */
  readonly engines?: readonly DemoEngine[]
  /** The level every demo session opens at. */
  readonly startingLevel?: number
  /** Fixes the demo seed column, so a test can replay identical games. */
  readonly seedColumn?: number
  /** Millisecond clock used to time `plan` calls. */
  readonly clock?: () => number
  /** Storage for each game and each finished session log. */
  readonly storage: PentixStorage
  /** Returns the AI user id that an engine's demo sessions belong to. */
  readonly resolveEngineUserId: (engineId: string) => string
}

interface DemoRunTotals {
  points: number
  lines: number
  pieces: number
  planTimeMs: number
}

interface DemoRunRecord {
  readonly id: string
  readonly engines: readonly DemoEngine[]
  readonly status: DemoRunStatus
  readonly gameCount: number
  readonly completedGameCount: number
  readonly engineStandings: readonly DemoRunEngineStanding[]
  readonly games: readonly DemoRunGameResult[]
  readonly error?: string
}

const DEMO_RUN_STATUS = Object.freeze({
  queued: 'queued',
  running: 'running',
  completed: 'completed',
  failed: 'failed',
} satisfies Record<DemoRunStatus, DemoRunStatus>)

function roundMilliseconds(value: number): number {
  return Math.round(value * 1000) / 1000
}

/**
 * The planning time of `1000` pieces, rounded to three decimals.
 * A count of `0` has no rate, so it answers `null`.
 */
export function playingTimePer1000PiecesMs(
  playingTimeMs: number,
  pieceCount: number,
): number | null {
  if (pieceCount === 0) {
    return null
  }

  return roundMilliseconds((playingTimeMs * 1000) / pieceCount)
}

function checkGameCount(gameCount: number): number {
  if (
    !Number.isInteger(gameCount) ||
    gameCount < 1 ||
    gameCount > MAX_DEMO_RUN_GAME_COUNT
  ) {
    throw new RangeError(
      `Demo run gameCount must be an integer from 1 to ${MAX_DEMO_RUN_GAME_COUNT}.`,
    )
  }

  return gameCount
}

function toSnapshot(record: DemoRunRecord): DemoRunSnapshot {
  return Object.freeze({
    id: record.id,
    status: record.status,
    gameCount: record.gameCount,
    completedGameCount: record.completedGameCount,
    engines: record.engineStandings,
    games: record.games,
    ...(record.error === undefined ? {} : { error: record.error }),
  })
}

/** One row of either list, reduced to the fields that the rank reads. */
interface DemoRunRank {
  readonly points: number
  readonly lines: number
  readonly pieces: number
  readonly playingTimeMs: number
  readonly engineId: string
}

/** Ranks the rows: points, lines, pieces, then the shorter planning time. */
function compareRank(a: DemoRunRank, b: DemoRunRank): number {
  return (
    b.points - a.points ||
    b.lines - a.lines ||
    b.pieces - a.pieces ||
    a.playingTimeMs - b.playingTimeMs ||
    (a.engineId < b.engineId ? -1 : a.engineId > b.engineId ? 1 : 0)
  )
}

/** Reduces an engine line to the fields that the rank reads. */
function engineRank(line: DemoRunEngineStanding): DemoRunRank {
  return {
    points: line.totalPoints,
    lines: line.totalLines,
    pieces: line.totalPieces,
    playingTimeMs: line.playingTimeMs,
    engineId: line.engineId,
  }
}

/** Builds one game row from an engine's finished session. */
function toGameStanding(
  engine: DemoEngine,
  statistics: GameSessionStatistics,
  planTimeMs: number,
): DemoRunGameStanding {
  return Object.freeze({
    engineId: engine.id,
    points: statistics.score,
    lines: statistics.clearedLines,
    pieces: statistics.blocks,
    playingTimeMs: roundMilliseconds(planTimeMs),
  })
}

/** Plays demo batches in the background, one run at a time. */
export class DemoRunService {
  private readonly createId: () => string
  private readonly engines: readonly DemoEngine[]
  private readonly selectPieceId?: PieceIdSelector
  private readonly startingLevel: number
  private readonly seedColumn?: number
  private readonly clock?: () => number
  private readonly storage: PentixStorage
  private readonly resolveEngineUserId: (engineId: string) => string
  private readonly runs = new Map<string, DemoRunRecord>()
  private readonly queue: string[] = []
  private readonly idleWaiters: (() => void)[] = []
  private pumping = false

  constructor(createId: () => string, options: DemoRunServiceOptions) {
    this.createId = createId
    this.engines = options.engines ?? demoEngineRegistry.list()
    this.selectPieceId = options.selectPieceId
    this.startingLevel = options.startingLevel ?? DEFAULT_DEMO_STARTING_LEVEL
    this.seedColumn = options.seedColumn
    this.clock = options.clock
    this.storage = options.storage
    this.resolveEngineUserId = options.resolveEngineUserId
  }

  /** Creates a queued run and returns its snapshot before any game is played. */
  startRun(gameCount: number): DemoRunSnapshot {
    const checkedGameCount = checkGameCount(gameCount)
    this.trimRetainedRuns()

    const record: DemoRunRecord = Object.freeze({
      id: this.createId(),
      gameCount: checkedGameCount,
      engines: this.engines,
      status: DEMO_RUN_STATUS.queued,
      completedGameCount: 0,
      engineStandings: this.buildEngineStandings(
        this.engines,
        this.createTotals(this.engines),
      ),
      games: Object.freeze([]) as readonly DemoRunGameResult[],
    })

    this.runs.set(record.id, record)
    this.queue.push(record.id)
    // A macrotask, not a microtask: the 202 response must leave the process
    // before the first engine starts planning.
    setImmediate(() => {
      void this.pump()
    })

    return toSnapshot(record)
  }

  /** Returns a run's snapshot, or `undefined` when the id is unknown. */
  getRun(runId: string): DemoRunSnapshot | undefined {
    const record = this.runs.get(runId)
    return record === undefined ? undefined : toSnapshot(record)
  }

  /** Resolves once no run is queued and none is playing. */
  whenIdle(): Promise<void> {
    if (!this.isBusy()) {
      return Promise.resolve()
    }

    return new Promise<void>((resolve) => {
      this.idleWaiters.push(resolve)
    })
  }

  private isBusy(): boolean {
    return this.pumping || this.queue.length > 0
  }

  private settleIdle(): void {
    if (this.isBusy()) {
      return
    }

    const waiters = this.idleWaiters.splice(0, this.idleWaiters.length)
    for (const resolve of waiters) {
      resolve()
    }
  }

  /** Drops the oldest finished runs until the retention bound holds. */
  private trimRetainedRuns(): void {
    const isFinished = (record: DemoRunRecord): boolean =>
      record.status === DEMO_RUN_STATUS.completed ||
      record.status === DEMO_RUN_STATUS.failed

    let finished = 0
    for (const record of this.runs.values()) {
      if (isFinished(record)) {
        finished += 1
      }
    }

    for (const [runId, record] of [...this.runs]) {
      if (finished < MAX_RETAINED_DEMO_RUNS) {
        break
      }
      if (isFinished(record)) {
        this.runs.delete(runId)
        finished -= 1
      }
    }
  }

  private update(runId: string, patch: Partial<DemoRunRecord>): void {
    const record = this.runs.get(runId)
    if (record === undefined) {
      return
    }

    this.runs.set(runId, Object.freeze({ ...record, ...patch }))
  }

  /** Plays queued runs in order, one at a time, until the queue drains. */
  private async pump(): Promise<void> {
    if (this.pumping) {
      return
    }

    this.pumping = true
    try {
      for (
        let runId = this.queue.shift();
        runId !== undefined;
        runId = this.queue.shift()
      ) {
        const record = this.runs.get(runId)
        if (record === undefined || record.status !== DEMO_RUN_STATUS.queued) {
          continue
        }
        await this.playRun(record)
      }
    } finally {
      this.pumping = false
      this.settleIdle()
    }
  }

  /** A zeroed totals entry for every engine. */
  private createTotals(engines: readonly DemoEngine[]): Map<string, DemoRunTotals> {
    const totals = new Map<string, DemoRunTotals>()
    for (const engine of engines) {
      totals.set(engine.id, { points: 0, lines: 0, pieces: 0, planTimeMs: 0 })
    }

    return totals
  }

  /** Builds the ranked engine lines from the run totals. */
  private buildEngineStandings(
    engines: readonly DemoEngine[],
    totals: ReadonlyMap<string, DemoRunTotals>,
  ): readonly DemoRunEngineStanding[] {
    const lines = engines.map((engine) => {
      const engineTotals = totals.get(engine.id)
      const totalPieces = engineTotals?.pieces ?? 0
      const playingTimeMs = roundMilliseconds(engineTotals?.planTimeMs ?? 0)

      return Object.freeze({
        engineId: engine.id,
        name: engine.name,
        totalPoints: engineTotals?.points ?? 0,
        totalLines: engineTotals?.lines ?? 0,
        totalPieces,
        playingTimeMs,
        playingTimePer1000PiecesMs: playingTimePer1000PiecesMs(
          playingTimeMs,
          totalPieces,
        ),
      })
    })

    lines.sort((a, b) => compareRank(engineRank(a), engineRank(b)))
    return Object.freeze(lines)
  }

  private async playRun(record: DemoRunRecord): Promise<void> {
    this.update(record.id, { status: DEMO_RUN_STATUS.running })

    const totals = this.createTotals(record.engines)
    let games: readonly DemoRunGameResult[] = Object.freeze([])

    try {
      for (let gameIndex = 0; gameIndex < record.gameCount; gameIndex += 1) {
        const game = await this.playGame(record, totals, gameIndex)
        games = Object.freeze([...games, game])
        if (this.runs.get(record.id) === undefined) {
          return
        }

        this.update(record.id, {
          completedGameCount: gameIndex + 1,
          games,
          engineStandings: this.buildEngineStandings(record.engines, totals),
        })
      }

      this.update(record.id, {
        status: DEMO_RUN_STATUS.completed,
        games,
        engineStandings: this.buildEngineStandings(record.engines, totals),
      })
      this.trimRetainedRuns()
    } catch (error) {
      this.update(record.id, {
        status: DEMO_RUN_STATUS.failed,
        error: error instanceof Error ? error.message : String(error),
        games: Object.freeze([]),
        engineStandings: this.buildEngineStandings(
          record.engines,
          this.createTotals(record.engines),
        ),
      })
    }
  }

  /** Plays one game: one shared game, one session per engine, all played out. */
  private async playGame(
    record: DemoRunRecord,
    totals: Map<string, DemoRunTotals>,
    gameIndex: number,
  ): Promise<DemoRunGameResult> {
    let game = createPentixGame({
      id: this.createId(),
      selectPieceId: this.selectPieceId,
    })
    await this.storage.games.create(game)

    const rows: DemoRunGameStanding[] = []

    for (const engine of record.engines) {
      const session = createDemoSession({
        id: this.createId(),
        userId: this.resolveEngineUserId(engine.id),
        game,
        level: this.startingLevel,
        seedColumn: this.seedColumn,
      })

      // Drive the shared playback one step at a time and yield whenever the
      // engine plans a new piece, so HTTP stays responsive during a long game.
      let playback = createDemoPlayback({
        engine,
        game,
        session,
        selectPieceId: this.selectPieceId,
        clock: this.clock,
      })
      let plannedPieces = playback.plans

      while (!playback.done) {
        playback = advanceDemoPlayback(playback)
        if (playback.plans !== plannedPieces) {
          plannedPieces = playback.plans
          await new Promise<void>((resolve) => {
            setImmediate(resolve)
          })
        }
      }

      if (playback.game.pieceIds.length > game.pieceIds.length) {
        game = playback.game
        await this.storage.games.save(game)
      }

      await this.storage.sessions.create(playback.log)

      const row = toGameStanding(
        engine,
        playback.session.statistics,
        playback.planTimeMs,
      )
      rows.push(row)

      const engineTotals = totals.get(engine.id)
      if (engineTotals !== undefined) {
        engineTotals.points += row.points
        engineTotals.lines += row.lines
        engineTotals.pieces += row.pieces
        engineTotals.planTimeMs += row.playingTimeMs
      }
    }

    rows.sort(compareRank)
    return Object.freeze({
      index: gameIndex,
      id: game.id,
      standings: Object.freeze(rows),
    })
  }
}


