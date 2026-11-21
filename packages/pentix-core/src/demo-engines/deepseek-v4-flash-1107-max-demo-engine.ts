/**
 * DeepSeek v4 Flash 1107 in Max mode (13 min of thinking): generates every orientation, column, and side-step candidate, replays it faithfully with wall kicks, and judges the resulting board by holes, transitions, wells, and stack height.
 *
 * Authored from docs/demo-engine-task.md and wrapped by the shared adapter;
 * the planning body is kept as authored.
 */
import { adaptAuthoredPlan } from '../demo-engine-toolkit.js'

export const id = 'deepseek-v4-flash-1107-max'
export const name = 'DeepSeek v4 Flash 1107 Max'
export const description =
  'DeepSeek v4 Flash 1107 in Max mode (13 min of thinking): generates every orientation, column, and side-step candidate, replays it faithfully with wall kicks, and judges the resulting board by holes, transitions, wells, and stack height.'

/**
A single pure TypeScript function that simulates every reachable placement and scores it:

1. Candidate generation — for every orientation (choosing the cheaper of C-rotations or A-rotations), every target column, and each side-step option ("", L, R after the hard drop), it builds the action string rotations + lateral + "H" + sideStep.
2. Faithful replay — each candidate is replayed with the real turn/tick rules: action → tick (falls or locks), no tick consumed by the hard drop (so the trailing L/R works), wall-kick fallback on rotation, and remaining characters discarded after an early lock.
3. Real scoring — it reproduces lock points, floor(minos × (height − dropRow) / 10) drop points, clearedIndex × (10 + height − row) per cleared row, and the flat 1000 for emptying the board.
4. Board judgement — the resulting board is rated with hole count/column transitions (strongest), row transitions, well depth, bumpiness, aggregate and landing height, eroded piece cells, plus a quadratic "danger" term when the stack nears the top, and a heavy penalty for locking cells above the board.
 */
function authoredPlan(
  board: number[][],
  piece: { row: number; column: number }[][],
  position: { row: number; column: number },
): string {
  const height = board.length
  const width = height > 0 ? board[0].length : 0
  const orientationCount = piece.length
  if (height <= 0 || width <= 0 || orientationCount <= 0) {
    return ''
  }
  const minos = piece[0].length
  if (minos <= 0) {
    return ''
  }

  const fits = (row: number, column: number, orientation: number): boolean => {
    const cells = piece[orientation]
    for (let i = 0; i < cells.length; i += 1) {
      const cell = cells[i]
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

  // When a rotation does not fit, the game kicks the piece sideways, or up
  // against the top, until it does.  The same offsets are tried here so the
  // simulation follows the engine closely.
  const kickOffsets: number[][] = [
    [0, 0],
    [0, 1],
    [0, -1],
    [0, 2],
    [0, -2],
    [-1, 0],
    [-1, 1],
    [-1, -1],
    [-1, 2],
    [-1, -2],
    [-2, 0],
    [0, 3],
    [0, -3],
  ]

  const simulate = (sequence: string): {
    row: number
    column: number
    orientation: number
    dropRow: number
  } => {
    let row = position.row
    let column = position.column
    let orientation = 0
    let dropRow = -1
    let locked = false
    for (let i = 0; i < sequence.length && !locked; i += 1) {
      const action = sequence.charAt(i)
      if (action === 'L') {
        if (fits(row, column - 1, orientation)) {
          column -= 1
        }
      } else if (action === 'R') {
        if (fits(row, column + 1, orientation)) {
          column += 1
        }
      } else if (action === 'C' || action === 'A') {
        const next = action === 'C'
          ? (orientation + 1) % orientationCount
          : (orientation + orientationCount - 1) % orientationCount
        for (let k = 0; k < kickOffsets.length; k += 1) {
          const dr = kickOffsets[k][0]
          const dc = kickOffsets[k][1]
          if (fits(row + dr, column + dc, next)) {
            row += dr
            column += dc
            orientation = next
            break
          }
        }
      } else if (action === 'H') {
        dropRow = row
        while (fits(row + 1, column, orientation)) {
          row += 1
        }
        // The action after a hard drop is applied before the tick that locks
        // the piece, so the drop itself does not consume a tick.
        continue
      } else {
        continue
      }
      if (fits(row + 1, column, orientation)) {
        row += 1
      } else {
        locked = true
      }
    }
    if (!locked) {
      while (fits(row + 1, column, orientation)) {
        row += 1
      }
    }
    return { row, column, orientation, dropRow }
  }

  const repeat = (symbol: string, count: number): string => {
    let out = ''
    for (let i = 0; i < count; i += 1) {
      out += symbol
    }
    return out
  }

  // Score one candidate plan: replay it, settle the piece, clear rows, add the
  // points the engine would award and judge the board that is left behind.
  const evaluate = (sequence: string): number => {
    const landing = simulate(sequence)
    const cells = piece[landing.orientation]
    const grid: number[][] = []
    for (let r = 0; r < height; r += 1) {
      const line: number[] = []
      for (let c = 0; c < width; c += 1) {
        line.push(board[r][c])
      }
      grid.push(line)
    }
    let overflow = 0
    let pieceTop = height
    const pieceRows: number[] = []
    for (let i = 0; i < cells.length; i += 1) {
      const cell = cells[i]
      const r = landing.row + cell.row
      const c = landing.column + cell.column
      pieceRows.push(r)
      if (r < pieceTop) {
        pieceTop = r
      }
      if (r < 0) {
        overflow += 1
      } else if (r < height && c >= 0 && c < width) {
        grid[r][c] = 1
      }
    }

    let points = minos
    if (landing.dropRow >= 0) {
      points += Math.floor(minos * (height - landing.dropRow) / 10)
    }

    const cleared: number[] = []
    for (let r = 0; r < height; r += 1) {
      let full = true
      for (let c = 0; c < width; c += 1) {
        if (grid[r][c] !== 1) {
          full = false
          break
        }
      }
      if (full) {
        cleared.push(r)
      }
    }
    for (let i = 0; i < cleared.length; i += 1) {
      points += (i + 1) * (10 + (height - cleared[i]))
    }

    let resting: number[][] = grid
    if (cleared.length > 0) {
      resting = []
      for (let r = 0; r < height; r += 1) {
        let skip = false
        for (let i = 0; i < cleared.length; i += 1) {
          if (cleared[i] === r) {
            skip = true
            break
          }
        }
        if (!skip) {
          resting.push(grid[r])
        }
      }
      while (resting.length < height) {
        const empty: number[] = []
        for (let c = 0; c < width; c += 1) {
          empty.push(0)
        }
        resting.unshift(empty)
      }
      let occupied = false
      for (let r = 0; r < height && !occupied; r += 1) {
        for (let c = 0; c < width; c += 1) {
          if (resting[r][c] === 1) {
            occupied = true
            break
          }
        }
      }
      if (!occupied) {
        points += 1000
      }
    }

    const columnHeights: number[] = []
    let holes = 0
    for (let c = 0; c < width; c += 1) {
      let columnHeight = 0
      let seen = false
      for (let r = 0; r < height; r += 1) {
        if (resting[r][c] === 1) {
          if (!seen) {
            seen = true
            columnHeight = height - r
          }
        } else if (seen) {
          holes += 1
        }
      }
      columnHeights.push(columnHeight)
    }

    let aggregateHeight = 0
    let maximumHeight = 0
    let bumpiness = 0
    for (let c = 0; c < width; c += 1) {
      aggregateHeight += columnHeights[c]
      if (columnHeights[c] > maximumHeight) {
        maximumHeight = columnHeights[c]
      }
      if (c > 0) {
        bumpiness += Math.abs(columnHeights[c] - columnHeights[c - 1])
      }
    }

    let rowTransitions = 0
    for (let r = 0; r < height; r += 1) {
      let previous = 1
      for (let c = 0; c < width; c += 1) {
        if (resting[r][c] !== previous) {
          rowTransitions += 1
        }
        previous = resting[r][c]
      }
      if (previous === 0) {
        rowTransitions += 1
      }
    }

    let columnTransitions = 0
    for (let c = 0; c < width; c += 1) {
      let previous = 1
      for (let r = 0; r < height; r += 1) {
        if (resting[r][c] !== previous) {
          columnTransitions += 1
        }
        previous = resting[r][c]
      }
      if (previous === 0) {
        columnTransitions += 1
      }
    }

    let wellDepth = 0
    for (let c = 0; c < width; c += 1) {
      let depth = 0
      for (let r = 0; r < height; r += 1) {
        if (resting[r][c] === 0) {
          const leftClosed = c === 0 || resting[r][c - 1] === 1
          const rightClosed = c === width - 1 || resting[r][c + 1] === 1
          if (leftClosed && rightClosed) {
            depth += 1
            wellDepth += depth
          } else {
            depth = 0
          }
        } else {
          depth = 0
        }
      }
    }

    let erodedCells = 0
    if (cleared.length > 0) {
      for (let i = 0; i < pieceRows.length; i += 1) {
        for (let j = 0; j < cleared.length; j += 1) {
          if (pieceRows[i] === cleared[j]) {
            erodedCells += 1
            break
          }
        }
      }
    }
    const landingHeight = height - pieceTop

    const squeeze = 8 - (height - maximumHeight)
    let value = points
    value += 3.4 * erodedCells * cleared.length
    value -= 4.5 * landingHeight
    value -= 6 * rowTransitions
    value -= 9.4 * columnTransitions
    value -= 7.9 * holes
    value -= 3.4 * wellDepth
    value -= 1.2 * bumpiness
    value -= 0.5 * aggregateHeight
    if (squeeze > 0) {
      value -= 2 * squeeze * squeeze
    }
    if (overflow > 0) {
      value -= 100000 * overflow
    }
    return value
  }

  const targets: number[] = []
  for (let c = -3; c <= width + 2; c += 1) {
    targets.push(c)
  }
  targets.sort((a: number, b: number): number => {
    return Math.abs(a - position.column) - Math.abs(b - position.column)
  })

  const sideSteps: string[] = ['', 'L', 'R']
  let best = ''
  let bestValue = Number.NEGATIVE_INFINITY
  for (let k = 0; k < orientationCount; k += 1) {
    const forward = k
    const backward = orientationCount - k
    const rotations = forward <= backward
      ? repeat('C', forward)
      : repeat('A', backward)
    for (let t = 0; t < targets.length; t += 1) {
      const delta = targets[t] - position.column
      const lateral = delta < 0 ? repeat('L', -delta) : repeat('R', delta)
      for (let s = 0; s < sideSteps.length; s += 1) {
        const sequence = rotations + lateral + 'H' + sideSteps[s]
        const value = evaluate(sequence) - sequence.length * 0.0001
        if (value > bestValue) {
          bestValue = value
          best = sequence
        }
      }
    }
  }
  return best
}

export const plan = adaptAuthoredPlan(authoredPlan)
