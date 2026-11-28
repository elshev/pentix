/**
 * DeepSeek v4 Pro Max (2 min of thinking). It enumerates every reachable
 * orientation and target column, lands the piece in each candidate, and
 * simulates the lock and the cleared rows. It ranks placements on cleared
 * rows, drop score, board height, holes, and bumpiness. It returns the fewest
 * rotations and sideways moves that reach the best placement, then one hard
 * drop.
 *
 * Authored from docs/demo-engine-task.md and wrapped by the shared adapter.
 * The planning body is kept as authored.
 */
import { adaptAuthoredPlan } from '../demo-engine-toolkit.js'

export const id = 'deepseek-v4-pro-max'
export const name = 'DeepSeek v4 Pro Max'
export const description =
  'DeepSeek v4 Pro Max (2 min of thinking): enumerates every reachable orientation and target column, lands the piece in each candidate, and simulates the lock and the cleared rows. It ranks each placement on cleared rows, drop score, board height, holes, and bumpiness, then returns the fewest rotations and sideways moves that reach the best placement followed by one hard drop.'

// Enumerates each reachable orientation and target column. It lands the piece
// in each one and simulates the lock and the cleared rows. It scores a
// placement on its cleared rows, drop score, board height, holes, and
// bumpiness, then outputs the fewest rotations and sideways moves that reach
// the best placement followed by one hard drop.
function authoredPlan(
  board: number[][],
  piece: { row: number; column: number }[][],
  position: { row: number; column: number },
): string {
  const height: number = board.length
  const width: number = height > 0 ? board[0].length : 0
  if (height === 0 || width === 0 || piece.length === 0) {
    return ''
  }
  const orientations = piece
  const minos: number = orientations[0].length

  function fits(
    cells: { row: number; column: number }[],
    row: number,
    column: number,
  ): boolean {
    for (const cell of cells) {
      const r = row + cell.row
      const c = column + cell.column
      if (c < 0 || c >= width || r >= height) {
        return false
      }
      if (r >= 0 && board[r][c] === 1) {
        return false
      }
    }
    return true
  }

  function landingRow(
    cells: { row: number; column: number }[],
    column: number,
  ): number | null {
    let minOffset = 0
    for (const cell of cells) {
      if (cell.row < minOffset) {
        minOffset = cell.row
      }
    }
    let row = -minOffset
    if (!fits(cells, row, column)) {
      return null
    }
    while (fits(cells, row + 1, column)) {
      row += 1
    }
    return row
  }

  function columnHeight(b: number[][], column: number): number {
    for (let r = 0; r < height; r += 1) {
      if (b[r][column] === 1) {
        return height - r
      }
    }
    return 0
  }

  function settle(
    cells: { row: number; column: number }[],
    row: number,
    column: number,
  ): { board: number[][]; cleared: number[] } {
    const b = board.map((r) => r.slice())
    for (const cell of cells) {
      const r = row + cell.row
      const c = column + cell.column
      if (r >= 0 && c >= 0 && c < width) {
        b[r][c] = 1
      }
    }
    const cleared: number[] = []
    for (let r = 0; r < height; r += 1) {
      let full = true
      for (let c = 0; c < width; c += 1) {
        if (b[r][c] !== 1) {
          full = false
          break
        }
      }
      if (full) {
        cleared.push(r)
      }
    }
    if (cleared.length > 0) {
      const result: number[][] = []
      for (let r = 0; r < cleared.length; r += 1) {
        result.push(new Array<number>(width).fill(0))
      }
      for (let r = 0; r < height; r += 1) {
        if (cleared.indexOf(r) === -1) {
          result.push(b[r].slice())
        }
      }
      return { board: result, cleared }
    }
    return { board: b, cleared }
  }

  function evaluate(b: number[][], cleared: number[], dropRow: number): number {
    let score = 0
    for (let i = 0; i < cleared.length; i += 1) {
      const r = cleared[i]
      score += 20 * (i + 1) * (10 + (height - r))
    }
    let empty = true
    for (let r = 0; r < height && empty; r += 1) {
      for (let c = 0; c < width; c += 1) {
        if (b[r][c] === 1) {
          empty = false
          break
        }
      }
    }
    if (empty) {
      score += 1000
    }
    score += (minos * (height - dropRow)) / 10
    const heights = new Array<number>(width).fill(0)
    for (let c = 0; c < width; c += 1) {
      heights[c] = columnHeight(b, c)
    }
    let aggregate = 0
    let holes = 0
    for (let c = 0; c < width; c += 1) {
      aggregate += heights[c]
      let sawBlock = false
      for (let r = 0; r < height; r += 1) {
        if (b[r][c] === 1) {
          sawBlock = true
        } else if (sawBlock) {
          holes += 1
        }
      }
    }
    let bumpiness = 0
    for (let c = 0; c < width - 1; c += 1) {
      bumpiness += Math.abs(heights[c] - heights[c + 1])
    }
    score -= aggregate * 2
    score -= holes * 50
    score -= bumpiness
    return score
  }

  let bestScore = Number.NEGATIVE_INFINITY
  let bestPlan = ''

  for (let k = 0; k < orientations.length; k += 1) {
    const cells = orientations[k]
    const rotationCount = Math.min(k, orientations.length - k)
    for (let column = 0; column < width; column += 1) {
      const row = landingRow(cells, column)
      if (row === null) {
        continue
      }
      const lateralCount = Math.abs(column - position.column)
      const dropRow = position.row + rotationCount + lateralCount
      if (dropRow > row) {
        continue
      }
      const settled = settle(cells, row, column)
      const score = evaluate(settled.board, settled.cleared, dropRow)
      if (score > bestScore) {
        bestScore = score
        const rotateChars =
          k <= orientations.length - k
            ? 'C'.repeat(k)
            : 'A'.repeat(orientations.length - k)
        const delta = column - position.column
        const slide = delta < 0 ? 'L'.repeat(-delta) : 'R'.repeat(delta)
        bestPlan = rotateChars + slide + 'H'
      }
    }
  }

  return bestPlan
}

export const plan = adaptAuthoredPlan(authoredPlan)
