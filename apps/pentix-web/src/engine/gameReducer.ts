/** Game state reducer — phase, settings, the main session, and the demo boards. */
import {
  canDemoPieceMoveDown,
  createPentixGame,
  createPentixGameSession,
  gameSessionEngine,
  getDemoEngine,
  type AdvancePentixGameSessionResult,
  type DemoEngineId,
  type MoveDirection,
  type PentixGame,
  type PentixGameSession,
  type PieceIdSelector,
  type RotateDirection,
  type RotationAngle,
} from '#pentix/core'

export type GamePhase = 'demo' | 'demo-over' | 'playing' | 'paused' | 'game-over'

/** The board id the player controls. */
export const MAIN_BOARD_ID = 'main'

/**
 * The engine driving the main board's attract demo. The main board is the
 * showcase board, so it runs the `random` engine from the registry by id.
 */
export const MAIN_DEMO_ENGINE_ID: DemoEngineId = 'random'

/**
 * The name shown on the main board while a player game runs. Temporary
 * placeholder until real user selection is wired into the browser client.
 */
export const PLAYER_NAME = 'Player01'

/**
 * The initial engine of each demo board, in rail order: slot one runs the
 * classic `delphi5` heuristic and slot two the `random` one. This is only the
 * assignment a fresh board set starts with — an engine travels with its session
 * when the player swaps a board with the main board. Adding a board to the rail
 * is one entry here.
 */
export const DEMO_BOARD_ENGINES = ['delphi5', 'random'] as const


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
 * One small demo board: the engine that plans it and the session it plays. All
 * demo boards of a state share the main board's `PentixGame`.
 */
export interface DemoBoardState {
  readonly id: string
  readonly engineId: DemoEngineId
  readonly session: PentixGameSession
}

/** The steering steps an auto-played session takes toward its destination. */
export type DemoStepAction =
  | { type: 'move'; direction: MoveDirection }
  | { type: 'rotate' }
  | { type: 'drop' }

export interface GameState {
  readonly phase: GamePhase
  /** False only while a fresh player game over ignores start/restart/demo input. */
  readonly gameOverReady: boolean
  readonly settings: GameSettings
  readonly gravityEpoch: number
  /** The piece list every board of this state draws from. */
  readonly game: PentixGame
  /** The engine planning the main board's attract demo; travels with a swap. */
  readonly mainEngineId: DemoEngineId
  /** The main board's session. */
  readonly session: PentixGameSession
  /** The parallel demo boards shown beside the main board. */
  readonly demoBoards: readonly DemoBoardState[]
}

export type GameAction =
  | { type: 'start' }
  | { type: 'demo' }
  | { type: 'restart' }
  | { type: 'demoRestart' }
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
  | { type: 'swapBoard'; boardId: string }
  | {
      type: 'demoStep'
      action: DemoStepAction
      sessionId: string
      pieceIndex: number
      angle: RotationAngle
      column: number
    }
  | {
      type: 'demoBoardStep'
      boardId: string
      action: DemoStepAction
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
 * Retunes the demo boards to `level` while the main board runs its attract
 * demo, so the whole rail speeds up or slows down together with it.
 */
function applyLevelToDemoBoards(
  boards: readonly DemoBoardState[],
  level: number,
): readonly DemoBoardState[] {
  return boards.map((board) => {
    const session = applyStartingLevel(board.session, level)
    return session === board.session ? board : { ...board, session }
  })
}

/**
 * Applies a chosen level to the configured starting level and to the live
 * session. The demo takes the new level at once so its gravity speed changes
 * without waiting for the next session; a running player game may only be
 * raised, because lowering it would rewind the engine's own progression.
 */
function changeLevel(state: GameState, level: number): GameState {
  const startingLevel = clampLevel(level)
  const playerGame = state.phase === 'playing' || state.phase === 'paused'
  if (playerGame && startingLevel <= state.session.statistics.level) {
    return state
  }
  const settings = { ...state.settings, startingLevel }
  if (state.phase === 'demo') {
    return {
      ...state,
      settings,
      session: applyStartingLevel(state.session, startingLevel),
      demoBoards: applyLevelToDemoBoards(state.demoBoards, startingLevel),
    }
  }
  if (state.phase === 'demo-over') {
    // The finished demo keeps the level it played at, but the demo boards are
    // still playing, so the whole rail follows the chosen level at once.
    return {
      ...state,
      settings,
      demoBoards: applyLevelToDemoBoards(state.demoBoards, startingLevel),
    }
  }
  if (playerGame) {
    return {
      ...state,
      settings,
      session: applyStartingLevel(state.session, startingLevel),
    }
  }
  return { ...state, settings }
}

/** The level the player sees: the session's while a game runs, else the configured one. */
function currentLevel(state: GameState): number {
  return state.phase === 'playing' || state.phase === 'paused'
    ? state.session.statistics.level
    : state.settings.startingLevel
}

/** One game plus every session that plays it: the main board and the demo boards. */
interface BoardSet {
  readonly game: PentixGame
  readonly mainEngineId: DemoEngineId
  readonly session: PentixGameSession
  readonly demoBoards: readonly DemoBoardState[]
}

/**
 * The stable id of a demo board: its rail slot, not its engine, so a slot keeps
 * its id when a swap gives it another engine.
 */
function demoBoardId(index: number): string {
  return `demo-slot-${index + 1}`
}

function createSessionForGame(
  game: PentixGame,
  deps: GameDependencies,
  startingLevel: number,
): PentixGameSession {
  return applyStartingLevel(
    createPentixGameSession({
      id: deps.createId(),
      userId: deps.userId ?? DEFAULT_USER_ID,
      game,
    }),
    startingLevel,
  )
}

/**
 * Creates one `PentixGame` and the whole board set that plays it, so the main
 * session and every demo board draw from the same piece list.
 */
function createBoardSet(deps: GameDependencies, startingLevel: number): BoardSet {
  const game = createPentixGame({
    id: deps.createId(),
    selectPieceId: deps.selectPieceId,
  })
  const session = createSessionForGame(game, deps, startingLevel)
  const demoBoards = DEMO_BOARD_ENGINES.map((engineId, index) => ({
    id: demoBoardId(index),
    engineId,
    session: createSessionForGame(game, deps, startingLevel),
  }))

  return {
    game,
    mainEngineId: MAIN_DEMO_ENGINE_ID,
    session,
    demoBoards: Object.freeze(demoBoards),
  }
}

/**
 * Keeps the longer piece list: every session operation returns the game it used
 * or extended, and all boards of a state must keep drawing from one list.
 */
function mergeGame(shared: PentixGame, next: PentixGame): PentixGame {
  return next.pieceIds.length > shared.pieceIds.length ? next : shared
}

function isActivePhase(phase: GamePhase): boolean {
  return phase === 'playing' || phase === 'demo'
}

/** True while the game-over screen is still armed against stray input. */
function isGameOverCoolingDown(state: GameState): boolean {
  return state.phase === 'game-over' && !state.gameOverReady
}

/**
 * Starts a new session on the main board and a fresh session on every demo
 * board, all from one new game: the whole board set starts in parallel.
 */
function startSession(
  state: GameState,
  deps: GameDependencies,
  phase: 'demo' | 'playing',
): GameState {
  const { game, mainEngineId, session, demoBoards } = createBoardSet(
    deps,
    state.settings.startingLevel,
  )
  return {
    ...state,
    phase,
    gameOverReady: true,
    gravityEpoch: state.gravityEpoch + 1,
    game,
    mainEngineId,
    session,
    demoBoards,
  }
}

function startGame(state: GameState, deps: GameDependencies): GameState {
  return startSession(state, deps, 'playing')
}

function startDemo(state: GameState, deps: GameDependencies): GameState {
  return startSession(state, deps, 'demo')
}

/**
 * Starts the next attract demo while leaving the demo boards alone. Their
 * sessions keep playing, so the piece list they share must stay the same game.
 * The main board also keeps the engine it currently plays, so a swapped-in demo
 * engine survives its own automatic restart.
 */
function restartDemoSession(
  state: GameState,
  deps: GameDependencies,
): GameState {
  return {
    ...state,
    phase: 'demo',
    gameOverReady: true,
    gravityEpoch: state.gravityEpoch + 1,
    session: createSessionForGame(state.game, deps, state.settings.startingLevel),
  }
}

function applyAdvance(
  state: GameState,
  result: AdvancePentixGameSessionResult,
): GameState {
  const game = mergeGame(state.game, result.game)
  // A demo session that ends keeps its final board for the same delay a player
  // game over uses; `demoRestart` starts the next demo once that delay elapses.
  if (result.session.status === 'game-over' && state.phase === 'demo') {
    return { ...state, phase: 'demo-over', game, session: result.session }
  }
  const gameOver = result.session.status === 'game-over'
  return {
    ...state,
    phase: gameOver ? 'game-over' : state.phase,
    // Arm the cooldown the moment the final board appears, so input left over
    // from active play cannot clear it.
    gameOverReady: gameOver ? false : state.gameOverReady,
    game,
    session: result.session,
  }
}

/** The placement an auto-play step was planned for. */
interface DemoStepPlacement {
  readonly sessionId: string
  readonly pieceIndex: number
  readonly angle: RotationAngle
  readonly column: number
}

/**
 * True while a planned step still belongs to the session's current piece and
 * placement. The row is not compared: a step is applied after its own gravity
 * descent.
 */
function isCurrentPlacement(
  session: PentixGameSession,
  step: DemoStepPlacement,
): boolean {
  return (
    session.id === step.sessionId &&
    session.nextPieceIndex === step.pieceIndex &&
    session.activePiece.angle === step.angle &&
    session.activePiece.origin.column === step.column
  )
}

/**
 * Applies one steering step to a session through the shared engine.
 */
function applyDemoAction(
  session: PentixGameSession,
  game: PentixGame,
  action: DemoStepAction,
  rotateDirection: RotateDirection,
  selectPieceId?: PieceIdSelector,
): AdvancePentixGameSessionResult {
  switch (action.type) {
    case 'move':
      return {
        game,
        session: gameSessionEngine.move(session, action.direction),
      }
    case 'rotate':
      return {
        game,
        session: gameSessionEngine.rotate(session, rotateDirection),
      }
    case 'drop':
      return gameSessionEngine.drop(session, game, selectPieceId)
  }
}

/**
 * Applies one auto-play step to a session: the gravity descent when the piece
 * can still fall, then the steering action, both through the shared engine.
 *
 * A resting piece whose steering step is blocked can never reach the planned
 * placement: it would wait for a column or angle that is out of reach and the
 * board would freeze. Such a step locks the piece instead, so the demo always
 * makes progress.
 */
function runDemoStep(
  session: PentixGameSession,
  game: PentixGame,
  action: DemoStepAction,
  rotateDirection: RotateDirection,
  selectPieceId?: PieceIdSelector,
): AdvancePentixGameSessionResult {
  const canDescend = canDemoPieceMoveDown(session)
  const descended = canDescend
    ? gameSessionEngine.tick(session, game, selectPieceId)
    : { game, session }

  // A descent can end the game; there is nothing left to steer on that tick.
  if (descended.session.status !== 'active') {
    return descended
  }

  const steered = applyDemoAction(
    descended.session,
    descended.game,
    action,
    rotateDirection,
    selectPieceId,
  )

  // The engine returns the same session for a blocked move or rotation, so an
  // unchanged session on a resting piece means the destination is unreachable.
  if (!canDescend && steered.session === descended.session) {
    return gameSessionEngine.tick(descended.session, descended.game, selectPieceId)
  }

  return steered
}

/**
 * The name shown on the main board: the display name of the engine that owns
 * the attract demo, otherwise the placeholder player name.
 */
export function mainBoardName(state: GameState): string {
  if (state.phase === 'demo' || state.phase === 'demo-over') {
    return getDemoEngine(state.mainEngineId).name
  }
  return PLAYER_NAME
}

export function createInitialState(
  deps: GameDependencies,
  phase: GamePhase = 'demo',
  settings: GameSettings = DEFAULT_SETTINGS,
): GameState {
  const { game, mainEngineId, session, demoBoards } = createBoardSet(
    deps,
    settings.startingLevel,
  )
  return {
    phase,
    gameOverReady: true,
    settings,
    gravityEpoch: 0,
    game,
    mainEngineId,
    session,
    demoBoards,
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

      case 'demoRestart':
        // Only the finished demo waits on this action; it starts the next demo
        // once the post-demo delay has elapsed. The demo boards keep playing, so
        // they are deliberately left untouched.
        return state.phase === 'demo-over' ? restartDemoSession(state, deps) : state

      case 'demoStep': {
        // Ignore a step planned from a stale snapshot (see `isCurrentPlacement`),
        // so the demo cannot steer the wrong piece or placement.
        if (state.phase !== 'demo' || !isCurrentPlacement(state.session, action)) {
          return state
        }

        // Mirror Delphi's `TimerExpired`: a piece that can still fall takes the
        // gravity step before its steering step. A resting piece takes only the
        // steering step, so a last-tick move lands before anything can lock it.
        return applyAdvance(
          state,
          runDemoStep(
            state.session,
            state.game,
            action.action,
            state.settings.rotateDirection,
            deps.selectPieceId,
          ),
        )
      }

      case 'demoBoardStep': {
        const board = state.demoBoards.find(
          (entry) => entry.id === action.boardId,
        )
        // A finished demo board keeps its final board and ignores further steps;
        // a stale step leaves the whole board set unchanged.
        if (
          board === undefined ||
          board.session.status !== 'active' ||
          !isCurrentPlacement(board.session, action)
        ) {
          return state
        }

        const result = runDemoStep(
          board.session,
          state.game,
          action.action,
          DEFAULT_SETTINGS.rotateDirection,
          deps.selectPieceId,
        )
        return {
          ...state,
          // Only the addressed board and the shared piece list change.
          game: mergeGame(state.game, result.game),
          demoBoards: state.demoBoards.map((entry) =>
            entry.id === board.id ? { ...entry, session: result.session } : entry,
          ),
        }
      }

      case 'swapBoard': {
        // Only the attract demo can trade places with the rail: a player's own
        // session must stay on the main board.
        if (state.phase !== 'demo' && state.phase !== 'demo-over') {
          return state
        }
        const board = state.demoBoards.find(
          (entry) => entry.id === action.boardId,
        )
        if (board === undefined) {
          return state
        }

        return {
          ...state,
          // The arriving session decides whether the demo can keep playing or
          // must wait out the post-game-over delay.
          phase: board.session.status === 'active' ? 'demo' : 'demo-over',
          mainEngineId: board.engineId,
          session: board.session,
          demoBoards: state.demoBoards.map((entry) =>
            entry.id === board.id
              ? {
                  ...entry,
                  engineId: state.mainEngineId,
                  session: state.session,
                }
              : entry,
          ),
        }
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

      case 'setStartingLevel': {
        // The engine owns the level during a player game, but the player may
        // still raise it (see `changeLevel`).
        if (state.phase === 'playing' || state.phase === 'paused') {
          return changeLevel(state, action.level)
        }
        // Leaving game over through the selector obeys the same cooldown as the
        // overlay buttons and the hotkeys.
        if (isGameOverCoolingDown(state)) {
          return state
        }
        const withLevel = changeLevel(state, action.level)
        // Picking a level on the game-over screen starts that game right away.
        if (state.phase === 'game-over') {
          return startGame(withLevel, deps)
        }
        return withLevel
      }

      case 'increaseLevel':
        return changeLevel(state, currentLevel(state) + 1)

      case 'decreaseLevel':
        return changeLevel(state, currentLevel(state) - 1)

      case 'tick': {
        if (!isActivePhase(state.phase)) {
          return state
        }
        return applyAdvance(
          state,
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
        const advanced = applyAdvance(state, result)
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