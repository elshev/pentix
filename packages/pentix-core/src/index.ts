/** Public API barrel for pentix-core, consumed by the server and the web client. */
export {
  Board,
  createBoard,
  createBoardSnapshot,
  DEFAULT_BOARD_SIZE,
} from './board.js'
export type { BoardCell, BoardSize, BoardSnapshot } from './board.js'
export {
  createPentixGame,
  createTetrisGame,
  ensurePentixGamePieceAtIndex,
} from './game.js'
export type {
  CreatePentixGameOptions,
  PentixGame,
  PieceIdSelector,
} from './game.js'
export {
  advancePentixGameSession,
  createPentixGameSession,
} from './session.js'
export type {
  ActivePieceState,
  AdvancePentixGameSessionResult,
  BoardPosition,
  CreatePentixGameSessionOptions,
  GameSessionStatistics,
  GameSessionStatus,
  PentixGameSession,
} from './session.js'
export {
  replayPentixGameSession,
  SESSION_ACTION_CODES,
  SESSION_ACTIONS,
} from './session-log.js'
export type {
  PieceActionLog,
  SessionAction,
  SessionActionLog,
} from './session-log.js'
export {
  getPieceDefinition,
  getPieceDefinitionById,
  PIECE_CATALOG,
  PIECES_BY_ID,
  PIECES_BY_KEY,
} from './catalog.js'
export type { PieceKey } from './catalog.js'
export {
  getOccupiedOffsets,
  normalizeAngle,
  Piece,
  rotateOffset,
} from './piece.js'
export type {
  Offset,
  PieceDefinition,
  RotationAngle,
  RotationMode,
} from './piece.js'
export { planDemoDestination } from './demo.js'
export type { DemoDestination } from './demo.js'
export {
  GameSessionEngine,
  gameSessionEngine,
} from './session-engine.js'
export type { MoveDirection, RotateDirection } from './session-engine.js'
export { createUser } from './user.js'
export type { CreateUserOptions, User } from './user.js'
