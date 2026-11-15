/** A tiny (5px-per-mino) drawing of a catalog piece, used in the piece counters. */
import { getPieceDefinition, type PieceKey } from '#pentix/core'

import { getPieceColor } from '../../engine/colors.ts'

export function PieceMini({ pieceKey }: { pieceKey: PieceKey }) {
  const definition = getPieceDefinition(pieceKey)
  const xs = definition.offsets.map((offset) => offset.x)
  const ys = definition.offsets.map((offset) => offset.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const width = Math.max(...xs) - minX + 1
  const height = Math.max(...ys) - minY + 1
  const occupied = new Set(
    definition.offsets.map((offset) => `${offset.y - minY}-${offset.x - minX}`),
  )
  const color = getPieceColor(pieceKey)

  const cells = []
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const filled = occupied.has(`${row}-${column}`)
      cells.push(
        <div
          key={`${row}-${column}`}
          className={
            filled
              ? 'piece-mini__cell piece-mini__cell--filled'
              : 'piece-mini__cell'
          }
          style={filled ? { backgroundColor: color } : undefined}
        />,
      )
    }
  }

  return (
    <div
      className="piece-mini"
      aria-hidden="true"
      style={{
        gridTemplateColumns: `repeat(${width}, var(--piece-mini-cell))`,
        gridTemplateRows: `repeat(${height}, var(--piece-mini-cell))`,
      }}
    >
      {cells}
    </div>
  )
}