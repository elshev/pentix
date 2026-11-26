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
  type PieceIdSelector,
} from '../../../packages/pentix-core/dist/index.js'

/** The most games one run may play. */
export const MAX_DEMO_RUN_GAME_COUNT = 256

/** The game count a run uses when the request names none. */
export const DEFAULT_DEMO_RUN_GAME_COUNT = 1

/** How many completed runs stay readable before the oldest is dropped. */
export const MAX_RETAINED_DEMO_RUNS = 32

/** The synthetic user id of a demo session. Demo sessions are never retained. */
export const DEMO_RUN_USER_ID = 'demo'

export type DemoRunStatus = 'queued' | 'running' | 'completed' | 'failed'

/** One engine's place in a finished run's standings. */
export interface DemoRunStanding {
  readonly engineId: string
  readonly name: string
  readonly points: number
  readonly lines: number
  readonly pieces: number
  /** Milliseconds spent inside this engine's plan calls. */
  readonly playingTimeMs: number
}

/** A run as the HTTP layer reports it. */
export interface DemoRunSnapshot {
  readonly id: string
  readonly status: DemoRunStatus
  readonly gameCount: number
  readonly completedGameCount: number
  /** The engine ids that compete, in registry order. */
  readonly engines: readonly string[]
  /** Empty until the run completes. */
  readonly standings: readonly DemoRunStanding[]
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
  readonly engineIds: readonly string[]
  readonly status: DemoRunStatus
  readonly gameCount: number
  readonly completedGameCount: number
  readonly standings: readonly DemoRunStanding[]
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
    engines: record.engineIds,
    standings: record.standings,
    ...(record.error === undefined ? {} : { error: record.error }),
  })
}

/** Ranks the engines: points, lines, pieces, then the shorter planning time. */
function compareStandings(
  a: DemoRunStanding,
  b: DemoRunStanding,
): number {
  return (
    b.points - a.points ||
    b.lines - a.lines ||
    b.pieces - a.pieces ||
    a.playingTimeMs - b.playingTimeMs ||
    (a.engineId < b.engineId ? -1 : a.engineId > b.engineId ? 1 : 0)
  )
}

/** Plays demo batches in the background, one run at a time. */
export class DemoRunService {
  private readonly createId: () => string
  private readonly engines: readonly DemoEngine[]
  private readonly selectPieceId?: PieceIdSelector
  private readonly startingLevel: number
  private readonly seedColumn?: number
  private readonly clock?: () => number
  private readonly runs = new Map<string, DemoRunRecord>()
  private readonly queue: string[] = []
  private readonly idleWaiters: (() => void)[] = []
  private pumping = false

  constructor(createId: () => string, options: DemoRunServiceOptions = {}) {
    this.createId = createId
    this.engines = options.engines ?? demoEngineRegistry.list()
    this.selectPieceId = options.selectPieceId
    this.startingLevel = options.startingLevel ?? DEFAULT_DEMO_STARTING_LEVEL
    this.seedColumn = options.seedColumn
    this.clock = options.clock
  }

  /** Creates a queued run and returns its snapshot before any game is played. */
  startRun(gameCount: number): DemoRunSnapshot {
    const checkedGameCount = checkGameCount(gameCount)
    this.trimRetainedRuns()

    const record: DemoRunRecord = Object.freeze({
      id: this.createId(),
      gameCount: checkedGameCount,
      engines: this.engines,
      engineIds: Object.freeze(this.engines.map((engine) => engine.id)),
      status: DEMO_RUN_STATUS.queued,
      completedGameCount: 0,
      standings: Object.freeze(
        [],
      ) as readonly DemoRunStanding[],
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

  private async playRun(record: DemoRunRecord): Promise<void> {
    this.update(record.id, { status: DEMO_RUN_STATUS.running })

    try {
      const totals = new Map<string, DemoRunTotals>()
      for (const engine of record.engines) {
        totals.set(engine.id, { points: 0, lines: 0, pieces: 0, planTimeMs: 0 })
      }

      for (let gameIndex = 0; gameIndex < record.gameCount; gameIndex += 1) {
        await this.playGame(record, totals)
        if (this.runs.get(record.id) === undefined) {
          return
        }
        this.update(record.id, { completedGameCount: gameIndex + 1 })
      }

      const standings = record.engines
        .map((engine) => {
          const engineTotals = totals.get(engine.id)
          return Object.freeze({
            engineId: engine.id,
            name: engine.name,
            points: engineTotals?.points ?? 0,
            lines: engineTotals?.lines ?? 0,
            pieces: engineTotals?.pieces ?? 0,
            playingTimeMs: roundMilliseconds(engineTotals?.planTimeMs ?? 0),
          })
        })
        .sort(compareStandings)

      this.update(record.id, {
        status: DEMO_RUN_STATUS.completed,
        standings: Object.freeze(standings),
      })
      this.trimRetainedRuns()
    } catch (error) {
      this.update(record.id, {
        status: DEMO_RUN_STATUS.failed,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /** Plays one game: one shared game, one session per engine, all played out. */
  private async playGame(
    record: DemoRunRecord,
    totals: Map<string, DemoRunTotals>,
  ): Promise<void> {
    let game = createPentixGame({
      id: this.createId(),
      selectPieceId: this.selectPieceId,
    })

    for (const engine of record.engines) {
      const session = createDemoSession({
        id: this.createId(),
        userId: DEMO_RUN_USER_ID,
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
      }

      const engineTotals = totals.get(engine.id)
      if (engineTotals !== undefined) {
        engineTotals.points += playback.session.statistics.score
        engineTotals.lines += playback.session.statistics.clearedLines
        engineTotals.pieces += playback.session.statistics.blocks
        engineTotals.planTimeMs += playback.planTimeMs
      }
    }
  }
}


