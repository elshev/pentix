/**
 * DeepSeek v4 Pro Max (12 min of thinking). It replays every orientation,
 * column, and post-drop side-step exactly. It ranks placements by immediate
 * points minus holes, height, and bumpiness.
 *
 * Authored from docs/demo-engine-task.md and wrapped by the shared adapter.
 * The planning body is kept as authored.
 */
import { adaptAuthoredPlan } from '../demo-engine-toolkit.js'

export const id = 'deepseek-v4-pro-max'
export const name = 'DeepSeek v4 Pro Max'
export const description =
  'DeepSeek v4 Pro Max (12 min of thinking): exact replay of every orientation, column, and post-drop side-step, ranking placements by immediate points minus holes, height, and bumpiness.'

// Algorithm (short):
// Enumerate every candidate placement: an orientation (reached with the fewest
// rotations: k `C`s or `len-k` `A`s), a target column (direct lateral moves),
// and an optional single side-step right after the hard drop. Replay each
// candidate's action string exactly like the caller does: apply one action, then
// one tick. The piece locks one tick after it first fails to move down,
// impossible moves are ignored, and rotations that collide are kicked sideways
// (tried in place, then -1, +1, -2, +2 columns). Score the resulting board:
// line clears (index x (10 + height - row)), +1000 for emptying the board,
// hard-drop and lock points, minus penalties for covered holes, stack height,
// and bumpiness (and a huge penalty when the piece locks with cells above the
// top edge). Return the best string, trimmed to the actions the engine actually
// consumes, or "" when nothing can be placed.
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
  const minos: number = piece[0].length
  const orientCount: number = piece.length
  const startRow: number = position.row
  const startCol: number = position.column

  function canPlace(o: number, row: number, col: number): boolean {
    const cells: { row: number; column: number }[] = piece[o]
    for (let i = 0; i < cells.length; i += 1) {
      const r: number = row + cells[i].row
      const c: number = col + cells[i].column
      if (c < 0 || c >= width || r >= height) {
        return false
      }
      if (r >= 0 && board[r][c] === 1) {
        return false
      }
    }
    return true
  }

  interface SimResult {
    ori: number
    row: number
    col: number
    dropRow: number
    used: number
  }

  function simulate(actions: string): SimResult {
    let o: number = 0
    let r: number = startRow
    let c: number = startCol
    let grounded: boolean = false
    let dropRow: number = -1
    let used: number = 0

    const tick = (): boolean => {
      // Returns true when this tick locks the piece.
      if (canPlace(o, r + 1, c)) {
        r += 1
        grounded = false
        return false
      }
      if (grounded) {
        return true
      }
      grounded = true
      return false
    }

    for (let i = 0; i < actions.length; i += 1) {
      used = i + 1
      const ch: string = actions[i]
      if (ch === 'L') {
        if (canPlace(o, r, c - 1)) {
          c -= 1
        }
      } else if (ch === 'R') {
        if (canPlace(o, r, c + 1)) {
          c += 1
        }
      } else if (ch === 'C' || ch === 'A') {
        const target: number = (o + (ch === 'C' ? 1 : orientCount - 1)) % orientCount
        const kicks: number[] = [0, -1, 1, -2, 2]
        for (let k = 0; k < kicks.length; k += 1) {
          if (canPlace(target, r, c + kicks[k])) {
            o = target
            c += kicks[k]
            break
          }
        }
      } else if (ch === 'H') {
        // A hard drop with no free row below scores nothing for the fall.
        if (canPlace(o, r + 1, c)) {
          dropRow = r
          while (canPlace(o, r + 1, c)) {
            r += 1
          }
        }
      }
      if (tick()) {
        return { ori: o, row: r, col: c, dropRow, used }
      }
    }
    while (!tick()) {
      // ticks continue alone until the piece locks
    }
    return { ori: o, row: r, col: c, dropRow, used }
  }

  function evaluate(sim: SimResult): number {
    const cells: { row: number; column: number }[] = []
    let aboveTop: boolean = false
    for (let i = 0; i < piece[sim.ori].length; i += 1) {
      const rr: number = sim.row + piece[sim.ori][i].row
      const cc: number = sim.col + piece[sim.ori][i].column
      if (rr < 0) {
        aboveTop = true
      }
      cells.push({ row: rr, column: cc })
    }

    // Board after the lock, then after clearing any completed rows.
    const grid: number[][] = []
    for (let rr = 0; rr < height; rr += 1) {
      grid.push(board[rr].slice())
    }
    for (let i = 0; i < cells.length; i += 1) {
      const rr: number = cells[i].row
      const cc: number = cells[i].column
      if (rr >= 0 && rr < height && cc >= 0 && cc < width) {
        grid[rr][cc] = 1
      }
    }

    const fullRows: number[] = []
    for (let rr = 0; rr < height; rr += 1) {
      let complete: boolean = true
      for (let cc = 0; cc < width; cc += 1) {
        if (grid[rr][cc] === 0) {
          complete = false
          break
        }
      }
      if (!complete) {
        continue
      }
      for (let i = 0; i < cells.length; i += 1) {
        if (cells[i].row === rr) {
          fullRows.push(rr)
          break
        }
      }
    }

    let linesScore: number = 0
    for (let i = 0; i < fullRows.length; i += 1) {
      linesScore += (i + 1) * (10 + (height - fullRows[i]))
    }

    let after: number[][] = grid
    if (fullRows.length > 0) {
      const kept: number[][] = []
      for (let rr = 0; rr < height; rr += 1) {
        let cleared: boolean = false
        for (let i = 0; i < fullRows.length; i += 1) {
          if (fullRows[i] === rr) {
            cleared = true
            break
          }
        }
        if (!cleared) {
          kept.push(grid[rr])
        }
      }
      after = []
      for (let i = 0; i < fullRows.length; i += 1) {
        const empty: number[] = []
        for (let cc = 0; cc < width; cc += 1) {
          empty.push(0)
        }
        after.push(empty)
      }
      for (let i = 0; i < kept.length; i += 1) {
        after.push(kept[i])
      }
    }

    let emptyBonus: number = 0
    if (fullRows.length > 0) {
      let empty: boolean = true
      for (let rr = 0; rr < height && empty; rr += 1) {
        for (let cc = 0; cc < width; cc += 1) {
          if (after[rr][cc] === 1) {
            empty = false
            break
          }
        }
      }
      if (empty) {
        emptyBonus = 1000
      }
    }

    let holes: number = 0
    let aggregate: number = 0
    let bump: number = 0
    let prevColHeight: number = 0
    for (let cc = 0; cc < width; cc += 1) {
      let top: number = height
      for (let rr = 0; rr < height; rr += 1) {
        if (after[rr][cc] === 1) {
          top = rr
          break
        }
      }
      const colHeight: number = height - top
      aggregate += colHeight
      if (cc > 0) {
        bump += Math.abs(colHeight - prevColHeight)
      }
      prevColHeight = colHeight
      if (top < height) {
        for (let rr = top + 1; rr < height; rr += 1) {
          if (after[rr][cc] === 0) {
            holes += 1
          }
        }
      }
    }

    const dropScore: number =
      sim.dropRow >= 0 ? Math.floor((minos * (height - sim.dropRow)) / 10) : 0
    const lockScore: number = minos
    const qualityPenalty: number = 8 * holes + 0.4 * aggregate + 0.5 * bump
    const gameOverPenalty: number = aboveTop ? 1000000 : 0
    return linesScore + emptyBonus + dropScore + lockScore - qualityPenalty - gameOverPenalty
  }

  let bestScore: number = Number.NEGATIVE_INFINITY
  let bestActions: string = ''
  let bestLength: number = Number.POSITIVE_INFINITY
  const steps: string[] = ['', 'L', 'R']
  for (let o = 0; o < orientCount; o += 1) {
    const rotStr: string =
      o <= orientCount - o ? 'C'.repeat(o) : 'A'.repeat(orientCount - o)
    for (let c = 0; c < width; c += 1) {
      const dist: number = Math.abs(c - startCol)
      const moveStr: string = (c > startCol ? 'R' : 'L').repeat(dist)
      for (let s = 0; s < steps.length; s += 1) {
        const actions: string = rotStr + moveStr + 'H' + steps[s]
        const sim: SimResult = simulate(actions)
        const score: number = evaluate(sim)
        const output: string = actions.slice(0, sim.used)
        // On equal score prefer the shorter plan: fewer actions means the
        // piece drops from higher up and less can go wrong.
        if (score > bestScore || (score === bestScore && output.length < bestLength)) {
          bestScore = score
          bestActions = output
          bestLength = output.length
        }
      }
    }
  }
  return bestActions
}

export const plan = adaptAuthoredPlan(authoredPlan)
