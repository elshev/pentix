/**
 * GLM 5.3 Flash in Extra mode (15 min of thinking). It searches every
 * orientation, landing column, rotation slot, and ending. It replays each
 * candidate with the engine rules and ranks the candidates by the exact points
 * minus holes, bumpiness, stack, landing, and top-row penalties. It ends at H
 * when a straight drop reaches the chosen placement, and it appends one L or R
 * only for a pocket under an overhang.
 *
 * Authored from docs/demo-engine-task.md and wrapped by the shared adapter.
 * The planning body is kept as authored.
 */
import { adaptAuthoredPlan } from '../demo-engine-toolkit.js'

export const id = 'glm-5-3-flash-extra'
export const name = 'GLM 5.3 Flash Extra'
export const description =
  'GLM 5.3 Flash in Extra mode (15 min of thinking): an exhaustive orientation, column, rotation-slot, and ending search with exact replay, ranked by points minus holes, bumpiness, stack, landing, and top-row penalties. It adds a side-step after H only for a pocket under an overhang.'

// The function plans one piece with an exhaustive candidate search and an
// exact replay. It builds each candidate string from lateral moves,
// rotations, further lateral moves, and an ending, where the rotations reach
// every reachable orientation in both turn directions, the rotation slot
// moves along the lateral path so a piece near a wall turns only where the
// turn fits without a wall kick, and the ending is one of "", "L", "R", "H",
// "HL", and "HR". The function replays each candidate on a copy of the board
// exactly as the caller does: it applies one action per turn and one tick
// after each action, it skips a blocked action but counts its tick, and it
// applies one last-chance action before a locking tick. The search discards
// a candidate whose rotation would need a wall kick, because the kick
// direction is unpredictable. The replay yields the locked cells and the
// rotation-point row at the moment H fires, and the function scores the
// candidate exactly from the hard-drop points, the lock points, the indexed
// clear points, and the 1000-point bonus for emptying the board. The search
// ranks the candidates by that score minus penalties for covered holes,
// bumpiness, stack height, landing height, and rows near the top, and a tie
// prefers fewer actions before the drop. The plan ends at H when a straight
// drop in the landing column reaches the chosen placement, and it appends
// exactly one L or R after H only when the placement lies below the
// straight-drop landing in the landing column, because only a pocket under
// an overhang needs the side-step.
function authoredPlan(
  board: number[][],
  piece: { row: number; column: number }[][],
  position: { row: number; column: number },
): string {
  const height = board.length
  const width = height > 0 ? board[0].length : 0
  if (height === 0 || width === 0 || piece.length === 0 || piece[0].length === 0) {
    return ''
  }
  const orientations = piece.length
  const minos = piece[0].length
  const spawnRow = position.row
  const spawnCol = position.column

  function cellsFit(
    cells: { row: number; column: number }[],
    row: number,
    col: number,
  ): boolean {
    for (let i = 0; i < cells.length; i += 1) {
      const r = row + cells[i].row
      const c = col + cells[i].column
      if (c < 0 || c >= width || r >= height) {
        return false
      }
      if (r >= 0 && board[r][c] !== 0) {
        return false
      }
    }
    return true
  }

  function repeatChar(ch: string, times: number): string {
    let out = ''
    for (let i = 0; i < times; i += 1) {
      out += ch
    }
    return out
  }

  // The helper computes the row where a straight drop in a column and an
  // orientation comes to rest. The descent starts above the board, so only
  // settled cells and the floor stop it.
  function straightDropRow(col: number, o: number): number {
    const cells = piece[o]
    let maxRowOff = cells[0].row
    for (let i = 1; i < cells.length; i += 1) {
      if (cells[i].row > maxRowOff) {
        maxRowOff = cells[i].row
      }
    }
    let row = -maxRowOff - 1
    while (cellsFit(cells, row + 1, col)) {
      row += 1
    }
    return row
  }

  function evaluate(
    cells: { row: number; column: number }[],
    row: number,
    col: number,
    dropPts: number,
  ): number {
    const grid: number[][] = []
    for (let r = 0; r < height; r += 1) {
      const copy: number[] = []
      for (let c = 0; c < width; c += 1) {
        copy.push(board[r][c])
      }
      grid.push(copy)
    }
    let top = 0
    let bottom = 0
    for (let i = 0; i < cells.length; i += 1) {
      const r = row + cells[i].row
      const c = col + cells[i].column
      if (r >= 0 && r < height) {
        grid[r][c] = 1
      }
      if (i === 0 || r < top) {
        top = r
      }
      if (i === 0 || r > bottom) {
        bottom = r
      }
    }
    let cleared = 0
    let clearPts = 0
    const kept: number[][] = []
    for (let r = 0; r < height; r += 1) {
      let full = true
      for (let c = 0; c < width; c += 1) {
        if (grid[r][c] !== 1) {
          full = false
          break
        }
      }
      if (full) {
        cleared += 1
        clearPts += cleared * (10 + (height - r))
      } else {
        kept.push(grid[r])
      }
    }
    const fresh: number[][] = []
    for (let i = 0; i < cleared; i += 1) {
      const blank: number[] = []
      for (let c = 0; c < width; c += 1) {
        blank.push(0)
      }
      fresh.push(blank)
    }
    for (let i = 0; i < kept.length; i += 1) {
      fresh.push(kept[i])
    }
    let isEmpty = true
    for (let r = 0; r < height && isEmpty; r += 1) {
      for (let c = 0; c < width; c += 1) {
        if (fresh[r][c] !== 0) {
          isEmpty = false
          break
        }
      }
    }
    const colH: number[] = []
    let holes = 0
    let maxH = 0
    for (let c = 0; c < width; c += 1) {
      let surface = height
      for (let r = 0; r < height; r += 1) {
        if (fresh[r][c] === 1) {
          surface = r
          break
        }
      }
      const h = height - surface
      colH.push(h)
      if (h > maxH) {
        maxH = h
      }
      for (let r = surface + 1; r < height; r += 1) {
        if (fresh[r][c] === 0) {
          holes += 1
        }
      }
    }
    let bump = 0
    for (let c = 0; c + 1 < width; c += 1) {
      bump += Math.abs(colH[c] - colH[c + 1])
    }
    const landing = height - (top + bottom) / 2
    const limit = height - 6
    const danger = maxH > limit ? maxH - limit : 0
    const immediate = dropPts + minos + clearPts + (isEmpty ? 1000 : 0)
    return immediate - 30 * holes - 3 * bump - 2 * maxH - 2 * landing - 20 * danger
  }

  function simulate(
    actions: string,
  ): { score: number; row: number; col: number; o: number; sideMoved: boolean } | null {
    let row = spawnRow
    let col = spawnCol
    let o = 0
    let idx = 0
    let dropPts = 0
    let sideMoved = false
    const len = actions.length
    let guard = (height + 4) * (len + 4) + 8
    while (guard > 0) {
      guard -= 1
      if (idx < len) {
        const ch = actions.charAt(idx)
        idx += 1
        if (ch === 'L') {
          if (cellsFit(piece[o], row, col - 1)) {
            col -= 1
          }
        } else if (ch === 'R') {
          if (cellsFit(piece[o], row, col + 1)) {
            col += 1
          }
        } else if (ch === 'H') {
          const falls = cellsFit(piece[o], row + 1, col)
          const at = row
          while (cellsFit(piece[o], row + 1, col)) {
            row += 1
          }
          if (falls) {
            dropPts = Math.floor((minos * (height - at)) / 10)
          }
        } else {
          const next = ch === 'C' ? (o + 1) % orientations : (o + orientations - 1) % orientations
          if (!cellsFit(piece[next], row, col)) {
            return null
          }
          o = next
        }
      }
      if (cellsFit(piece[o], row + 1, col)) {
        row += 1
        continue
      }
      if (idx < len) {
        const ch = actions.charAt(idx)
        idx += 1
        if (ch === 'L') {
          if (cellsFit(piece[o], row, col - 1)) {
            col -= 1
            sideMoved = true
          }
        } else if (ch === 'R') {
          if (cellsFit(piece[o], row, col + 1)) {
            col += 1
            sideMoved = true
          }
        } else if (ch === 'H') {
          // The piece already rests, so the hard drop scores no drop points.
        } else {
          const next = ch === 'C' ? (o + 1) % orientations : (o + orientations - 1) % orientations
          if (!cellsFit(piece[next], row, col)) {
            return null
          }
          o = next
        }
        if (cellsFit(piece[o], row + 1, col)) {
          row += 1
          continue
        }
      }
      break
    }
    return {
      score: evaluate(piece[o], row, col, dropPts),
      row: row,
      col: col,
      o: o,
      sideMoved: sideMoved,
    }
  }

  const endings: string[] = ['', 'L', 'R', 'H', 'HL', 'HR']
  let bestActions = 'H'
  let bestScore = Number.NEGATIVE_INFINITY
  let bestCost = Number.POSITIVE_INFINITY
  for (let k = 0; k < orientations; k += 1) {
    const cells = piece[k]
    if (cells.length === 0) {
      continue
    }
    let minOff = cells[0].column
    let maxOff = cells[0].column
    for (let i = 1; i < cells.length; i += 1) {
      const off = cells[i].column
      if (off < minOff) {
        minOff = off
      }
      if (off > maxOff) {
        maxOff = off
      }
    }
    const lo = -minOff
    const hi = width - 1 - maxOff
    if (lo > hi) {
      continue
    }
    const seqs: string[] = [repeatChar('C', k)]
    if (k !== 0) {
      seqs.push(repeatChar('A', orientations - k))
    }
    for (let q = 0; q < seqs.length; q += 1) {
      const rot = seqs[q]
      for (let target = lo; target <= hi; target += 1) {
        const delta = target - spawnCol
        const dir = delta < 0 ? 'L' : 'R'
        const steps = delta < 0 ? -delta : delta
        const maxD = rot.length === 0 ? 0 : steps
        for (let d = 0; d <= maxD; d += 1) {
          const prefix = repeatChar(dir, d) + rot + repeatChar(dir, steps - d)
          for (let e = 0; e < endings.length; e += 1) {
            const ending = endings[e]
            const candidate = prefix + ending
            const outcome = simulate(candidate)
            if (outcome === null) {
              continue
            }
            // The search keeps a side-step only when the placement lies below
            // the straight-drop landing in the landing column, because only a
            // pocket under an overhang needs the side-step.
            if (
              (ending === 'HL' || ending === 'HR') &&
              outcome.sideMoved &&
              outcome.row === straightDropRow(outcome.col, outcome.o)
            ) {
              continue
            }
            const score = outcome.score
            if (score > bestScore || (score === bestScore && prefix.length < bestCost)) {
              bestScore = score
              bestCost = prefix.length
              bestActions = candidate
            }
          }
        }
      }
    }
  }
  return bestActions
}

export const plan = adaptAuthoredPlan(authoredPlan)
