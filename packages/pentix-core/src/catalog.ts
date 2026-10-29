import type { Offset, PieceDefinition, RotationMode } from './piece.js'

export type PieceKey =
  | '1Line'
  | '2Line'
  | '3Line'
  | '3Corner'
  | '4Line'
  | '4Square'
  | '4T'
  | '4L'
  | '4LMir'
  | '4S'
  | '4SMir'
  | '5Line'
  | '5Corner'
  | '5Cross'
  | '5T'
  | '5W'
  | '5U'
  | '5L'
  | '5LMir'
  | '5S'
  | '5SMir'
  | '5F'
  | '5FMir'
  | '5P'
  | '5PMir'
  | '5Z'
  | '5ZMir'
  | '5R'
  | '5RMir'

function createOffset(x: number, y: number): Offset {
  return Object.freeze({ x, y })
}

function createOffsets(...offsets: readonly [number, number][]): readonly Offset[] {
  return Object.freeze(offsets.map(([x, y]) => createOffset(x, y)))
}

function definePiece(
  id: number,
  key: PieceKey,
  colorName: string,
  rotationMode: RotationMode,
  offsets: readonly Offset[],
): PieceDefinition {
  return Object.freeze({
    id,
    key,
    colorName,
    rotationMode,
    offsets,
  })
}

// The 5Corner definition intentionally preserves the legacy Delphi geometry,
// even though the rotation origin at (0, 0) is empty for that one piece.
export const PIECE_CATALOG = Object.freeze([
  definePiece(0, '1Line', 'blue', 'none', createOffsets([0, 0])),
  definePiece(1, '2Line', 'red', 'half', createOffsets([0, 0], [0, 1])),
  definePiece(2, '3Line', 'red', 'half', createOffsets([0, 0], [-1, 0], [1, 0])),
  definePiece(3, '3Corner', 'silver', 'full', createOffsets([0, 0], [0, -1], [1, 0])),
  definePiece(4, '4Line', 'red', 'half', createOffsets([0, 0], [-2, 0], [-1, 0], [1, 0])),
  definePiece(5, '4Square', 'blue', 'none', createOffsets([0, 0], [0, 1], [1, 1], [1, 0])),
  definePiece(6, '4T', 'yellow', 'full', createOffsets([0, 0], [-1, 0], [1, 0], [0, -1])),
  definePiece(7, '4L', 'fuchsia', 'full', createOffsets([0, 0], [-1, 0], [1, 0], [1, -1])),
  definePiece(8, '4LMir', 'silver', 'full', createOffsets([0, 0], [-1, -1], [-1, 0], [1, 0])),
  definePiece(9, '4S', 'lime', 'half', createOffsets([0, 0], [-1, 0], [0, -1], [1, -1])),
  definePiece(10, '4SMir', 'aqua', 'half', createOffsets([0, 0], [-1, -1], [0, -1], [1, 0])),
  definePiece(11, '5Line', 'red', 'half', createOffsets([0, 0], [-2, 0], [-1, 0], [1, 0], [2, 0])),
  definePiece(12, '5Corner', 'silver', 'full', createOffsets([-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1])),
  definePiece(13, '5Cross', 'silver', 'none', createOffsets([0, 0], [0, -1], [-1, 0], [0, 1], [1, 0])),
  definePiece(14, '5T', 'yellow', 'full', createOffsets([0, 0], [1, -1], [0, -1], [-1, -1], [0, 1])),
  definePiece(15, '5W', 'yellow', 'full', createOffsets([0, 0], [-1, 1], [0, 1], [1, 0], [1, -1])),
  definePiece(16, '5U', 'fuchsia', 'full', createOffsets([0, 0], [-1, -1], [-1, 0], [1, 0], [1, -1])),
  definePiece(17, '5L', 'fuchsia', 'full', createOffsets([0, 0], [-2, 0], [-1, 0], [1, 0], [1, -1])),
  definePiece(18, '5LMir', 'yellow', 'full', createOffsets([0, 0], [-1, -1], [-1, 0], [1, 0], [2, 0])),
  definePiece(19, '5S', 'aqua', 'full', createOffsets([0, 0], [0, -1], [-2, 0], [-1, 0], [1, -1])),
  definePiece(20, '5SMir', 'lime', 'full', createOffsets([0, 0], [0, -1], [-1, -1], [1, 0], [2, 0])),
  definePiece(21, '5F', 'lime', 'full', createOffsets([0, 0], [0, -1], [-1, 1], [0, 1], [1, 0])),
  definePiece(22, '5FMir', 'aqua', 'full', createOffsets([0, 0], [0, -1], [-1, 0], [0, 1], [1, 1])),
  definePiece(23, '5P', 'blue', 'full', createOffsets([0, 0], [1, 0], [1, -1], [0, -1], [0, 1])),
  definePiece(24, '5PMir', 'blue', 'full', createOffsets([0, 0], [0, -1], [-1, -1], [-1, 0], [0, 1])),
  definePiece(25, '5Z', 'lime', 'half', createOffsets([0, 0], [0, -1], [-1, -1], [0, 1], [1, 1])),
  definePiece(26, '5ZMir', 'fuchsia', 'half', createOffsets([0, 0], [1, -1], [0, -1], [-1, 1], [0, 1])),
  definePiece(27, '5R', 'silver', 'full', createOffsets([0, 0], [2, 0], [1, 0], [0, -1], [-1, 0])),
  definePiece(28, '5RMir', 'yellow', 'full', createOffsets([0, 0], [1, 0], [0, -1], [-2, 0], [-1, 0])),
] satisfies readonly PieceDefinition[])

export const PIECES_BY_KEY = Object.freeze(
  Object.fromEntries(
    PIECE_CATALOG.map((piece) => [piece.key, piece]),
  ) as Record<PieceKey, PieceDefinition>,
)

export const PIECES_BY_ID = Object.freeze(
  Object.fromEntries(
    PIECE_CATALOG.map((piece) => [piece.id, piece]),
  ) as Record<number, PieceDefinition>,
)

export function getPieceDefinition(key: PieceKey): PieceDefinition {
  return PIECES_BY_KEY[key]
}

export function getPieceDefinitionById(id: number): PieceDefinition {
  const piece = PIECES_BY_ID[id]
  if (piece === undefined) {
    throw new Error(`Unknown Pentix piece id: ${id}.`)
  }

  return piece
}
