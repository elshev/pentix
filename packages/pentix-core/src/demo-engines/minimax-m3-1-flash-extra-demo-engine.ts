/**
 * MiniMax M3.1 Flash in Extra mode (3-4 hours of thinking): a breadth-first search over reachable states that scores each landing with the caller's exact points plus tuned stack-quality weights.
 *
 * Authored from docs/demo-engine-task.md and wrapped by the shared adapter;
 * the planning body is kept as authored.
 */
import { adaptAuthoredPlan } from '../demo-engine-toolkit.js'

export const id = 'minimax-m3-1-flash-extra'
export const name = 'MiniMax M3.1 Flash Extra'
export const description =
  'MiniMax M3.1 Flash in Extra mode (3-4 hours of thinking): a breadth-first search over reachable states that scores each landing with the caller\'s exact points plus tuned stack-quality weights.'

// Pentix planner.
//
// Algorithm: a breadth-first search over the piece's reachable states
// (orientation, column, row) replays the engine's tick rules, so every way of
// steering the piece is considered - a rotation is only used where the turned
// shape fits without a wall kick, and the one side-step the engine allows
// after a hard drop is simulated too. Each reachable landing is scored with
// the caller's exact rules (lock, drop, cleared rows, empty board) plus a
// board-quality term that keeps the stack flat and free of covered holes.
function authoredPlan(
  board: number[][],
  piece: { row: number; column: number }[][],
  position: { row: number; column: number },
): string {
  const height = board.length
  const width = height > 0 ? board[0].length : 0
  const orientationCount = piece.length
  if (height <= 0 || width <= 0 || orientationCount === 0) {
    return ''
  }
  const baseCells = piece[0] ?? []
  if (baseCells.length === 0) {
    return ''
  }
  const minos = baseCells.length

  // The caller's own points are the goal, so they are worth `score` times
  // their value. The board-quality terms are penalties in the same units,
  // kept small enough that clearing a row always beats a small difference
  // in the shape of the stack. These weights were tuned by playing whole
  // games against a model of the caller's scoring.
  const W = {
    score: 0.3,
    hole: 3.2,
    agg: 0.12,
    bump: 0.45,
    max: 0.45,
    rowTrans: 1.6,
    colTrans: 2,
    well: 0.062,
    near: 0.9,
    over: 3.375,
    tie: 0.001,
  }

  function cellAt(row: number, col: number): number {
    if (row < 0 || row >= height || col < 0 || col >= width) {
      return 0
    }
    const line = board[row]
    if (!line) {
      return 0
    }
    const value = line[col]
    return value === undefined ? 0 : value
  }

  // Does orientation `o` fit with its rotation point at (row, col)? Cells
  // above the board are free, cells outside the side walls are not.
  function fits(o: number, row: number, col: number): boolean {
    const cells = piece[o] ?? []
    if (cells.length === 0) {
      return false
    }
    for (let i = 0; i < cells.length; i += 1) {
      const cell = cells[i]
      if (!cell) {
        continue
      }
      const r = row + cell.row
      const c = col + cell.column
      if (c < 0 || c >= width || r >= height) {
        return false
      }
      if (r >= 0 && cellAt(r, c) !== 0) {
        return false
      }
    }
    return true
  }

  // The points the caller awards for the hard drop, at level one. `dropRow` is
  // the row of the rotation point at the moment H is applied, and a piece
  // that cannot fall any further scores nothing for the drop. Every term of
  // the caller's score is multiplied by the same level, so the level is
  // applied once, to the whole score, further down.
  function dropPointsAt(dropRow: number, canFall: boolean): number {
    if (!canFall) {
      return 0
    }
    return Math.floor((minos * (height - dropRow)) / 10)
  }

  // The lowest row the piece reaches when it falls straight down.
  function dropTo(o: number, row: number, col: number): number {
    let r = row
    while (fits(o, r + 1, col)) {
      r += 1
    }
    return r
  }
  let bestValue = Number.NEGATIVE_INFINITY
  let bestPath = ''

  // Scores a placement with the caller's exact rules and then judges the
  // board that is left behind.
  function placementValue(
    o: number,
    col: number,
    landing: number,
    dropPoints: number,
  ): number {
    const cells = piece[o] ?? []
    if (cells.length === 0) {
      return Number.NEGATIVE_INFINITY
    }
    const grid: number[][] = []
    for (let r = 0; r < height; r += 1) {
      const line: number[] = []
      for (let c = 0; c < width; c += 1) {
        line.push(cellAt(r, c))
      }
      grid.push(line)
    }
    let top = height
    for (let i = 0; i < cells.length; i += 1) {
      const cell = cells[i]
      if (!cell) {
        continue
      }
      const r = landing + cell.row
      const c = col + cell.column
      if (r < top) {
        top = r
      }
      if (r < 0 || r >= height || c < 0 || c >= width) {
        continue
      }
      grid[r][c] = 1
    }
    // Cleared rows, scored from the top one down, and the resting board.
    let cleared = 0
    let clearPoints = 0
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
        clearPoints += cleared * (10 + (height - r))
      } else {
        kept.push(grid[r])
      }
    }
    const rest: number[][] = []
    for (let i = 0; i < cleared; i += 1) {
      const blank: number[] = []
      for (let c = 0; c < width; c += 1) {
        blank.push(0)
      }
      rest.push(blank)
    }
    for (let i = 0; i < kept.length; i += 1) {
      rest.push(kept[i])
    }
    let occupied = false
    for (let r = 0; r < height && !occupied; r += 1) {
      for (let c = 0; c < width; c += 1) {
        if (rest[r][c] !== 0) {
          occupied = true
          break
        }
      }
    }
    // The caller's points: the lock, the hard drop, and the cleared rows.
    let value = (minos + dropPoints + clearPoints) * W.score
    if (!occupied) {
      value += 1000 * W.score
    }
    // Board quality: covered holes, stack height, bumpiness, and the shape of
    // the surface of the stack.
    const columnHeights: number[] = []
    let holes = 0
    let aggregate = 0
    let tallest = 0
    for (let c = 0; c < width; c += 1) {
      let surface = height
      for (let r = 0; r < height; r += 1) {
        if (rest[r][c] !== 0) {
          surface = r
          break
        }
      }
      const h = height - surface
      columnHeights.push(h)
      aggregate += h
      if (h > tallest) {
        tallest = h
      }
      for (let r = surface + 1; r < height; r += 1) {
        if (rest[r][c] === 0) {
          holes += 1
        }
      }
    }
    let bumpiness = 0
    for (let c = 0; c + 1 < width; c += 1) {
      bumpiness += Math.abs(columnHeights[c] - columnHeights[c + 1])
    }
    // Rows that need a single cell to be completed are worth keeping.
    let near = 0
    for (let r = 0; r < height; r += 1) {
      let free = 0
      for (let c = 0; c < width; c += 1) {
        if (rest[r][c] === 0) {
          free += 1
        }
      }
      if (free === 1) {
        near += 1
      }
    }
    value -= W.hole * holes
    value -= W.agg * aggregate
    value -= W.bump * bumpiness
    value -= W.max * tallest
    value += W.near * near
    // A stack that reaches the top of the board ends the game, so it is
    // punished hard.
    value -= W.over * Math.max(0, tallest - (height - 3))
    // A surface with many steps is hard to fill, so the number of changes
    // between neighbouring cells is punished.
    let rowTrans = 0
    for (let r = 0; r < height; r += 1) {
      let previous = 1
      for (let c = 0; c < width; c += 1) {
        const here = rest[r][c] === 0 ? 0 : 1
        if (here !== previous) {
          rowTrans += 1
        }
        previous = here
      }
      if (previous === 0) {
        rowTrans += 1
      }
    }
    let colTrans = 0
    for (let c = 0; c < width; c += 1) {
      let previous = 1
      for (let r = 0; r < height; r += 1) {
        const here = rest[r][c] === 0 ? 0 : 1
        if (here !== previous) {
          colTrans += 1
        }
        previous = here
      }
      if (previous === 0) {
        colTrans += 1
      }
    }
    value -= W.rowTrans * rowTrans
    value -= W.colTrans * colTrans
    // A deep well between two stacks is hard to fill again.
    let wellDepth = 0
    for (let c = 0; c < width; c += 1) {
      let depth = 0
      for (let r = 0; r < height; r += 1) {
        if (rest[r][c] === 0) {
          const leftClosed = c === 0 || rest[r][c - 1] !== 0
          const rightClosed = c === width - 1 || rest[r][c + 1] !== 0
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
    value -= W.well * wellDepth
    return value
  }
  // ---- Search ------------------------------------------------------------
  // A state is the position of the rotation point (orientation, column, row)
  // plus whether the last tick failed to move the piece down. Every action
  // costs one tick, so the piece falls one row per action: the first visit
  // to a state is the plan that reaches it, and therefore drops from it,
  // earliest.
  interface Node {
    o: number
    col: number
    row: number
    rested: boolean
    parent: number
    action: string
  }
  const nodes: Node[] = []
  const visited = new Set<string>()

  function pathOf(index: number): string {
    let text = ''
    let i = index
    while (i > 0) {
      text = nodes[i].action + text
      i = nodes[i].parent
    }
    return text
  }

  function consider(path: string, value: number): void {
    // Ties go to the shorter plan: it drops earlier and scores more.
    const score = value - path.length * W.tie
    if (score > bestValue) {
      bestValue = score
      bestPath = path
    }
  }

  nodes.push({
    o: 0,
    col: position.column,
    row: position.row,
    rested: false,
    parent: -1,
    action: '',
  })
  visited.add('0,' + position.column + ',' + position.row + ',0')

  for (let head = 0; head < nodes.length; head += 1) {
    const node = nodes[head]
    const prefix = pathOf(head)

    // A hard drop from here, with and without the one allowed side-step.
    //
    // The engine reads the string in order: it applies an action, then it
    // ticks. The tick moves the piece down, or locks it when it cannot fall.
    // When the piece is already resting, the next action in the string is
    // the last chance: it is applied and the piece locks on the tick that
    // follows. So a side-step is only really a side-step when the piece was
    // still falling when H was applied. If the piece was already resting, H
    // itself is the last-chance action and anything after it is discarded.
    const landing = dropTo(node.o, node.row, node.col)
    const canFall = fits(node.o, node.row + 1, node.col)
    const dropPoints = dropPointsAt(node.row, canFall)
    consider(prefix + 'H', placementValue(node.o, node.col, landing, dropPoints))
    if (canFall) {
      // The piece is falling, so H lands it and the one side-step after H
      // still happens: it moves the piece one column at the landing row, or
      // lets it fall one more row when the side-step uncovers a drop.
      for (let s = 0; s < 2; s += 1) {
        const step = s === 0 ? -1 : 1
        const nc = node.col + step
        if (!fits(node.o, landing, nc)) {
          continue
        }
        const afterStep = dropTo(node.o, landing, nc)
        consider(
          prefix + 'H' + (step === -1 ? 'L' : 'R'),
          placementValue(node.o, nc, afterStep, dropPoints),
        )
      }
    }
    // Keep steering. A move the board blocks is ignored by the game but still
    // costs a tick, so the piece stays where it is and falls. A rotation that
    // does not fit would be kicked sideways by the game, and that kick is not
    // documented, so such a rotation is never used.
    for (let a = 0; a < 4; a += 1) {
      const ch = a === 0 ? 'L' : a === 1 ? 'R' : a === 2 ? 'C' : 'A'
      let nextO = node.o
      let nextCol = node.col
      if (ch === 'L') {
        if (fits(node.o, node.row, node.col - 1)) {
          nextCol = node.col - 1
        }
      } else if (ch === 'R') {
        if (fits(node.o, node.row, node.col + 1)) {
          nextCol = node.col + 1
        }
      } else {
        if (orientationCount < 2) {
          continue
        }
        nextO =
          ch === 'C'
            ? (node.o + 1) % orientationCount
            : (node.o + orientationCount - 1) % orientationCount
        if (!fits(nextO, node.row, node.col)) {
          continue
        }
      }
      if (fits(nextO, node.row + 1, nextCol)) {
        // The tick after the action moves the piece one row down.
        const key = nextO + ',' + nextCol + ',' + (node.row + 1) + ',0'
        if (!visited.has(key)) {
          visited.add(key)
          nodes.push({
            o: nextO,
            col: nextCol,
            row: node.row + 1,
            rested: false,
            parent: head,
            action: ch,
          })
        }
      } else if (!node.rested) {
        // The piece rests now, but it still gets its one last-chance action
        // before the tick that locks it.
        const key = nextO + ',' + nextCol + ',' + node.row + ',1'
        if (!visited.has(key)) {
          visited.add(key)
          nodes.push({
            o: nextO,
            col: nextCol,
            row: node.row,
            rested: true,
            parent: head,
            action: ch,
          })
        }
      } else {
        // The piece was already resting and this action does not free it, so
        // the piece locks here. A hard drop from the same state lands in the
        // same place and scores the lock as well, so this is only needed for a
        // placement that a straight drop cannot reach.
        consider(prefix + ch, placementValue(nextO, nextCol, node.row, 0))
      }
    }
  }

  return bestPath
}

export const plan = adaptAuthoredPlan(authoredPlan)
