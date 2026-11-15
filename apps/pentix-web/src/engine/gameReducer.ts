/** Game state reducer — phase, settings, and the local Pentix session. */
import {
  canDemoPieceMoveDown,
  createPentixGame,
  createPentixGameSession,
  gameSessionEngine,
  type BoardCell,
  type MoveDirection,
  type PentixGame,
  type PentixGameSession,
  type PieceIdSelector,
  type RotateDirection,
  type RotationAngle,
} from '#pentix/core'

export type GamePhase = 'demo' | 'playing' | 'paused' | 'game-over'

export const MIN_LEVEL = 0
export const MAX_LEVEL = 9

/**
 * Delay before the game-over overlay accepts input. Key presses still coming
 * from active play would otherwise start a new game or the demo in the same
 * moment the final board appears.
 */
export const GAME_OVER_COOLDOWN_MS = 700

export interface GameSettings {
  readonly rotateDirection: RotateDirection
  readonly showNextPiece: boolean
  readonly startingLevel: number
}

export const DEFAULT_SETTINGS: GameSettings = Object.freeze({
  rotateDirection: 'counterclockwise',
  showNextPiece: false,
  startingLevel: 9,
})

/**
 * TEMPORARY debug aid: seed every demo session with one settled mino on the row
 * above the floor, at a random column, so the last-tick side-step can be watched
 * in the browser. Set this to `false` (or delete it together with
 * `seedDemoBoard`) to remove the seeding.
 */
const DEMO_SEED_SETTLED_MINO = true

/** Places the temporary demo seed mino; a no-op when the flag is off. */
function seedDemoBoard(session: PentixGameSession): PentixGameSession {
  if (!DEMO_SEED_SETTLED_MINO) {
    return session
  }

  const { width, height, rows } = session.board
  const seedRow = height - 2
  const seedColumn = Math.floor(Math.random() * width)
  const seedCell: BoardCell = {
    row: seedRow,
    column: seedColumn,
    isOccupied: true,
    pieceKey: '4Square',
  }
  const seededRows = rows.map((cells, row) =>
    row === seedRow
      ? cells.map((cell, column) => (column === seedColumn ? seedCell : cell))
      : cells,
  )

  return Object.freeze({
    ...session,
    board: Object.freeze({ width, height, rows: seededRows }),
  })
}

export interface GameState {
  readonly phase: GamePhase
  /** False only while a fresh player game over ignores start/restart/demo input. */
  readonly gameOverReady: boolean
  readonly settings: GameSettings
  readonly gravityEpoch: number
  readonly game: PentixGame
  readonly session: PentixGameSession
}

export type GameAction =
  | { type: 'start' }
  | { type: 'demo' }
  | { type: 'restart' }
  | { type: 'gameOverCooldownElapsed' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'togglePause' }
  | { type: 'move'; direction: MoveDirection }
  | { type: 'rotate' }
  | { type: 'toggleRotateDirection' }
  | { type: 'toggleNextPiece' }
  | { type: 'setStartingLevel'; level: number }
  | { type: 'increaseLevel' }
  | { type: 'decreaseLevel' }
  | { type: 'tick' }
  | { type: 'drop' }
  | {
      type: 'demoStep'
      action: GameAction
      sessionId: string
      pieceIndex: number
      angle: RotationAngle
      column: number
    }

export interface GameDependencies {
  readonly createId: () => string
  readonly userId?: string
  readonly selectPieceId?: PieceIdSelector
}

const DEFAULT_USER_ID = 'local-player'

function clampLevel(level: number): number {
  const integer = Number.isFinite(level) ? Math.trunc(level) : MIN_LEVEL
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, integer))
}

function applyStartingLevel(
  session: PentixGameSession,
  level: number,
): PentixGameSession {
  if (session.statistics.level === level) {
    return session
  }
  return Object.freeze({
    ...session,
    statistics: Object.freeze({ ...session.statistics, level }),
  })
}

/**
 * Steps the configured starting level and, while the demo is running, applies
 * the same level to the live demo session so its gravity speed changes at once
 * instead of waiting for the next session.
 */
function changeLevel(state: GameState, level: number): GameState {
  const startingLevel = clampLevel(level)
  const settings = { ...state.settings, startingLevel }
  if (state.phase === 'demo') {
    return {
      ...state,
      settings,
      session: applyStartingLevel(state.session, startingLevel),
    }
  }
  return { ...state, settings }
}

interface SessionBundle {
  readonly game: PentixGame
  readonly session: PentixGameSession
}

function createSessionBundle(
  deps: GameDependencies,
  startingLevel: number,
): SessionBundle {
  const game = createPentixGame({
    id: deps.createId(),
    selectPieceId: deps.selectPieceId,
  })
  const baseSession = createPentixGameSession({
    id: deps.createId(),
    userId: deps.userId ?? DEFAULT_USER_ID,
    game,
  })
  return { game, session: applyStartingLevel(baseSession, startingLevel) }
}

function isActivePhase(phase: GamePhase): boolean {
  return phase === 'playing' || phase === 'demo'
}

/** True while the game-over screen is still armed against stray input. */
function isGameOverCoolingDown(state: GameState): boolean {
  return state.phase === 'game-over' && !state.gameOverReady
}

function startSession(
  state: GameState,
  deps: GameDependencies,
  phase: 'demo' | 'playing',
): GameState {
  const { game, session } = createSessionBundle(deps, state.settings.startingLevel)
  return {
    ...state,
    phase,
    gameOverReady: true,
    gravityEpoch: state.gravityEpoch + 1,
    game,
    session: phase === 'demo' ? seedDemoBoard(session) : session,
  }
}

function startGame(state: GameState, deps: GameDependencies): GameState {
  return startSession(state, deps, 'playing')
}

function startDemo(state: GameState, deps: GameDependencies): GameState {
  return startSession(state, deps, 'demo')
}

function applyAdvance(
  state: GameState,
  deps: GameDependencies,
  result: SessionBundle,
): GameState {
  // A demo session that ends starts the next demo instead of surfacing a
  // player-facing game-over state, mirroring the Delphi attract loop.
  if (result.session.status === 'game-over' && state.phase === 'demo') {
    return startDemo(state, deps)
  }
  const gameOver = result.session.status === 'game-over'
  return {
    ...state,
    phase: gameOver ? 'game-over' : state.phase,
    // Arm the cooldown the moment the final board appears, so input left over
    // from active play cannot clear it.
    gameOverReady: gameOver ? false : state.gameOverReady,
    game: result.game,
    session: result.session,
  }
}

export function createInitialState(
  deps: GameDependencies,
  phase: GamePhase = 'demo',
  settings: GameSettings = DEFAULT_SETTINGS,
): GameState {
  const { game, session } = createSessionBundle(deps, settings.startingLevel)
  return {
    phase,
    gameOverReady: true,
    settings,
    gravityEpoch: 0,
    game,
    session: phase === 'demo' ? seedDemoBoard(session) : session,
  }
}

export function createGameReducer(deps: GameDependencies) {
  return function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
      case 'start':
      case 'restart':
        if (isGameOverCoolingDown(state)) {
          return state
        }
        return startGame(state, deps)

      case 'demo':
        if (isGameOverCoolingDown(state)) {
          return state
        }
        return startDemo(state, deps)

      case 'gameOverCooldownElapsed':
        if (state.phase !== 'game-over' || state.gameOverReady) {
          return state
        }
        return { ...state, gameOverReady: true }

      case 'demoStep': {
        // Ignore a step planned from a stale snapshot. If the demo session, the
        // active piece, or its angle/column changed since the hook planned the
        // step (for example the piece was already steered), applying it would
        // steer the wrong piece or the wrong placement. The row is not compared:
        // the step is applied after this call's own gravity step.
        if (
          state.phase !== 'demo' ||
          state.session.id !== action.sessionId ||
          state.session.nextPieceIndex !== action.pieceIndex ||
          state.session.activePiece.angle !== action.angle ||
          state.session.activePiece.origin.column !== action.column
        ) {
          return state
        }

        // Mirror Delphi's `TimerExpired`: a piece that can still fall takes the
        // gravity step before its steering step. A resting piece takes only the
        // steering step, so a last-tick move lands before anything can lock it.
        const advanced = canDemoPieceMoveDown(state.session)
          ? applyAdvance(
              state,
              deps,
              gameSessionEngine.tick(
                state.session,
                state.game,
                deps.selectPieceId,
              ),
            )
          : state

        return gameReducer(advanced, action.action)
      }

      case 'pause':
        return state.phase === 'playing' ? { ...state, phase: 'paused' } : state

      case 'resume':
        return state.phase === 'paused' ? { ...state, phase: 'playing' } : state

      case 'togglePause':
        if (state.phase === 'playing') {
          return { ...state, phase: 'paused' }
        }
        if (state.phase === 'paused') {
          return { ...state, phase: 'playing' }
        }
        return state

      case 'move': {
        if (!isActivePhase(state.phase)) {
          return state
        }
        const session = gameSessionEngine.move(state.session, action.direction)
        return { ...state, session }
      }

      case 'rotate': {
        if (!isActivePhase(state.phase)) {
          return state
        }
        const session = gameSessionEngine.rotate(
          state.session,
          state.settings.rotateDirection,
        )
        return { ...state, session }
      }

      case 'toggleRotateDirection':
        return {
          ...state,
          settings: {
            ...state.settings,
            rotateDirection:
              state.settings.rotateDirection === 'clockwise'
                ? 'counterclockwise'
                : 'clockwise',
          },
        }

      case 'toggleNextPiece':
        return {
          ...state,
          settings: {
            ...state.settings,
            showNextPiece: !state.settings.showNextPiece,
          },
        }

      case 'setStartingLevel':
        return {
          ...state,
          settings: {
            ...state.settings,
            startingLevel: clampLevel(action.level),
          },
        }

      case 'increaseLevel':
        return changeLevel(state, state.settings.startingLevel + 1)

      case 'decreaseLevel':
        return changeLevel(state, state.settings.startingLevel - 1)

      case 'tick': {
        if (!isActivePhase(state.phase)) {
          return state
        }
        return applyAdvance(
          state,
          deps,
          gameSessionEngine.tick(state.session, state.game, deps.selectPieceId),
        )
      }

      case 'drop': {
        if (!isActivePhase(state.phase)) {
          return state
        }
        const result = gameSessionEngine.drop(
          state.session,
          state.game,
          deps.selectPieceId,
        )
        if (result.session.status === 'game-over' && state.phase === 'demo') {
          return startDemo(state, deps)
        }
        const advanced = applyAdvance(state, deps, result)
        return {
          ...advanced,
          // Restart the gravity clock so the dropped piece gets a full tick
          // before it locks, giving the player time to adjust it.
          gravityEpoch: state.gravityEpoch + 1,
        }
      }

      default:
        return state
    }
  }
}