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

export type GamePhase = 'ready' | 'playing' | 'paused' | 'game-over'

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
  startingLevel: 1,
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
  | { type: 'tick' }
  | { type: 'drop' }

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

function withResult(state: GameState, result: SessionBundle): GameState {
  const phase: GamePhase =
    result.session.status === 'game-over' ? 'game-over' : state.phase
  return { ...state, phase, game: result.game, session: result.session }
}

function startGame(state: GameState, deps: GameDependencies): GameState {
  const { game, session } = createSessionBundle(deps, state.settings.startingLevel)
  return {
    ...state,
    phase: 'playing',
    gravityEpoch: state.gravityEpoch + 1,
    game,
    session,
  }
}

export function createInitialState(
  deps: GameDependencies,
  phase: GamePhase = 'ready',
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
        if (state.phase !== 'playing') {
          return state
        }
        return {
          ...state,
          session: gameSessionEngine.move(state.session, action.direction),
        }

      case 'rotate':
        if (state.phase !== 'playing') {
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
        return {
          ...state,
          settings: {
            ...state.settings,
            startingLevel: clampLevel(state.settings.startingLevel + 1),
          },
        }

      case 'tick':
        if (state.phase !== 'playing') {
          return state
        }
        return withResult(
          state,
          gameSessionEngine.tick(state.session, state.game, deps.selectPieceId),
        )

      case 'drop':
        if (state.phase !== 'playing') {
          return state
        }
        return {
          ...withResult(state, gameSessionEngine.drop(state.session, state.game)),
          // Restart the gravity clock so the dropped piece gets a full tick
          // before it locks, giving the player time to adjust it.
          gravityEpoch: state.gravityEpoch + 1,
        }

      default:
        return state
    }
  }
}