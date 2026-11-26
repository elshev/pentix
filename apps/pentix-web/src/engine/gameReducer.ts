/** Game state reducer — phase, settings, the main session, and the demo boards. */
import {
  createPentixGame,
  createPentixGameSession,
  demoEngineRegistry,
  gameSessionEngine,
  getDemoEngine,
  withSeededDemoMino,
  type AdvancePentixGameSessionResult,
  type DemoAction,
  type DemoEngineId,
  type MoveDirection,
  type PentixGame,
  type PentixGameSession,
  type PieceIdSelector,
  type RotateDirection,
} from '#pentix/core'

export type GamePhase = 'demo' | 'demo-over' | 'playing' | 'paused' | 'game-over'

/** The board id the player controls. */
export const MAIN_BOARD_ID = 'main'

/**
 * The engine the main board's attract demo starts with: the classic Delphi 5
 * heuristic, so a fresh page opens on it. A swap replaces it, and the state then
 * keeps the arriving engine across player sessions and demo restarts, so the
 * player's choice survives.
 */
export const MAIN_DEMO_ENGINE_ID: DemoEngineId = 'delphi5'

/**
 * The name shown on the main board while a player game runs. Temporary
 * placeholder until real user selection is wired into the browser client.
 */
export const PLAYER_NAME = 'Player01'

/**
 * The rail's capacity: four slots per row and three rows, as measured by the
 * demo-board layout. Engines registered beyond it stay resolvable through the
 * registry but do not get a board until the rail is re-measured.
 */
export const MAX_DEMO_BOARDS = 12

/** The engine ids a fresh board set assigns to the rail, in registration order. */
function demoBoardEngineIds(): readonly DemoEngineId[] {
  return demoEngineRegistry
    .list()
    .slice(0, MAX_DEMO_BOARDS)
    .map((engine) => engine.id)
}


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
  | { type: 'rotate'; direction: RotateDirection }
  | { type: 'drop' }

export interface GameState {
  readonly phase: GamePhase
  /** False only while a fresh player game over ignores start/restart/demo input. */
  readonly gameOverReady: boolean
  readonly settings: GameSettings
  readonly gravityEpoch: number
  /** The piece list every board of this state draws from. */
  readonly game: PentixGame
  /** The engine planning the main board's attract demo. It travels with a swap. */
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
      type: 'demoTick'
      /** The board the gravity step belongs to: `MAIN_BOARD_ID` or a rail slot id. */
      boardId: string
    }
  | {
      type: 'demoAction'
      /** The board the steering step belongs to: `MAIN_BOARD_ID` or a rail slot id. */
      boardId: string
      /** The next code of the engine's log, or `null` when the log is exhausted. */
      action: DemoAction | null
      sessionId: string
      pieceIndex: number
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
 * without waiting for the next session. A running player game may only be
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
 * The single cell a demo board starts with comes from the shared demo playback:
 * one settled mino on the row before last, seeded when the session starts.
 */
export { withSeededDemoMino } from '#pentix/core'

/** True when the phase runs a demo (not a player) session on the main board. */
function isDemoPhase(phase: GamePhase): boolean {
  return phase === 'demo' || phase === 'demo-over'
}

/**
 * Creates one `PentixGame` and the whole board set that plays it, so the main
 * session and every demo board draw from the same piece list. The main session
 * gets the demo's seeded mino only when it is a demo session. Every demo board
 * always does.
 */
function createBoardSet(
  deps: GameDependencies,
  startingLevel: number,
  mainEngineId: DemoEngineId,
  seedMainSession: boolean,
): BoardSet {
  const game = createPentixGame({
    id: deps.createId(),
    selectPieceId: deps.selectPieceId,
  })
  const session = createSessionForGame(game, deps, startingLevel)
  const demoBoards = demoBoardEngineIds().map((engineId, index) => ({
    id: demoBoardId(index),
    engineId,
    session: withSeededDemoMino(createSessionForGame(game, deps, startingLevel)),
  }))

  return {
    game,
    mainEngineId,
    session: seedMainSession ? withSeededDemoMino(session) : session,
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
 * board, all from one new game: the whole board set starts in parallel. The main
 * board keeps the demo engine it currently plays, so a swapped-in engine survives
 * the player's next game, and only a demo session gets the seeded mino.
 */
function startSession(
  state: GameState,
  deps: GameDependencies,
  phase: 'demo' | 'playing',
): GameState {
  const { game, mainEngineId, session, demoBoards } = createBoardSet(
    deps,
    state.settings.startingLevel,
    state.mainEngineId,
    phase === 'demo',
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
 * True while the attract demo holds its finished board because the rest of the
 * board set is still playing. The whole cycle restarts once every board's
 * session has ended, so the panels cycle together instead of drifting apart.
 */
export function isDemoCycleOver(state: GameState): boolean {
  return (
    state.phase === 'demo-over' &&
    state.demoBoards.every((board) => board.session.status === 'game-over')
  )
}

function applyAdvance(
  state: GameState,
  result: AdvancePentixGameSessionResult,
): GameState {
  const game = mergeGame(state.game, result.game)
  // A demo session that ends keeps its final board for the same delay a player
  // game over uses. `demoRestart` starts the next demo once that delay elapses.
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

/** The session and piece an auto-play step was planned for. */
interface DemoStepOrigin {
  readonly sessionId: string
  readonly pieceIndex: number
}

/**
 * True while a planned step still belongs to the session's current piece. The
 * placement is deliberately not compared: every replayed action changes it.
 */
function isCurrentDemoStep(
  session: PentixGameSession,
  step: DemoStepOrigin,
): boolean {
  return (
    session.id === step.sessionId &&
    session.nextPieceIndex === step.pieceIndex
  )
}

/** The demo board a step addresses, when its session can still advance. */
function activeDemoBoard(
  state: GameState,
  boardId: string,
): DemoBoardState | undefined {
  const board = state.demoBoards.find((entry) => entry.id === boardId)
  return board !== undefined && board.session.status === 'active'
    ? board
    : undefined
}

/**
 * Commits a step that belongs to one demo board: the shared piece list is merged
 * and only that slot's session is replaced. The phase and every other board stay
 * as they are, so a finished rail board keeps its final board.
 */
function applyDemoBoardAdvance(
  state: GameState,
  boardId: string,
  result: AdvancePentixGameSessionResult,
): GameState {
  return {
    ...state,
    game: mergeGame(state.game, result.game),
    demoBoards: state.demoBoards.map((entry) =>
      entry.id === boardId ? { ...entry, session: result.session } : entry,
    ),
  }
}

/** Maps a demo action code to the shared engine's steering step. */
function demoCodeToEngineStep(action: DemoAction): DemoStepAction {
  switch (action) {
    case 'L':
      return { type: 'move', direction: 'left' }
    case 'R':
      return { type: 'move', direction: 'right' }
    case 'C':
      return { type: 'rotate', direction: 'clockwise' }
    case 'A':
      return { type: 'rotate', direction: 'counterclockwise' }
    case 'H':
      return { type: 'drop' }
  }
}

/**
 * Applies one steering step to a session through the shared engine.
 */
function applyEngineStep(
  session: PentixGameSession,
  game: PentixGame,
  action: DemoStepAction,
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
        session: gameSessionEngine.rotate(session, action.direction),
      }
    case 'drop':
      return gameSessionEngine.drop(session, game, selectPieceId)
  }
}

/**
 * Applies one auto-play steering step: one action from the engine's log (when
 * there is one), through the shared engine. The step deliberately applies no
 * gravity tick, so the piece is never moved and descended in the same instant.
 * A hard drop's last-tick move is just the log's next code and arrives in the
 * following step, which is what separates the side-step from the drop.
 */
function applyDemoActionStep(
  session: PentixGameSession,
  game: PentixGame,
  action: DemoAction | null,
  selectPieceId?: PieceIdSelector,
): AdvancePentixGameSessionResult {
  return action === null
    ? { game, session }
    : applyEngineStep(
        session,
        game,
        demoCodeToEngineStep(action),
        selectPieceId,
      )
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
    MAIN_DEMO_ENGINE_ID,
    isDemoPhase(phase),
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
        // The finished demo waits until the whole board set has ended, then the
        // next cycle starts from one new game: the rail's dead boards come back
        // instead of staying frozen. A stale timer cannot start an extra cycle.
        return isDemoCycleOver(state) ? startDemo(state, deps) : state

      case 'demoTick': {
        if (action.boardId === MAIN_BOARD_ID) {
          // Gravity is not planned, so only the phase decides whether the main
          // board's demo may take it. A settling tick still ends the demo.
          if (state.phase !== 'demo') {
            return state
          }
          return applyAdvance(
            state,
            gameSessionEngine.tick(
              state.session,
              state.game,
              deps.selectPieceId,
            ),
          )
        }

        const board = activeDemoBoard(state, action.boardId)
        if (board === undefined) {
          return state
        }
        return applyDemoBoardAdvance(
          state,
          board.id,
          gameSessionEngine.tick(board.session, state.game, deps.selectPieceId),
        )
      }

      case 'demoAction': {
        if (action.boardId === MAIN_BOARD_ID) {
          // Ignore a step planned for another session or piece generation, or
          // one that arrives while the attract demo is not running.
          if (
            state.phase !== 'demo' ||
            !isCurrentDemoStep(state.session, action)
          ) {
            return state
          }

          return applyAdvance(
            state,
            applyDemoActionStep(
              state.session,
              state.game,
              action.action,
              deps.selectPieceId,
            ),
          )
        }

        // A finished demo board keeps its final board and ignores further steps.
        // A stale step leaves the whole board set unchanged.
        const board = activeDemoBoard(state, action.boardId)
        if (board === undefined || !isCurrentDemoStep(board.session, action)) {
          return state
        }

        return applyDemoBoardAdvance(
          state,
          board.id,
          applyDemoActionStep(
            board.session,
            state.game,
            action.action,
            deps.selectPieceId,
          ),
        )
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