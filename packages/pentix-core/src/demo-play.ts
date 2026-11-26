/**
 * Headless demo playback — the browser attract demo's rules without a clock.
 *
 * The browser drives its demo from one timer at half a gravity interval and
 * alternates a steering step with a gravity step. Headless there is nothing to
 * wait for, so this module keeps the order of those steps and drops the timer:
 * `createDemoPlayback` returns a state whose `slot` names the operation that
 * comes next, `advanceDemoPlayback` applies exactly that one operation, and
 * `playDemoSession` repeats it until the session ends.
 *
 * A demo session starts the way the attract demo starts it: one settled mino on
 * the row before last, and the demo's opening level. Every movement, rotation,
 * hard drop, tick, lock, line clear, score, level, and game-over detection goes
 * through the shared `GameSessionEngine`.
 */
import {
  DEMO_ACTION_CODES,
  createDemoEngineInput,
  isDemoAction,
} from './demo-actions.js'
import type { DemoActionLog } from './demo-actions.js'
import type { DemoEngine } from './demo-engine.js'
import type { PieceKey } from './catalog.js'
import type { PentixGame, PieceIdSelector } from './game.js'
import { gameSessionEngine } from './session-engine.js'
import {
  createPentixGameSession,
  type PentixGameSession,
} from './session.js'

/** The piece key of the mino every demo session starts with. */
export const DEMO_SEED_PIECE_KEY: PieceKey = '1Line'

/** The level a demo session opens at — the browser client's default start. */
export const DEFAULT_DEMO_STARTING_LEVEL = 9

/** The demo seed sits on the row before last, so the demo plans around it. */
function demoSeedRow(height: number): number {
  return height - 2
}

function checkSeedColumn(seedColumn: number, width: number): number {
  if (
    !Number.isInteger(seedColumn) ||
    seedColumn < 0 ||
    seedColumn >= width
  ) {
    throw new RangeError(
      `Demo seed column ${seedColumn} must be an integer from 0 to ${width - 1}.`,
    )
  }

  return seedColumn
}

/**
 * Adds the demo's starting mino: one settled cell in `seedColumn` (or a random
 * column) of the row before last. It is an ordinary settled cell that carries a
 * piece key, so it survives line-clear rebuilds, stays until its row is cleared,
 * and adds no score, cleared line, or locked piece. A board without rows or
 * columns is returned unchanged.
 */
export function withSeededDemoMino(
  session: PentixGameSession,
  seedColumn?: number,
): PentixGameSession {
  const { width, height } = session.board
  const seedRow = demoSeedRow(height)
  if (seedRow < 0 || width === 0) {
    return session
  }

  const column =
    seedColumn === undefined
      ? Math.floor(Math.random() * width)
      : checkSeedColumn(seedColumn, width)

  return Object.freeze({
    ...session,
    board: Object.freeze({
      width,
      height,
      rows: Object.freeze(
        session.board.rows.map((cells, row) =>
          row === seedRow
            ? Object.freeze(
                cells.map((cell) =>
                  cell.column === column
                    ? Object.freeze({
                        row: cell.row,
                        column: cell.column,
                        isOccupied: true,
                        pieceKey: DEMO_SEED_PIECE_KEY,
                      })
                    : cell,
                ),
              )
            : cells,
        ),
      ),
    }),
  })
}

/** What a demo session is created from. */
export interface DemoSessionOptions {
  readonly id: string
  readonly userId: string
  readonly game: PentixGame
  /** The level the session opens at. The browser demo starts at `9`. */
  readonly level: number
  /** Fixes the seed column instead of choosing one at random. */
  readonly seedColumn?: number
}

/**
 * Creates a demo session: a fresh `PentixGameSession` at `level`, seeded with
 * the demo's one settled mino. Nothing about the session is persisted.
 */
export function createDemoSession(
  options: DemoSessionOptions,
): PentixGameSession {
  if (!Number.isInteger(options.level) || options.level < 0) {
    throw new RangeError('Demo session level must be a non-negative integer.')
  }

  const session = createPentixGameSession({
    id: options.id,
    userId: options.userId,
    game: options.game,
  })
  const leveled = Object.freeze({
    ...session,
    statistics: Object.freeze({
      ...session.statistics,
      level: options.level,
    }),
  })

  return withSeededDemoMino(leveled, options.seedColumn)
}

/** The operation a playback applies next: one action or one gravity tick. */
export type DemoPlaybackSlot = 'action' | 'tick'

/** Everything a playback needs to play one session. */
export interface DemoPlaybackOptions {
  readonly engine: DemoEngine
  readonly game: PentixGame
  readonly session: PentixGameSession
  /** Piece selector used when a spawn extends the game's sequence. */
  readonly selectPieceId?: PieceIdSelector
  /** Millisecond clock used to time `plan` calls. Defaults to `performance.now()`. */
  readonly clock?: () => number
}

/**
 * One session's demo playback. `slot` names the operation that comes next, and
 * the cached log belongs to `plannedPieceIndex`. A spawned piece replaces it.
 */
export interface DemoPlayback {
  readonly engine: DemoEngine
  readonly game: PentixGame
  readonly session: PentixGameSession
  readonly slot: DemoPlaybackSlot
  /** The cached log of the piece at `plannedPieceIndex`. */
  readonly actions: DemoActionLog
  readonly actionIndex: number
  /** The `nextPieceIndex` the cached log was planned for. `-1` until planned. */
  readonly plannedPieceIndex: number
  readonly plans: number
  readonly planTimeMs: number
  readonly done: boolean
  readonly selectPieceId?: PieceIdSelector
  readonly clock: () => number
}

/** The finished state of one demo session. */
export interface DemoPlayResult {
  readonly game: PentixGame
  readonly session: PentixGameSession
  readonly plans: number
  readonly planTimeMs: number
}

function defaultClock(): number {
  return typeof performance === 'object' &&
    typeof performance.now === 'function'
    ? performance.now()
    : Date.now()
}

/**
 * Keeps the longer piece list: every session operation returns the game it used
 * or extended, and a playback must keep drawing from one list.
 */
function mergeGame(shared: PentixGame, next: PentixGame): PentixGame {
  return next.pieceIds.length > shared.pieceIds.length ? next : shared
}

/**
 * Starts a playback. The opening operation is a steering step, so the piece that
 * already exists waits one step before it is steered, exactly like the browser
 * demo, whose timer starts on the action slot.
 */
export function createDemoPlayback(
  options: DemoPlaybackOptions,
): DemoPlayback {
  return Object.freeze({
    engine: options.engine,
    game: options.game,
    session: options.session,
    slot: 'action',
    actions: '',
    actionIndex: 0,
    plannedPieceIndex: -1,
    plans: 0,
    planTimeMs: 0,
    done: options.session.status !== 'active',
    selectPieceId: options.selectPieceId,
    clock: options.clock ?? defaultClock,
  })
}

/**
 * Plans the current piece when the cached log belongs to another piece. Only the
 * engine's `plan` call is timed. Building the planning input happens outside the
 * measured window.
 */
function planIfNeeded(playback: DemoPlayback): DemoPlayback {
  if (playback.plannedPieceIndex === playback.session.nextPieceIndex) {
    return playback
  }

  const input = createDemoEngineInput(playback.session)
  const startedAt = playback.clock()
  const actions = playback.engine.plan(
    input.board,
    input.piece,
    input.position,
  )
  const finishedAt = playback.clock()

  return Object.freeze({
    ...playback,
    actions,
    actionIndex: 0,
    plannedPieceIndex: playback.session.nextPieceIndex,
    plans: playback.plans + 1,
    planTimeMs: playback.planTimeMs + (finishedAt - startedAt),
  })
}

/** Applies one code through the shared engine and returns the settled state. */
function applyDemoAction(
  playback: DemoPlayback,
  code: string,
): {
  readonly game: PentixGame
  readonly session: PentixGameSession
} {
  const { game, session } = playback

  switch (code) {
    case DEMO_ACTION_CODES.left:
      return { game, session: gameSessionEngine.move(session, 'left') }
    case DEMO_ACTION_CODES.right:
      return { game, session: gameSessionEngine.move(session, 'right') }
    case DEMO_ACTION_CODES.clockwise:
      return { game, session: gameSessionEngine.rotate(session, 'clockwise') }
    case DEMO_ACTION_CODES.anticlockwise:
      return {
        game,
        session: gameSessionEngine.rotate(session, 'counterclockwise'),
      }
    case DEMO_ACTION_CODES.hardDrop: {
      const result = gameSessionEngine.drop(
        session,
        game,
        playback.selectPieceId,
      )
      return { game: result.game, session: result.session }
    }
    default:
      return { game, session }
  }
}

/**
 * Applies exactly the operation named by `slot` and returns the next state.
 * A tick moves the piece down or locks it. An action replays one log code. After
 * a hard drop the next operation is an action again, so the log's post-drop
 * side-step lands before the locking tick. An exhausted log applies no action and
 * the paired tick still runs. A session that is no longer active is left as it is
 * with `done` set.
 */
export function advanceDemoPlayback(playback: DemoPlayback): DemoPlayback {
  if (playback.session.status !== 'active') {
    return playback.done ? playback : Object.freeze({ ...playback, done: true })
  }

  if (playback.slot === 'tick') {
    const result = gameSessionEngine.tick(
      playback.session,
      playback.game,
      playback.selectPieceId,
    )
    return Object.freeze({
      ...playback,
      game: mergeGame(playback.game, result.game),
      session: result.session,
      slot: 'action',
      done: result.session.status !== 'active',
    })
  }

  const planned = planIfNeeded(playback)
  const code = planned.actions[planned.actionIndex]
  if (code === undefined || !isDemoAction(code)) {
    return Object.freeze({
      ...planned,
      actionIndex:
        code === undefined ? planned.actionIndex : planned.actionIndex + 1,
      slot: 'tick',
    })
  }

  const applied = applyDemoAction(planned, code)
  return Object.freeze({
    ...planned,
    game: mergeGame(planned.game, applied.game),
    session: applied.session,
    actionIndex: planned.actionIndex + 1,
    slot: code === DEMO_ACTION_CODES.hardDrop ? 'action' : 'tick',
    done: applied.session.status !== 'active',
  })
}

/** Plays a demo session to game over and reports its planning time. */
export function playDemoSession(
  options: DemoPlaybackOptions,
): DemoPlayResult {
  let playback = createDemoPlayback(options)

  while (!playback.done) {
    playback = advanceDemoPlayback(playback)
  }

  return {
    game: playback.game,
    session: playback.session,
    plans: playback.plans,
    planTimeMs: playback.planTimeMs,
  }
}


