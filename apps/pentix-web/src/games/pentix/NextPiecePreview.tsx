import { getPieceDefinition, type PieceKey } from '#pentix/core'

import { getPieceColor } from '../../engine/colors.ts'

export function NextPiecePreview({ pieceKey }: { pieceKey: PieceKey }) {
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
          className={filled ? 'mini-cell mini-cell--filled' : 'mini-cell'}
          style={filled ? { backgroundColor: color } : undefined}
        />,
      )
    }
  }

  return (
    <div
      className="mini-board"
      aria-label={`Next piece: ${pieceKey}`}
      style={{
        gridTemplateColumns: `repeat(${width}, var(--mini-cell-size))`,
        gridTemplateRows: `repeat(${height}, var(--mini-cell-size))`,
      }}
    >
      {cells}
    </div>
  )
}