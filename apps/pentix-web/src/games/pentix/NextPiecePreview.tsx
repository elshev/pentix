/** Mini-board rendering the upcoming piece in a fixed-size frame. */
import { getPieceDefinition, type PieceKey } from '#pentix/core'

import { getPieceColor } from '../../engine/colors.ts'

// Every catalog piece fits inside this bounding box, so the preview keeps a
// constant size and never grows or shrinks the HUD as the next piece changes.
const PREVIEW_WIDTH = 5
const PREVIEW_HEIGHT = 3

export function NextPiecePreview({ pieceKey }: { pieceKey: PieceKey }) {
  const definition = getPieceDefinition(pieceKey)
  const xs = definition.offsets.map((offset) => offset.x)
  const ys = definition.offsets.map((offset) => offset.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const width = Math.max(...xs) - minX + 1
  const height = Math.max(...ys) - minY + 1
  // Center the piece inside the fixed frame so its size never changes.
  const offsetX = Math.floor((PREVIEW_WIDTH - width) / 2)
  const offsetY = Math.floor((PREVIEW_HEIGHT - height) / 2)
  const occupied = new Set(
    definition.offsets.map(
      (offset) =>
        `${offset.y - minY + offsetY}-${offset.x - minX + offsetX}`,
    ),
  )
  const color = getPieceColor(pieceKey)

  const cells = []
  for (let row = 0; row < PREVIEW_HEIGHT; row += 1) {
    for (let column = 0; column < PREVIEW_WIDTH; column += 1) {
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
        gridTemplateColumns: `repeat(${PREVIEW_WIDTH}, var(--mini-cell-size))`,
        gridTemplateRows: `repeat(${PREVIEW_HEIGHT}, var(--mini-cell-size))`,
      }}
    >
      {cells}
    </div>
  )
}