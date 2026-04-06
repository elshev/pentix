import type { Offset, PieceDefinition, RotationMode } from './piece.js'

export type LegacyPieceKey =
  | 'bi1Line'
  | 'bi2Line'
  | 'bi3Line'
  | 'bi3Corner'
  | 'bi4Line'
  | 'bi4Square'
  | 'bi4T'
  | 'bi4L'
  | 'bi4LMir'
  | 'bi4S'
  | 'bi4SMir'
  | 'bi5Line'
  | 'bi5Corner'
  | 'bi5Cross'
  | 'bi5T'
  | 'bi5W'
  | 'bi5U'
  | 'bi5L'
  | 'bi5LMir'
  | 'bi5S'
  | 'bi5SMir'
  | 'bi5F'
  | 'bi5FMir'
  | 'bi5P'
  | 'bi5PMir'
  | 'bi5Z'
  | 'bi5ZMir'
  | 'bi5R'
  | 'bi5RMir'

function createOffset(x: number, y: number): Offset {
  return Object.freeze({ x, y })
}

function createOffsets(...offsets: readonly [number, number][]): readonly Offset[] {
  return Object.freeze(offsets.map(([x, y]) => createOffset(x, y)))
}

function definePiece(
  id: number,
  key: LegacyPieceKey,
  name: string,
  colorName: string,
  rotationMode: RotationMode,
  offsets: readonly Offset[],
): PieceDefinition {
  return Object.freeze({
    id,
    key,
    name,
    colorName,
    rotationMode,
    offsets,
  })
}

// The 5Corner definition intentionally preserves the legacy Delphi geometry,
// even though the rotation origin at (0, 0) is empty for that one piece.
export const PIECE_CATALOG = Object.freeze([
  definePiece(0, 'bi1Line', '1Line', 'blue', 'none', createOffsets([0, 0])),
  definePiece(1, 'bi2Line', '2Line', 'red', 'half', createOffsets([0, 0], [0, 1])),
  definePiece(2, 'bi3Line', '3Line', 'red', 'half', createOffsets([0, 0], [-1, 0], [1, 0])),
  definePiece(3, 'bi3Corner', '3Corner', 'silver', 'full', createOffsets([0, 0], [0, -1], [1, 0])),
  definePiece(4, 'bi4Line', '4Line', 'red', 'half', createOffsets([0, 0], [-2, 0], [-1, 0], [1, 0])),
  definePiece(5, 'bi4Square', '4Square', 'blue', 'none', createOffsets([0, 0], [0, 1], [1, 1], [1, 0])),
  definePiece(6, 'bi4T', '4T', 'yellow', 'full', createOffsets([0, 0], [-1, 0], [1, 0], [0, -1])),
  definePiece(7, 'bi4L', '4L', 'fuchsia', 'full', createOffsets([0, 0], [-1, 0], [1, 0], [1, -1])),
  definePiece(8, 'bi4LMir', '4LMir', 'silver', 'full', createOffsets([0, 0], [-1, -1], [-1, 0], [1, 0])),
  definePiece(9, 'bi4S', '4S', 'lime', 'half', createOffsets([0, 0], [-1, 0], [0, -1], [1, -1])),
  definePiece(10, 'bi4SMir', '4SMir', 'aqua', 'half', createOffsets([0, 0], [-1, -1], [0, -1], [1, 0])),
  definePiece(11, 'bi5Line', '5Line', 'red', 'half', createOffsets([0, 0], [-2, 0], [-1, 0], [1, 0], [2, 0])),
  definePiece(12, 'bi5Corner', '5Corner', 'silver', 'full', createOffsets([-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1])),
  definePiece(13, 'bi5Cross', '5Cross', 'silver', 'none', createOffsets([0, 0], [0, -1], [-1, 0], [0, 1], [1, 0])),
  definePiece(14, 'bi5T', '5T', 'yellow', 'full', createOffsets([0, 0], [1, -1], [0, -1], [-1, -1], [0, 1])),
  definePiece(15, 'bi5W', '5W', 'yellow', 'full', createOffsets([0, 0], [-1, 1], [0, 1], [1, 0], [1, -1])),
  definePiece(16, 'bi5U', '5U', 'fuchsia', 'full', createOffsets([0, 0], [-1, -1], [-1, 0], [1, 0], [1, -1])),
  definePiece(17, 'bi5L', '5L', 'fuchsia', 'full', createOffsets([0, 0], [-2, 0], [-1, 0], [1, 0], [1, -1])),
  definePiece(18, 'bi5LMir', '5LMir', 'yellow', 'full', createOffsets([0, 0], [-1, -1], [-1, 0], [1, 0], [2, 0])),
  definePiece(19, 'bi5S', '5S', 'aqua', 'full', createOffsets([0, 0], [0, -1], [-2, 0], [-1, 0], [1, -1])),
  definePiece(20, 'bi5SMir', '5SMir', 'lime', 'full', createOffsets([0, 0], [0, -1], [-1, -1], [1, 0], [2, 0])),
  definePiece(21, 'bi5F', '5F', 'lime', 'full', createOffsets([0, 0], [0, -1], [-1, 1], [0, 1], [1, 0])),
  definePiece(22, 'bi5FMir', '5FMir', 'aqua', 'full', createOffsets([0, 0], [0, -1], [-1, 0], [0, 1], [1, 1])),
  definePiece(23, 'bi5P', '5P', 'blue', 'full', createOffsets([0, 0], [1, 0], [1, -1], [0, -1], [0, 1])),
  definePiece(24, 'bi5PMir', '5PMir', 'blue', 'full', createOffsets([0, 0], [0, -1], [-1, -1], [-1, 0], [0, 1])),
  definePiece(25, 'bi5Z', '5Z', 'lime', 'half', createOffsets([0, 0], [0, -1], [-1, -1], [0, 1], [1, 1])),
  definePiece(26, 'bi5ZMir', '5ZMir', 'fuchsia', 'half', createOffsets([0, 0], [1, -1], [0, -1], [-1, 1], [0, 1])),
  definePiece(27, 'bi5R', '5R', 'silver', 'full', createOffsets([0, 0], [2, 0], [1, 0], [0, -1], [-1, 0])),
  definePiece(28, 'bi5RMir', '5RMir', 'yellow', 'full', createOffsets([0, 0], [1, 0], [0, -1], [-2, 0], [-1, 0])),
] satisfies readonly PieceDefinition[])

export const PIECES_BY_KEY = Object.freeze(
  Object.fromEntries(
    PIECE_CATALOG.map((piece) => [piece.key, piece]),
  ) as Record<LegacyPieceKey, PieceDefinition>,
)

export function getPieceDefinition(key: LegacyPieceKey): PieceDefinition {
  return PIECES_BY_KEY[key]
}
