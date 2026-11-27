/**
 * The demo seed: the one settled mino that every demo session opens with.
 *
 * This module holds the seed rules alone, so a replay can seed a session without
 * loading the demo driver. The demo playback and the session log both use it.
 */
import type { PieceKey } from './catalog.js'
import type { PentixGameSession } from './session.js'

/** The piece key of the mino every demo session starts with. */
export const DEMO_SEED_PIECE_KEY: PieceKey = '1Line'

/** The demo seed sits on the row before last, so the demo plans around it. */
export function demoSeedRow(height: number): number {
  return height - 2
}

function checkSeedColumn(seedColumn: number, width: number): number {
  if (
    !Number.isInteger(seedColumn) ||
    seedColumn < 0 ||
    seedColumn >= width
  ) {
    throw new RangeError(
      `Demo seed column ${seedColumn} must be an integer from 0 to ${width - 1}.`,
    )
  }

  return seedColumn
}

/**
 * Adds the demo's starting mino: one settled cell in `seedColumn` (or a random
 * column) of the row before last. It is an ordinary settled cell that carries a
 * piece key, so it survives line-clear rebuilds, stays until its row is cleared,
 * and adds no score, cleared line, or locked piece. A board without rows or
 * columns is returned unchanged.
 */
export function withSeededDemoMino(
  session: PentixGameSession,
  seedColumn?: number,
): PentixGameSession {
  const { width, height } = session.board
  const seedRow = demoSeedRow(height)
  if (seedRow < 0 || width === 0) {
    return session
  }

  const column =
    seedColumn === undefined
      ? Math.floor(Math.random() * width)
      : checkSeedColumn(seedColumn, width)

  return Object.freeze({
    ...session,
    board: Object.freeze({
      width,
      height,
      rows: Object.freeze(
        session.board.rows.map((cells, row) =>
          row === seedRow
            ? Object.freeze(
                cells.map((cell) =>
                  cell.column === column
                    ? Object.freeze({
                        row: cell.row,
                        column: cell.column,
                        isOccupied: true,
                        pieceKey: DEMO_SEED_PIECE_KEY,
                      })
                    : cell,
                ),
              )
            : cells,
        ),
      ),
    }),
  })
}

/** The column of the demo seed mino on a fresh demo session, if any. */
export function demoSeedColumnOf(
  session: PentixGameSession,
): number | undefined {
  const occupied = session.board.rows.flat().filter((cell) => cell.isOccupied)
  if (
    occupied.length !== 1 ||
    occupied[0].row !== demoSeedRow(session.board.height)
  ) {
    return undefined
  }

  return occupied[0].column
}
