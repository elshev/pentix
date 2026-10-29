export {
  Board,
  createBoard,
  createBoardSnapshot,
  DEFAULT_BOARD_SIZE,
} from './board.js'
export type { BoardCell, BoardSize, BoardSnapshot } from './board.js'
export {
  createPentixGame,
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
