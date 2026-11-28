/**
 * Compact wire forms for the stored game in a high-score detail.
 *
 * A detail response repeats a board and a piece sequence that the client only
 * replays. The full snapshots stay in the session and game routes, so this
 * module packs them for the read-heavy detail.
 */
import type { BoardSnapshot } from '../../../packages/pentix-core/dist/index.js'

/**
 * Encodes a board as one row-major line. `1` is an occupied cell and `0` is a
 * free cell, so the line length is `width * height`.
 */
export function encodeBoardLine(board: BoardSnapshot): string {
  let line = ''
  for (const row of board.rows) {
    for (const cell of row) {
      line += cell.isOccupied ? '1' : '0'
    }
  }

  return line
}

/**
 * Encodes a piece sequence as one byte per piece id, then base64. Every id
 * must fit one byte, which holds because the piece catalog stays below `255`.
 */
export function encodePieceIds(pieceIds: readonly number[]): string {
  return Buffer.from(pieceIds).toString('base64')
}
