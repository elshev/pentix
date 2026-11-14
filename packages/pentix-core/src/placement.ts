/** Placement/collision helpers shared by the session engine and the demo planner. */
import type { BoardSnapshot } from './board.js'
import { getPieceDefinition } from './catalog.js'
import { Piece } from './piece.js'
import type { BoardPosition, PentixGameSession } from './session.js'

export type PlacementError =
  | 'none'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'buried'

export function getActivePiece(session: PentixGameSession): Piece {
  return new Piece(
    getPieceDefinition(session.activePiece.key),
    session.activePiece.angle,
  )
}

export function getOccupiedCells(
  piece: Piece,
  origin: BoardPosition,
): BoardPosition[] {
  return piece.occupiedOffsets.map((offset) => ({
    row: origin.row + offset.y,
    column: origin.column + offset.x,
  }))
}

export function checkPlacement(
  board: BoardSnapshot,
  cells: readonly BoardPosition[],
): PlacementError {
  for (const cell of cells) {
    if (cell.column < 0) {
      return 'left'
    }
    if (cell.column >= board.width) {
      return 'right'
    }
    if (cell.row < 0) {
      return 'top'
    }
    if (cell.row >= board.height) {
      return 'bottom'
    }
    if (board.rows[cell.row][cell.column].isOccupied) {
      return 'buried'
    }
  }

  return 'none'
}

export function canPlace(
  board: BoardSnapshot,
  cells: readonly BoardPosition[],
): boolean {
  return checkPlacement(board, cells) === 'none'
}
