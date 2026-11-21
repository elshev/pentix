/**
 * GLM 5.3 Flash in Extra mode (15 min of thinking): an exhaustive candidate search with kick-free rotation placement, ranked by immediate points minus holes, bumpiness, and stack penalties.
 *
 * Authored from docs/demo-engine-task.md and wrapped by the shared adapter;
 * the planning body is kept as authored.
 */
import { adaptAuthoredPlan } from '../demo-engine-toolkit.js'

export const id = 'glm-5-3-flash-extra'
export const name = 'GLM 5.3 Flash Extra'
export const description =
  'GLM 5.3 Flash in Extra mode (15 min of thinking): an exhaustive candidate search with kick-free rotation placement, ranked by immediate points minus holes, bumpiness, and stack penalties.'

// Algorithm (short): exhaustive candidate search with exact replay.
// For every reachable orientation, every possible landing column, every
// rotation timing along the lateral path (so a piece spawned near a wall
// turns only where the turn fits without a wall kick), and every ending
// ("", "L", "R", "H", "HL", "HR" - hard drop plus at most one side-step),
// build the candidate string [laterals][rotations][laterals]<ending> and
// replay it on a copy of the board exactly as the caller does: one action
// per turn then one tick, blocked actions skipped but their tick counted,
// and one last-chance action applied before a locking tick. A candidate
// whose rotation would need a wall kick is discarded as unpredictable. The
// replay gives the locked cells and the rotation-point row at the moment H
// fires, hence the exact immediate score: hard-drop points + lock points +
// indexed clear points + 1000 for emptying the board. Candidates are ranked
// by that score minus penalties for covered holes, bumpiness, stack height,
// landing height and rows pushed near the top; ties prefer fewer actions
// before the drop, so the piece falls as early as possible and a side-step
// is emitted only when it actually changes the outcome.
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

  function simulate(actions: string): number {
    let row = spawnRow
    let col = spawnCol
    let o = 0
    let idx = 0
    let dropPts = 0
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
            return Number.NEGATIVE_INFINITY
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
          }
        } else if (ch === 'R') {
          if (cellsFit(piece[o], row, col + 1)) {
            col += 1
          }
        } else if (ch === 'H') {
          // resting hard drop: the piece cannot fall, so no drop points
        } else {
          const next = ch === 'C' ? (o + 1) % orientations : (o + orientations - 1) % orientations
          if (!cellsFit(piece[next], row, col)) {
            return Number.NEGATIVE_INFINITY
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
    return evaluate(piece[o], row, col, dropPts)
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
            const candidate = prefix + endings[e]
            const score = simulate(candidate)
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
