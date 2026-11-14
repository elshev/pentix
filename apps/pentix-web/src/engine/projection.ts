import {
  getPieceDefinition,
  Piece,
  type BoardPosition,
  type PentixGameSession,
  type PieceKey,
} from '#pentix/core'

export interface RenderCell {
  readonly pieceKey?: PieceKey
  readonly isActive: boolean
}

export function getActivePiece(session: PentixGameSession): Piece {
  return new Piece(
    getPieceDefinition(session.activePiece.key),
    session.activePiece.angle,
  )
}

export function getActiveCells(session: PentixGameSession): BoardPosition[] {
  const piece = getActivePiece(session)
  const { origin } = session.activePiece

  return piece.occupiedOffsets.map((offset) => ({
    row: origin.row + offset.y,
    column: origin.column + offset.x,
  }))
}

export function buildRenderGrid(session: PentixGameSession): RenderCell[][] {
  const { board } = session
  const grid: RenderCell[][] = board.rows.map((row) =>
    row.map((cell) => ({
      pieceKey: cell.isOccupied ? cell.pieceKey : undefined,
      isActive: false,
    })),
  )

  for (const { row, column } of getActiveCells(session)) {
    if (row >= 0 && row < board.height && column >= 0 && column < board.width) {
      grid[row][column] = { pieceKey: session.activePiece.key, isActive: true }
    }
  }

  return grid
}