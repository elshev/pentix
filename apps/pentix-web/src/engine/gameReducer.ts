/** Game state reducer — phase, settings, and the local Pentix session. */
import {
  createPentixGame,
  createPentixGameSession,
  gameSessionEngine,
  type MoveDirection,
  type PentixGame,
  type PentixGameSession,
  type PieceIdSelector,
  type RotateDirection,
} from '#pentix/core'

export type GamePhase = 'demo' | 'playing' | 'paused' | 'game-over'

export const MIN_LEVEL = 0
export const MAX_LEVEL = 9

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

export interface GameState {
  readonly phase: GamePhase
  readonly settings: GameSettings
  readonly gravityEpoch: number
  readonly game: PentixGame
  readonly session: PentixGameSession
}

export type GameAction =
  | { type: 'start' }
  | { type: 'demo' }
  | { type: 'restart' }
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
  | { type: 'demoAction'; action: GameAction; sessionId: string; pieceIndex: number }

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

function startSession(
  state: GameState,
  deps: GameDependencies,
  phase: 'demo' | 'playing',
): GameState {
  const { game, session } = createSessionBundle(deps, state.settings.startingLevel)
  return {
    ...state,
    phase,
    gravityEpoch: state.gravityEpoch + 1,
    game,
    session,
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
  const phase: GamePhase =
    result.session.status === 'game-over' ? 'game-over' : state.phase
  return { ...state, phase, game: result.game, session: result.session }
}

export function createInitialState(
  deps: GameDependencies,
  phase: GamePhase = 'demo',
  settings: GameSettings = DEFAULT_SETTINGS,
): GameState {
  const { game, session } = createSessionBundle(deps, settings.startingLevel)
  return { phase, settings, gravityEpoch: 0, game, session }
}

export function createGameReducer(deps: GameDependencies) {
  return function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
      case 'start':
      case 'restart':
        return startGame(state, deps)

      case 'demo':
        return startDemo(state, deps)

      case 'demoAction': {
        // Ignore a steering action planned from a stale snapshot. If the demo
        // session or active piece changed since the hook planned it (for
        // example the gravity tick settled the piece and spawned the next one
        // first), applying it would steer the wrong piece.
        if (
          state.phase !== 'demo' ||
          state.session.id !== action.sessionId ||
          state.session.nextPieceIndex !== action.pieceIndex
        ) {
          return state
        }
        return gameReducer(state, action.action)
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

      case 'move':
        if (!isActivePhase(state.phase)) {
          return state
        }
        return {
          ...state,
          session: gameSessionEngine.move(state.session, action.direction),
        }

      case 'rotate':
        if (!isActivePhase(state.phase)) {
          return state
        }
        return {
          ...state,
          session: gameSessionEngine.rotate(
            state.session,
            state.settings.rotateDirection,
          ),
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
        return {
          ...applyAdvance(state, deps, result),
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