/**
 * Claude Sonnet 5.5 in Extra mode (40 min of thinking). It replays every
 * reachable placement exactly. It scores each placement with a twelve-feature
 * board weight vector and a one-piece lookahead over every catalog block.
 *
 * Authored from docs/demo-engine-task.md and wrapped by the shared adapter.
 * The planning body is kept as authored.
 */
import { adaptAuthoredPlan } from '../demo-engine-toolkit.js'

export const id = 'claude-sonnet-5-5-extra'
export const name = 'Claude Sonnet 5.5 Extra'
export const description =
  'Claude Sonnet 5.5 in Extra mode (40 min of thinking): exact-replay reachability, a twelve-feature board weight vector, and a one-piece lookahead over every catalog block.'

function authoredPlan(
  board: number[][],
  piece: { row: number; column: number }[][],
  position: { row: number; column: number },
): string {
  const height = board.length
  const width = height > 0 ? board[0].length : 0
  const turns = piece.length
  if (height === 0 || width === 0 || turns === 0) {
    return ''
  }
  const minos = piece[0].length

  // Feature weights (higher total = better placement).
  // [landing, clearedRows, rowTrans, colTrans, holes, wells, holeDepth, rowsWithHoles, bumpiness, danger, clearPts, dropPts]
  const W: number[] = [-7.303, 3.775, -2.98, -0.4, -15.734, -3.513, -2.23, -13.496, 0.605, -9.847, 0.059, 0.165]
  const LOOK = 6 // placements of this piece that get a one-piece lookahead (0 = off)
  const DEAD = 3000

  type Shape = { r: number[]; c: number[] }
  type Final = { row: number; column: number; o: number; text: string; drop: number; waits: number }

  const grid: number[] = new Array(height * width).fill(0)
  for (let r = 0; r < height; r += 1) {
    for (let c = 0; c < width; c += 1) {
      if (board[r][c] !== 0) {
        grid[r * width + c] = 1
      }
    }
  }
  const shapes: Shape[] = []
  for (let o = 0; o < turns; o += 1) {
    const s: Shape = { r: [], c: [] }
    for (let i = 0; i < piece[o].length; i += 1) {
      s.r.push(piece[o][i].row)
      s.c.push(piece[o][i].column)
    }
    shapes.push(s)
  }

  function fits(g: number[], s: Shape, row: number, col: number): boolean {
    for (let i = 0; i < s.r.length; i += 1) {
      const r = row + s.r[i]
      const c = col + s.c[i]
      if (c < 0 || c >= width || r >= height) {
        return false
      }
      if (r >= 0 && g[r * width + c] !== 0) {
        return false
      }
    }
    return true
  }

  function dropRowOf(g: number[], s: Shape, row: number, col: number): number {
    let r = row
    while (fits(g, s, r + 1, col)) {
      r += 1
    }
    return r
  }

  const fullRows: number[] = []
  const scratch: number[] = new Array(height * width).fill(0)
  const heights: number[] = new Array(width).fill(0)
  const holeRows: number[] = new Array(height).fill(0)
  let outImm = 0
  let outGrid: number[] = grid

  // Heuristic score of a settled board (everything except the immediate points and landing height).
  function surface(gr: number[]): number {
    let topRow = height
    let holes = 0
    let holeDepth = 0
    for (let r = 0; r < height; r += 1) {
      holeRows[r] = 0
    }
    for (let c = 0; c < width; c += 1) {
      let r = 0
      while (r < height && gr[r * width + c] === 0) {
        r += 1
      }
      if (r === height) {
        heights[c] = 0
        continue
      }
      heights[c] = height - r
      if (r < topRow) {
        topRow = r
      }
      let filled = 1
      for (r += 1; r < height; r += 1) {
        if (gr[r * width + c] !== 0) {
          filled += 1
        } else {
          holes += 1
          holeDepth += filled
          holeRows[r] = 1
        }
      }
    }
    let rowsWithHoles = 0
    for (let r = topRow; r < height; r += 1) {
      rowsWithHoles += holeRows[r]
    }
    let rowTrans = 0
    for (let r = topRow; r < height; r += 1) {
      let prev = 1
      for (let c = 0; c < width; c += 1) {
        const v = gr[r * width + c]
        if (v !== prev) {
          rowTrans += 1
        }
        prev = v
      }
      if (prev !== 1) {
        rowTrans += 1
      }
    }
    let colTrans = 0
    for (let c = 0; c < width; c += 1) {
      let prev = 1
      for (let r = height - 1; r >= topRow; r -= 1) {
        const v = gr[r * width + c]
        if (v !== prev) {
          colTrans += 1
        }
        prev = v
      }
    }
    let wells = 0
    let bump = 0
    let maxH = 0
    for (let c = 0; c < width; c += 1) {
      const left = c === 0 ? 99 : heights[c - 1]
      const right = c === width - 1 ? 99 : heights[c + 1]
      const depth = Math.min(left, right) - heights[c]
      if (depth > 0) {
        wells += (depth * (depth + 1)) / 2
      }
      if (c < width - 1) {
        bump += Math.abs(heights[c] - heights[c + 1])
      }
      if (heights[c] > maxH) {
        maxH = heights[c]
      }
    }
    const over = Math.max(0, maxH - (height - Math.min(7, Math.floor(height / 3))))
    lastEmpty = topRow === height
    return (
      W[2] * rowTrans +
      W[3] * colTrans +
      W[4] * holes +
      W[5] * wells +
      W[6] * holeDepth +
      W[7] * rowsWithHoles +
      W[8] * bump +
      W[9] * over * over
    )
  }
  let lastEmpty = false

  // Scores a lock position. Returns the heuristic value. The immediate part
  // and (if asked) the board after clears are left in outImm / outGrid. The
  // grid g is restored before returning.
  function evaluate(g: number[], s: Shape, row: number, col: number, drop: number, wantGrid: boolean): number {
    const n = s.r.length
    for (let i = 0; i < n; i += 1) {
      if (row + s.r[i] < 0) {
        outImm = 0
        return -DEAD
      }
    }
    let landing = 0
    for (let i = 0; i < n; i += 1) {
      const r = row + s.r[i]
      g[r * width + col + s.c[i]] = 1
      landing += height - r
    }
    landing /= n
    fullRows.length = 0
    for (let i = 0; i < n; i += 1) {
      const r = row + s.r[i]
      if (fullRows.indexOf(r) >= 0) {
        continue
      }
      let full = true
      for (let c = 0; c < width; c += 1) {
        if (g[r * width + c] === 0) {
          full = false
          break
        }
      }
      if (full) {
        fullRows.push(r)
      }
    }
    let clearPts = 0
    let sc = 0
    if (fullRows.length > 0) {
      fullRows.sort((a, b) => a - b)
      for (let i = 0; i < fullRows.length; i += 1) {
        clearPts += (i + 1) * (10 + height - fullRows[i])
      }
      const target: number[] = wantGrid ? new Array(height * width).fill(0) : scratch
      if (!wantGrid) {
        target.fill(0)
      }
      let w = height - 1
      for (let r = height - 1; r >= 0; r -= 1) {
        if (fullRows.indexOf(r) < 0) {
          for (let c = 0; c < width; c += 1) {
            target[w * width + c] = g[r * width + c]
          }
          w -= 1
        }
      }
      sc = surface(target)
      if (lastEmpty) {
        clearPts += 1000
      }
      outGrid = target
    } else {
      sc = surface(g)
      if (wantGrid) {
        outGrid = g.slice()
      }
    }
    for (let i = 0; i < n; i += 1) {
      g[(row + s.r[i]) * width + col + s.c[i]] = 0
    }
    outImm = W[1] * fullRows.length + W[10] * clearPts + W[11] * drop
    return outImm + W[0] * landing + sc
  }

  // ---- Reachability for the current piece: exact replay of "action, then tick". ----
  const finals: Final[] = []
  const finalIndex: { [key: number]: number } = {}

  // Several plans can end in the same cell: keep the one that scores most, then the one that
  // relies on the fewest ignored (blocked) moves, then the shortest.
  function addFinal(row: number, column: number, o: number, text: string, drop: number, waits: number): void {
    const key = ((row + 50) * 400 + (column + 100)) * 8 + o
    const at = finalIndex[key]
    if (at === undefined) {
      finalIndex[key] = finals.length
      finals.push({ row, column, o, text, drop, waits })
      return
    }
    const old = finals[at]
    if (
      drop > old.drop ||
      (drop === old.drop && (waits < old.waits || (waits === old.waits && text.length < old.text.length)))
    ) {
      finals[at] = { row, column, o, text, drop, waits }
    }
  }

  if (!fits(grid, shapes[0], position.row, position.column)) {
    return 'H'
  }
  type Node = { row: number; column: number; o: number; text: string; waits: number }
  const pad = 6
  const span = width + 2 * pad
  let layer: Node[] = [{ row: position.row, column: position.column, o: 0, text: '', waits: 0 }]
  const actions: string[] = ['C', 'A', 'L', 'R']
  while (layer.length > 0) {
    const next: Node[] = []
    const seen: number[] = new Array(span * turns).fill(-1)
    for (let n = 0; n < layer.length; n += 1) {
      const node = layer[n]
      const here = shapes[node.o]
      // Hard drop here, optionally followed by one side-step.
      const dr = dropRowOf(grid, here, node.row, node.column)
      const dropPts = dr > node.row ? Math.floor((minos * (height - node.row)) / 10) : 0
      addFinal(dr, node.column, node.o, node.text + 'H', dropPts, node.waits)
      for (let d = -1; d <= 1; d += 2) {
        const nc = node.column + d
        if (dr > node.row && fits(grid, here, dr, nc)) {
          addFinal(dropRowOf(grid, here, dr, nc), nc, node.o, node.text + 'H' + (d < 0 ? 'L' : 'R'), dropPts, node.waits)
        }
      }
      // One ordinary action followed by its tick.
      for (let a = 0; a < actions.length; a += 1) {
        const act = actions[a]
        let nc = node.column
        let no = node.o
        let waits = node.waits
        if (act === 'C' || act === 'A') {
          if (turns < 2 || (act === 'A' && turns === 2)) {
            continue
          }
          no = act === 'C' ? (node.o + 1) % turns : (node.o + turns - 1) % turns
          if (!fits(grid, shapes[no], node.row, node.column)) {
            continue // would need a wall kick: not predictable, so never plan it
          }
        } else {
          const tc = node.column + (act === 'L' ? -1 : 1)
          if (fits(grid, here, node.row, tc)) {
            nc = tc
          } else {
            waits += 1 // a blocked move is ignored: it only costs the tick
          }
        }
        if (fits(grid, shapes[no], node.row + 1, nc)) {
          const key = (nc + pad) * turns + no
          const at = seen[key]
          if (at < 0) {
            seen[key] = next.length
            next.push({ row: node.row + 1, column: nc, o: no, text: node.text + act, waits })
          } else if (waits < next[at].waits) {
            next[at] = { row: node.row + 1, column: nc, o: no, text: node.text + act, waits }
          }
        } else {
          addFinal(node.row, nc, no, node.text + act, 0, waits)
        }
      }
    }
    layer = next
  }

  if (finals.length === 0) {
    return 'H'
  }
  const values: number[] = []
  const imms: number[] = []
  const grids: number[][] = []
  for (let i = 0; i < finals.length; i += 1) {
    const f = finals[i]
    values.push(evaluate(grid, shapes[f.o], f.row, f.column, f.drop, true))
    imms.push(outImm)
    grids.push(outGrid)
  }
  const order: number[] = []
  for (let i = 0; i < finals.length; i += 1) {
    order.push(i)
  }
  order.sort((a, b) => values[b] - values[a])

  let pick = order[0]
  if (LOOK > 0 && values[pick] > -DEAD / 2) {
    // ---- One-piece lookahead against all 29 blocks (assumed equally likely). ----
    const table: number[][] = [
      [0, 0, 0],
      [1, 0, 0, 0, 1],
      [1, 0, 0, -1, 0, 1, 0],
      [2, 0, 0, 0, -1, 1, 0],
      [1, 0, 0, -2, 0, -1, 0, 1, 0],
      [0, 0, 0, 0, 1, 1, 1, 1, 0],
      [2, 0, 0, -1, 0, 1, 0, 0, -1],
      [2, 0, 0, -1, 0, 1, 0, 1, -1],
      [2, 0, 0, -1, -1, -1, 0, 1, 0],
      [1, 0, 0, -1, 0, 0, -1, 1, -1],
      [1, 0, 0, -1, -1, 0, -1, 1, 0],
      [1, 0, 0, -2, 0, -1, 0, 1, 0, 2, 0],
      [2, -1, -1, -1, 0, -1, 1, 0, 1, 1, 1],
      [0, 0, 0, 0, -1, -1, 0, 0, 1, 1, 0],
      [2, 0, 0, 1, -1, 0, -1, -1, -1, 0, 1],
      [2, 0, 0, -1, 1, 0, 1, 1, 0, 1, -1],
      [2, 0, 0, -1, -1, -1, 0, 1, 0, 1, -1],
      [2, 0, 0, -2, 0, -1, 0, 1, 0, 1, -1],
      [2, 0, 0, -1, -1, -1, 0, 1, 0, 2, 0],
      [2, 0, 0, 0, -1, -2, 0, -1, 0, 1, -1],
      [2, 0, 0, 0, -1, -1, -1, 1, 0, 2, 0],
      [2, 0, 0, 0, -1, -1, 1, 0, 1, 1, 0],
      [2, 0, 0, 0, -1, -1, 0, 0, 1, 1, 1],
      [2, 0, 0, 1, 0, 1, -1, 0, -1, 0, 1],
      [2, 0, 0, 0, -1, -1, -1, -1, 0, 0, 1],
      [1, 0, 0, 0, -1, -1, -1, 0, 1, 1, 1],
      [1, 0, 0, 1, -1, 0, -1, -1, 1, 0, 1],
      [2, 0, 0, 2, 0, 1, 0, 0, -1, -1, 0],
      [2, 0, 0, 1, 0, 0, -1, -2, 0, -1, 0],
    ]
    const blocks: Shape[][] = []
    const blockMin: number[] = []
    for (let b = 0; b < table.length; b += 1) {
      const row = table[b]
      const cr: number[] = []
      const cc: number[] = []
      for (let i = 1; i + 1 < row.length; i += 2) {
        cc.push(row[i])
        cr.push(row[i + 1])
      }
      const count = row[0] === 0 ? 1 : row[0] === 1 ? 2 : 4
      const orients: Shape[] = []
      for (let o = 0; o < count; o += 1) {
        orients.push({ r: cr.slice(), c: cc.slice() })
        for (let i = 0; i < cr.length; i += 1) {
          const nr = cc[i]
          const nc = -cr[i]
          cr[i] = nr
          cc[i] = nc
        }
      }
      let minR = 0
      for (let i = 0; i < orients[0].r.length; i += 1) {
        minR = Math.min(minR, orients[0].r[i])
      }
      blocks.push(orients)
      blockMin.push(minR)
    }
    let topAbs = 0
    for (let i = 0; i < shapes[0].r.length; i += 1) {
      topAbs = Math.min(topAbs, shapes[0].r[i])
    }
    topAbs += position.row
    const keep = Math.min(LOOK, order.length)
    let bestTotal = Number.NEGATIVE_INFINITY
    for (let k = 0; k < keep; k += 1) {
      const idx = order[k]
      if (values[idx] <= -DEAD / 2) {
        break
      }
      const ng = grids[idx]
      let sum = 0
      for (let b = 0; b < blocks.length; b += 1) {
        const spawnRow = topAbs - blockMin[b]
        let bestB = -DEAD
        for (let o = 0; o < blocks[b].length; o += 1) {
          const s = blocks[b][o]
          if (!fits(ng, s, spawnRow, position.column)) {
            continue
          }
          let lo = position.column
          while (fits(ng, s, spawnRow, lo - 1)) {
            lo -= 1
          }
          let hi = position.column
          while (fits(ng, s, spawnRow, hi + 1)) {
            hi += 1
          }
          for (let col = lo; col <= hi; col += 1) {
            const v = evaluate(ng, s, dropRowOf(ng, s, spawnRow, col), col, 0, false)
            if (v > bestB) {
              bestB = v
            }
          }
        }
        sum += bestB
      }
      const total = imms[idx] + sum / blocks.length
      if (total > bestTotal) {
        bestTotal = total
        pick = idx
      }
    }
  }
  return finals[pick].text
}

export const plan = adaptAuthoredPlan(authoredPlan)
