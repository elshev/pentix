export { Board, createBoard, DEFAULT_BOARD_SIZE } from './board.js'
export type { BoardCell, BoardSize } from './board.js'
export {
  getPieceDefinition,
  PIECE_CATALOG,
  PIECES_BY_KEY,
} from './catalog.js'
export type { LegacyPieceKey } from './catalog.js'
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
