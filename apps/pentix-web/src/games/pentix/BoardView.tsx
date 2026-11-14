import type { PentixGameSession } from '#pentix/core'

import { getPieceColor } from '../../engine/colors.ts'
import { buildRenderGrid } from '../../engine/projection.ts'

export function BoardView({ session }: { session: PentixGameSession }) {
  const grid = buildRenderGrid(session)

  return (
    <div
      className="board"
      role="grid"
      aria-label="Pentix board"
      style={{
        gridTemplateColumns: `repeat(${session.board.width}, var(--cell-size))`,
        gridTemplateRows: `repeat(${session.board.height}, var(--cell-size))`,
      }}
    >
      {grid.map((row, rowIndex) =>
        row.map((cell, columnIndex) => (
          <div
            key={`${rowIndex}-${columnIndex}`}
            className={cellClass(cell.pieceKey !== undefined, cell.isActive)}
            style={
              cell.pieceKey !== undefined
                ? { backgroundColor: getPieceColor(cell.pieceKey) }
                : undefined
            }
          />
        )),
      )}
    </div>
  )
}

function cellClass(filled: boolean, active: boolean): string {
  if (!filled) {
    return 'cell'
  }
  return active ? 'cell cell--active' : 'cell cell--filled'
}