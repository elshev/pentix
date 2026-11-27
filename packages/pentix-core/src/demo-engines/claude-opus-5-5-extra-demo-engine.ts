/**
 * Claude Opus 5.5 in Extra mode (40 min of thinking). It runs a breadth-first
 * search over every reachable placement. A board heuristic plus earned points
 * scores each placement, and a 29-block one-piece lookahead re-ranks the result.
 *
 * Authored from docs/demo-engine-task.md and wrapped by the shared adapter.
 * The planning body is kept as authored.
 */
import { adaptAuthoredPlan } from '../demo-engine-toolkit.js'

export const id = 'claude-opus-5-5-extra'
export const name = 'Claude Opus 5.5 Extra'
export const description =
  'Claude Opus 5.5 in Extra mode (40 min of thinking): a breadth-first search over every reachable placement, scored by a board heuristic plus earned points, then re-ranked by a 29-block one-piece lookahead.'

// Pentix demo planner.
// 1. Breadth-first search over (orientation, column, row): every action costs
//    one tick, so the row is set by the number of actions spent. Rotations
//    that would need a wall kick are never used; blocked moves serve as waits.
//    From each state a hard drop is tried, plus one side-step after the drop.
// 2. Each reachable placement is scored: drop and cleared-row points plus a
//    board heuristic (holes, transitions, wells, landing height, ...).
// 3. The best few are re-ranked by the expected best placement of the next
//    piece, averaged over the whole 29-block set.
// 4. The log ends at H whenever the chosen placement is reachable by a
//    straight drop down its landing column; one trailing L or R is emitted
//    only for a pocket under an overhang, reached by dropping one column
//    beside it and side-stepping on the last tick.
function authoredPlan(
  board: number[][],
  piece: { row: number; column: number }[][],
  position: { row: number; column: number },
): string {
  // Weights: landing height, eroded cells, row transitions, column
  // transitions, holes, wells, hole depth, rows with holes, cleared-row
  // points, danger, danger line (rows from the top), bumpiness, lookahead
  // breadth, drop points.
  const WT: number[] = [-4.834, 5.752, -9.986, -28.158, -45.177, -7.136, -2.675, -32.254, -0.681, -0.21, 7.061, -2.877, 5, 0.3]

  const height: number = board.length
  if (height === 0 || piece.length === 0) {
    return ''
  }
  const width: number = board[0].length
  if (width === 0) {
    return ''
  }
  const n: number = piece.length
  const offR: number[][] = []
  const offC: number[][] = []
  for (let o = 0; o < n; o += 1) {
    const rs: number[] = []
    const cs: number[] = []
    const cells = piece[o]
    for (let i = 0; i < cells.length; i += 1) {
      rs.push(cells[i].row)
      cs.push(cells[i].column)
    }
    offR.push(rs)
    offC.push(cs)
  }
  const minos: number = offR[0].length
  if (minos === 0) {
    return ''
  }
  for (let o = 1; o < n; o += 1) {
    if (offR[o].length !== minos) {
      return ''
    }
  }

  const size: number = height * width
  const grid: number[] = []
  for (let r = 0; r < height; r += 1) {
    const line = board[r]
    for (let c = 0; c < width; c += 1) {
      grid.push(line !== undefined && line[c] ? 1 : 0)
    }
  }

  function fitsG(g: number[], rs: number[], cs: number[], r: number, c: number): boolean {
    for (let i = 0; i < rs.length; i += 1) {
      const rr = r + rs[i]
      const cc = c + cs[i]
      if (cc < 0 || cc >= width || rr >= height) {
        return false
      }
      if (rr >= 0 && g[rr * width + cc] !== 0) {
        return false
      }
    }
    return true
  }

  function landG(g: number[], rs: number[], cs: number[], r: number, c: number): number {
    let row = r
    while (fitsG(g, rs, cs, row + 1, c)) {
      row += 1
    }
    return row
  }

  function fits(o: number, r: number, c: number): boolean {
    return fitsG(grid, offR[o], offC[o], r, c)
  }

  function land(o: number, r: number, c: number): number {
    return landG(grid, offR[o], offC[o], r, c)
  }

  // a rotation that leaves a cell above the visible board is legal, but a
  // rotation fully inside the board is preferred when it costs nothing more
  function risky(o: number, r: number): number {
    const rs = offR[o]
    for (let i = 0; i < rs.length; i += 1) {
      if (r + rs[i] < 0) {
        return 1
      }
    }
    return 0
  }

  const r0: number = position.row
  const c0: number = position.column
  if (!fits(0, r0, c0)) {
    return ''
  }

  // ---- placements reachable by an action string --------------------------
  const PAD = 8
  const span: number = width + 2 * PAD
  const rowPad = 16
  const rowSpan: number = height + 2 * rowPad
  const candIndex: number[] = []
  for (let i = 0; i < n * span * rowSpan; i += 1) {
    candIndex.push(-1)
  }
  const cO: number[] = []
  const cR: number[] = []
  const cC: number[] = []
  const cS: string[] = []
  const cD: number[] = []
  const cK: number[] = []
  const cSide: number[] = []
  // for the same placement: the best log ending at H without a side-step and
  // the best log in which the piece lands while it is steered ('' = none)
  const cPS: string[] = []
  const cPD: number[] = []
  const cPK: number[] = []
  const cTS: string[] = []
  const cTK: number[] = []

  function addCand(o: number, r: number, c: number, s: string, d: number, risk: number, side: number): void {
    const ci = c + PAD
    const ri = r + rowPad
    if (ci < 0 || ci >= span || ri < 0 || ri >= rowSpan) {
      return
    }
    const key = (o * span + ci) * rowSpan + ri
    let j = candIndex[key]
    if (j < 0) {
      j = cO.length
      candIndex[key] = j
      cO.push(o)
      cR.push(r)
      cC.push(c)
      cS.push(s)
      cD.push(d)
      cK.push(risk)
      cSide.push(side)
      const drop = side === 0 && s.charAt(s.length - 1) === 'H'
      cPS.push(drop ? s : '')
      cPD.push(d)
      cPK.push(risk)
      cTS.push(side === 0 && !drop ? s : '')
      cTK.push(risk)
      return
    }
    if (side === 0 && s.charAt(s.length - 1) !== 'H') {
      if (cTS[j] === '' || risk < cTK[j] || (risk === cTK[j] && s.length < cTS[j].length)) {
        cTS[j] = s
        cTK[j] = risk
      }
    } else if (side === 0) {
      let plainBetter = false
      if (cPS[j] === '') {
        plainBetter = true
      } else if (d > cPD[j] + 1e-9) {
        plainBetter = true
      } else if (d > cPD[j] - 1e-9) {
        if (risk !== cPK[j]) {
          plainBetter = risk < cPK[j]
        } else {
          plainBetter = s.length < cPS[j].length
        }
      }
      if (plainBetter) {
        cPS[j] = s
        cPD[j] = d
        cPK[j] = risk
      }
    }
    let better = false
    if (d > cD[j] + 1e-9) {
      better = true
    } else if (d > cD[j] - 1e-9) {
      if (risk !== cK[j]) {
        better = risk < cK[j]
      } else if (side !== cSide[j]) {
        better = side < cSide[j]
      } else {
        better = s.length < cS[j].length
      }
    }
    if (better) {
      cS[j] = s
      cD[j] = d
      cK[j] = risk
      cSide[j] = side
    }
  }

  // Breadth-first search over (orientation, column). The row is fixed by the
  // number of actions already spent, because every action costs one tick.
  const seen: number[] = []
  const seenIdx: number[] = []
  for (let i = 0; i < n * span; i += 1) {
    seen.push(-1)
    seenIdx.push(0)
  }
  let layerC: number[] = [c0]
  let layerO: number[] = [0]
  let layerP: string[] = ['']
  let layerK: number[] = [0]
  for (let t = 0; layerC.length > 0 && t < height + 24; t += 1) {
    const r = r0 + t
    const nextC: number[] = []
    const nextO: number[] = []
    const nextP: string[] = []
    const nextK: number[] = []
    for (let i = 0; i < layerC.length; i += 1) {
      const c = layerC[i]
      const o = layerO[i]
      const p = layerP[i]
      const k = layerK[i]
      const lr = land(o, r, c)
      const dv = lr > r ? (minos * (height - r)) / 10 : 0
      addCand(o, lr, c, p + 'H', dv, k, 0)
      // one side-step after the drop; it may uncover at most one more row
      if (fits(o, lr, c - 1)) {
        const sl = land(o, lr, c - 1)
        if (sl <= lr + 1) {
          addCand(o, sl, c - 1, p + 'HL', dv, k, 1)
        }
      }
      if (fits(o, lr, c + 1)) {
        const sr = land(o, lr, c + 1)
        if (sr <= lr + 1) {
          addCand(o, sr, c + 1, p + 'HR', dv, k, 1)
        }
      }
      for (let a = 0; a < 4; a += 1) {
        let o2 = o
        let c2 = c
        let ch = ''
        let k2 = k
        if (a === 0) {
          if (n < 2) {
            continue
          }
          o2 = (o + 1) % n
          ch = 'C'
          if (!fits(o2, r, c)) {
            continue
          }
          k2 += risky(o2, r)
        } else if (a === 1) {
          if (n < 3) {
            continue
          }
          o2 = (o + n - 1) % n
          ch = 'A'
          if (!fits(o2, r, c)) {
            continue
          }
          k2 += risky(o2, r)
        } else if (a === 2) {
          ch = 'L'
          if (fits(o, r, c - 1)) {
            c2 = c - 1
          }
        } else {
          ch = 'R'
          if (fits(o, r, c + 1)) {
            c2 = c + 1
          }
        }
        if (fits(o2, r + 1, c2)) {
          if (c2 + PAD < 0 || c2 + PAD >= span) {
            continue
          }
          const key = o2 * span + c2 + PAD
          if (seen[key] !== t + 1) {
            seen[key] = t + 1
            seenIdx[key] = nextC.length
            nextC.push(c2)
            nextO.push(o2)
            nextP.push(p + ch)
            nextK.push(k2)
          } else if (k2 < nextK[seenIdx[key]]) {
            nextP[seenIdx[key]] = p + ch
            nextK[seenIdx[key]] = k2
          }
        } else {
          addCand(o2, r, c2, p + ch, 0, k2, 0)
        }
      }
    }
    layerC = nextC
    layerO = nextO
    layerP = nextP
    layerK = nextK
  }

  if (cO.length === 0) {
    return 'H'
  }

  // ---- evaluation ------------------------------------------------------------
  // Features of a settled board are kept per column and per row so that the
  // lookahead can update them for a few changed columns instead of rescanning.
  const spawnTop: number = r0 + 2
  const spawnLeft: number = c0 - 2
  const spawnRight: number = c0 + 2
  const dangerLine: number = height - WT[10]

  // per-column results of scanColumn
  let sH = 0
  let sHoles = 0
  let sDepth = 0
  let sTrans = 0

  function scanColumn(g: number[], c: number): void {
    let rr = 0
    while (rr < height && g[rr * width + c] === 0) {
      rr += 1
    }
    sH = height - rr
    let holes = 0
    let depth = 0
    let trans = 1
    let prev = 1
    let filled = 0
    for (; rr < height; rr += 1) {
      const v = g[rr * width + c]
      if (v !== prev) {
        trans += 1
      }
      prev = v
      if (v !== 0) {
        filled += 1
      } else {
        holes += 1
        depth += filled
      }
    }
    if (prev === 0) {
      trans += 1
    }
    sHoles = holes
    sDepth = depth
    sTrans = trans
  }

  function wellColumn(g: number[], c: number, hs: number[]): number {
    const start = height - hs[c]
    let lo = 0
    if (c > 0 && height - hs[c - 1] > lo) {
      lo = height - hs[c - 1]
    }
    if (c < width - 1 && height - hs[c + 1] > lo) {
      lo = height - hs[c + 1]
    }
    let depth = 0
    let sum = 0
    for (let rr = lo; rr < start; rr += 1) {
      const left = c === 0 || g[rr * width + c - 1] !== 0
      const right = c === width - 1 || g[rr * width + c + 1] !== 0
      if (left && right) {
        depth += 1
        sum += depth
      } else {
        depth = 0
      }
    }
    return sum
  }

  function rowTransitions(g: number[], rr: number): number {
    let prev = 1
    let trans = 0
    const base = rr * width
    for (let cc = 0; cc < width; cc += 1) {
      const v = g[base + cc]
      if (v !== prev) {
        trans += 1
      }
      prev = v
    }
    if (prev !== 1) {
      trans += 1
    }
    return trans
  }

  function heightCost(c: number, h: number): number {
    let v = 0
    if (h > dangerLine) {
      const e = h - dangerLine
      v += WT[9] * e * e
    }
    const start = height - h
    if (start <= spawnTop && c >= spawnLeft && c <= spawnRight) {
      v -= 1e5 * (spawnTop - start + 1)
    }
    return v
  }

  function combine(rowTrans: number, colTrans: number, holes: number, wells: number, depth: number, rowsWithHoles: number, bump: number, hc: number): number {
    return (
      WT[2] * rowTrans +
      WT[3] * colTrans +
      WT[4] * holes +
      WT[5] * wells +
      WT[6] * depth +
      WT[7] * rowsWithHoles +
      WT[11] * bump +
      hc
    )
  }

  // base statistics of the board the lookahead starts from
  const bH: number[] = []
  const bHoles: number[] = []
  const bDepth: number[] = []
  const bTrans: number[] = []
  const bWell: number[] = []
  const bCost: number[] = []
  const curH: number[] = []
  for (let c = 0; c < width; c += 1) {
    bH.push(0)
    bHoles.push(0)
    bDepth.push(0)
    bTrans.push(0)
    bWell.push(0)
    bCost.push(0)
    curH.push(0)
  }
  const bRT: number[] = []
  const bRH: number[] = []
  const bFill: number[] = []
  const rowDelta: number[] = []
  for (let r = 0; r < height; r += 1) {
    bRT.push(0)
    bRH.push(0)
    bFill.push(0)
    rowDelta.push(0)
  }
  let tRT = 0
  let tCT = 0
  let tHoles = 0
  let tWell = 0
  let tDepth = 0
  let tRWH = 0
  let tCost = 0
  let bTop = height
  let tBump = 0

  // first occupied row at or below each row, per column, of the prepared board
  const stride: number = height + 1
  const nextBelow: number[] = []
  for (let i = 0; i < width * stride; i += 1) {
    nextBelow.push(height)
  }

  // Landing row on the prepared board of a piece that fits at (r, c).
  function landPrepared(rs: number[], cs: number[], r: number, c: number): number {
    let best = height + 8
    for (let i = 0; i < rs.length; i += 1) {
      const y = r + rs[i]
      const f = nextBelow[(c + cs[i]) * stride + (y < 0 ? 0 : y)]
      const v = f - 1 - rs[i]
      if (v < best) {
        best = v
      }
    }
    return best
  }

  // Computes the statistics of g into the b* arrays and returns its value.
  function prepare(g: number[]): number {
    for (let c = 0; c < width; c += 1) {
      let f = height
      for (let rr = height - 1; rr >= 0; rr -= 1) {
        if (g[rr * width + c] !== 0) {
          f = rr
        }
        nextBelow[c * stride + rr] = f
      }
      nextBelow[c * stride + height] = height
    }
    tCT = 0
    tHoles = 0
    tDepth = 0
    tCost = 0
    let maxH = 0
    for (let r = 0; r < height; r += 1) {
      bRH[r] = 0
    }
    for (let c = 0; c < width; c += 1) {
      scanColumn(g, c)
      bH[c] = sH
      curH[c] = sH
      bHoles[c] = sHoles
      bDepth[c] = sDepth
      bTrans[c] = sTrans
      bCost[c] = heightCost(c, sH)
      tCT += sTrans
      tHoles += sHoles
      tDepth += sDepth
      tCost += bCost[c]
      if (sH > maxH) {
        maxH = sH
      }
      for (let rr = height - sH; rr < height; rr += 1) {
        if (g[rr * width + c] === 0) {
          bRH[rr] += 1
        }
      }
    }
    bTop = height - maxH
    tWell = 0
    for (let c = 0; c < width; c += 1) {
      bWell[c] = wellColumn(g, c, bH)
      tWell += bWell[c]
    }
    tRT = 0
    tRWH = 0
    for (let r = 0; r < height; r += 1) {
      let fill = 0
      const base = r * width
      for (let cc = 0; cc < width; cc += 1) {
        fill += g[base + cc]
      }
      bFill[r] = fill
      if (r >= bTop) {
        bRT[r] = rowTransitions(g, r)
        tRT += bRT[r]
        if (bRH[r] > 0) {
          tRWH += 1
        }
      } else {
        bRT[r] = 0
      }
    }
    tBump = 0
    for (let c = 1; c < width; c += 1) {
      tBump += Math.abs(bH[c] - bH[c - 1])
    }
    return combine(tRT, tCT, tHoles, tWell, tDepth, tRWH, tBump, tCost)
  }

  const fH: number[] = []
  for (let c = 0; c < width; c += 1) {
    fH.push(0)
  }
  const fRH: number[] = []
  for (let r = 0; r < height; r += 1) {
    fRH.push(0)
  }

  // Value of a settled board, computed from scratch (does not touch b*).
  function boardValue(g: number[]): number {
    let ct = 0
    let holes = 0
    let depth = 0
    let cost = 0
    let maxH = 0
    for (let r = 0; r < height; r += 1) {
      fRH[r] = 0
    }
    for (let c = 0; c < width; c += 1) {
      scanColumn(g, c)
      fH[c] = sH
      ct += sTrans
      holes += sHoles
      depth += sDepth
      cost += heightCost(c, sH)
      if (sH > maxH) {
        maxH = sH
      }
      if (sHoles > 0) {
        for (let rr = height - sH; rr < height; rr += 1) {
          if (g[rr * width + c] === 0) {
            fRH[rr] += 1
          }
        }
      }
    }
    let wells = 0
    for (let c = 0; c < width; c += 1) {
      wells += wellColumn(g, c, fH)
    }
    let rt = 0
    let rwh = 0
    for (let r = height - maxH; r < height; r += 1) {
      rt += rowTransitions(g, r)
      if (fRH[r] > 0) {
        rwh += 1
      }
    }
    let bump = 0
    for (let c = 1; c < width; c += 1) {
      bump += Math.abs(fH[c] - fH[c - 1])
    }
    return combine(rt, ct, holes, wells, depth, rwh, bump, cost)
  }

  const rowMark: number[] = []
  const touchedRows: number[] = []
  for (let r = 0; r < height; r += 1) {
    rowMark.push(0)
    touchedRows.push(0)
  }
  let stamp = 0

  // Value of the prepared board after adding cells that clear no row and lie
  // inside the board. g is the prepared board; it is restored on return.
  function incrementalValue(g: number[], rs: number[], cs: number[], r: number, c: number): number {
    stamp += 1
    const count = rs.length
    let minA = width
    let maxA = -1
    let minR = height
    let maxR = -1
    for (let i = 0; i < count; i += 1) {
      const rr = r + rs[i]
      const cc = c + cs[i]
      g[rr * width + cc] = 1
      if (cc < minA) {
        minA = cc
      }
      if (cc > maxA) {
        maxA = cc
      }
      if (rr < minR) {
        minR = rr
      }
      if (rr > maxR) {
        maxR = rr
      }
    }
    let ct = tCT
    let holes = tHoles
    let depth = tDepth
    let cost = tCost
    let nTouched = 0
    for (let a = minA; a <= maxA; a += 1) {
      const oldStart = height - bH[a]
      let pMin = height
      let k = 0
      let below = false
      for (let i = 0; i < count; i += 1) {
        if (c + cs[i] === a) {
          const rr = r + rs[i]
          k += 1
          if (rr < pMin) {
            pMin = rr
          }
          if (rr >= oldStart) {
            below = true
          }
        }
      }
      if (k === 0) {
        continue
      }
      if (!below) {
        // every new cell of this column sits above its old top
        let prev = 0
        let changes = 0
        let seenFilled = 0
        let addHoles = 0
        let addDepth = 0
        for (let rr = pMin; rr < oldStart; rr += 1) {
          const v = g[rr * width + a]
          if (v !== prev) {
            changes += 1
          }
          prev = v
          if (v !== 0) {
            seenFilled += 1
          } else {
            addHoles += 1
            addDepth += seenFilled
            if (rowMark[rr] !== stamp) {
              rowMark[rr] = stamp
              rowDelta[rr] = 0
              touchedRows[nTouched] = rr
              nTouched += 1
            }
            rowDelta[rr] += 1
          }
        }
        if (prev !== 1) {
          changes += 1
        }
        ct += changes - 1
        holes += addHoles
        depth += addDepth + k * bHoles[a]
        const nh = height - pMin
        cost += heightCost(a, nh) - bCost[a]
        curH[a] = nh
        continue
      }
      scanColumn(g, a)
      ct += sTrans - bTrans[a]
      holes += sHoles - bHoles[a]
      depth += sDepth - bDepth[a]
      cost += heightCost(a, sH) - bCost[a]
      const newStart = height - sH
      curH[a] = sH
      for (let rr = newStart + 1; rr < oldStart; rr += 1) {
        if (g[rr * width + a] === 0) {
          if (rowMark[rr] !== stamp) {
            rowMark[rr] = stamp
            rowDelta[rr] = 0
            touchedRows[nTouched] = rr
            nTouched += 1
          }
          rowDelta[rr] += 1
        }
      }
      for (let i = 0; i < count; i += 1) {
        const rr = r + rs[i]
        if (c + cs[i] === a && rr > oldStart) {
          if (rowMark[rr] !== stamp) {
            rowMark[rr] = stamp
            rowDelta[rr] = 0
            touchedRows[nTouched] = rr
            nTouched += 1
          }
          rowDelta[rr] -= 1
        }
      }
    }
    let rwh = tRWH
    for (let q = 0; q < nTouched; q += 1) {
      const rr = touchedRows[q]
      const before = bRH[rr] > 0 ? 1 : 0
      const now = bRH[rr] + rowDelta[rr] > 0 ? 1 : 0
      rwh += now - before
    }
    const wLo = minA > 0 ? minA - 1 : 0
    const wHi = maxA < width - 1 ? maxA + 1 : width - 1
    let wells = tWell
    let bump = tBump
    for (let w = wLo; w <= wHi; w += 1) {
      wells += wellColumn(g, w, curH) - bWell[w]
      if (w > wLo) {
        bump += Math.abs(curH[w] - curH[w - 1]) - Math.abs(bH[w] - bH[w - 1])
      }
    }
    let rt = tRT
    for (let rr = minR; rr <= maxR; rr += 1) {
      rt += rowTransitions(g, rr) - (rr >= bTop ? bRT[rr] : 0)
    }
    for (let a = minA; a <= maxA; a += 1) {
      curH[a] = bH[a]
    }
    for (let i = 0; i < count; i += 1) {
      g[(r + rs[i]) * width + c + cs[i]] = 0
    }
    return combine(rt, ct, holes, wells, depth, rwh, bump, cost)
  }

  const fullRow: number[] = []
  for (let r = 0; r < height; r += 1) {
    fullRow.push(0)
  }
  const scratch: number[] = grid.slice()

  // Value of locking a piece with cells (rs, cs) at (r, c) on board g: the
  // move itself plus the board it leaves. g is left unchanged; the resulting
  // board is written to `out` when one is given.
  function evalPlacement(g: number[], rs: number[], cs: number[], r: number, c: number, drop: number, out: number[] | null): number {
    const count = rs.length
    let above = 0
    let sumRow = 0
    let minRR = height
    let maxRR = -1
    for (let i = 0; i < count; i += 1) {
      const rr = r + rs[i]
      sumRow += rr
      if (rr < 0) {
        above += 1
      } else {
        g[rr * width + c + cs[i]] = 1
        if (rr < minRR) {
          minRR = rr
        }
        if (rr > maxRR) {
          maxRR = rr
        }
      }
    }
    let cleared = 0
    let clearPts = 0
    let eroded = 0
    for (let rr = minRR; rr <= maxRR; rr += 1) {
      let full = 1
      const base = rr * width
      for (let cc = 0; cc < width; cc += 1) {
        if (g[base + cc] === 0) {
          full = 0
          break
        }
      }
      fullRow[rr] = full
      if (full === 1) {
        cleared += 1
        clearPts += cleared * (10 + height - rr)
        for (let i = 0; i < count; i += 1) {
          if (r + rs[i] === rr) {
            eroded += 1
          }
        }
      }
    }
    const dst = out !== null ? out : scratch
    let d = height - 1
    for (let s = height - 1; s >= 0; s -= 1) {
      if (s >= minRR && s <= maxRR && fullRow[s] === 1) {
        continue
      }
      const sb = s * width
      const db = d * width
      for (let cc = 0; cc < width; cc += 1) {
        dst[db + cc] = g[sb + cc]
      }
      d -= 1
    }
    for (; d >= 0; d -= 1) {
      const db = d * width
      for (let cc = 0; cc < width; cc += 1) {
        dst[db + cc] = 0
      }
    }
    for (let rr = minRR; rr <= maxRR; rr += 1) {
      fullRow[rr] = 0
    }
    for (let i = 0; i < count; i += 1) {
      const rr = r + rs[i]
      if (rr >= 0) {
        g[rr * width + c + cs[i]] = 0
      }
    }
    let bonus = 0
    if (cleared > 0) {
      let empty = true
      for (let i = (height - 1) * width; i < size; i += 1) {
        if (dst[i] !== 0) {
          empty = false
          break
        }
      }
      if (empty) {
        bonus = 1000
      }
    }
    let value =
      WT[0] * (height - sumRow / count) +
      WT[1] * cleared * eroded +
      WT[8] * clearPts +
      WT[13] * (drop + bonus / 5) +
      boardValue(dst)
    if (above > 0) {
      value -= 1e7 * above
    }
    return value
  }

  // Same value as evalPlacement on the board last given to prepare(), but
  // without copying the board when the piece clears no row.
  function quickPlacement(g: number[], rs: number[], cs: number[], r: number, c: number, drop: number): number {
    const count = rs.length
    let sumRow = 0
    for (let i = 0; i < count; i += 1) {
      const rr = r + rs[i]
      if (rr < 0) {
        return evalPlacement(g, rs, cs, r, c, drop, null)
      }
      sumRow += rr
    }
    for (let i = 0; i < count; i += 1) {
      const rr = r + rs[i]
      let inRow = 0
      for (let q = 0; q < count; q += 1) {
        if (r + rs[q] === rr) {
          inRow += 1
        }
      }
      if (bFill[rr] + inRow >= width) {
        return evalPlacement(g, rs, cs, r, c, drop, null)
      }
    }
    return WT[0] * (height - sumRow / count) + WT[13] * drop + incrementalValue(g, rs, cs, r, c)
  }

  const total = cO.length
  const v1: number[] = []
  for (let j = 0; j < total; j += 1) {
    v1.push(evalPlacement(grid, offR[cO[j]], offC[cO[j]], cR[j], cC[j], cD[j], null))
  }
  const order: number[] = []
  for (let j = 0; j < total; j += 1) {
    order.push(j)
  }
  order.sort((a: number, b: number): number => {
    if (v1[b] !== v1[a]) {
      return v1[b] - v1[a]
    }
    return cS[a].length - cS[b].length
  })

  // True when a straight drop down the landing column from the entry row
  // reaches the placement, so it needs no side-step.
  function straight(j: number): boolean {
    const o = cO[j]
    if (!fits(o, r0, cC[j])) {
      return false
    }
    return land(o, r0, cC[j]) === cR[j]
  }

  // The log a placement is emitted with. A straight-drop placement ends at H
  // and never side-steps; a pocket under an overhang keeps the searched log,
  // which may be a drop one column beside it followed by one L or R.
  function emit(j: number): string {
    if (straight(j)) {
      return cPS[j] !== '' ? cPS[j] : cTS[j] + 'H'
    }
    return cS[j]
  }

  const allowed: number[] = []
  for (let q = 0; q < total; q += 1) {
    const j = order[q]
    if (!straight(j) || cPS[j] !== '' || cTS[j] !== '') {
      allowed.push(j)
    }
  }
  if (allowed.length === 0) {
    const s0 = cS[order[0]]
    const h = s0.indexOf('H')
    return h >= 0 ? s0.substring(0, h + 1) : s0
  }

  let K = Math.floor(WT[12])
  if (K > allowed.length) {
    K = allowed.length
  }
  if (K <= 1 || v1[allowed[0]] < -1e6) {
    return emit(allowed[0])
  }

  // ---- one piece of lookahead over the whole block set ---------------------
  // [rotation mode (0 none, 1 half, 2 full), then (column, row) offsets]
  const BL: number[][] = [
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
  const nR: number[][][] = []
  const nC: number[][][] = []
  for (let b = 0; b < BL.length; b += 1) {
    const spec = BL[b]
    const rs0: number[] = []
    const cs0: number[] = []
    for (let i = 1; i + 1 < spec.length; i += 2) {
      cs0.push(spec[i])
      rs0.push(spec[i + 1])
    }
    const listR: number[][] = [rs0]
    const listC: number[][] = [cs0]
    const turns = spec[0] === 0 ? 0 : spec[0] === 1 ? 1 : 3
    for (let k = 0; k < turns; k += 1) {
      const pr = listR[listR.length - 1]
      const pc = listC[listC.length - 1]
      const rr: number[] = []
      const ccs: number[] = []
      for (let i = 0; i < pr.length; i += 1) {
        rr.push(pc[i])
        ccs.push(-pr[i])
      }
      if (k === 1) {
        // a shape that repeats after a half turn has only two orientations
        let same = true
        for (let i = 0; i < rr.length && same; i += 1) {
          let found = false
          for (let q = 0; q < rs0.length; q += 1) {
            if (rs0[q] === rr[i] && cs0[q] === ccs[i]) {
              found = true
              break
            }
          }
          same = found
        }
        if (same) {
          break
        }
      }
      listR.push(rr)
      listC.push(ccs)
    }
    nR.push(listR)
    nC.push(listC)
  }

  // Best value the next piece can reach on the prepared board g: rotate at
  // the spawn column, slide sideways while falling, then drop.
  function bestNext(g: number[], rsL: number[][], csL: number[][]): number {
    const nn = rsL.length
    if (!fitsG(g, rsL[0], csL[0], r0, c0)) {
      return -1e6
    }
    const count = rsL[0].length
    let best = -1e9
    for (let k = 0; k < nn; k += 1) {
      const steps = k <= nn - k ? k : nn - k
      const dir = k <= nn - k ? 1 : nn - 1
      let cur = 0
      let r = r0
      let ok = true
      for (let s = 0; s < steps; s += 1) {
        cur = (cur + dir) % nn
        if (!fitsG(g, rsL[cur], csL[cur], r, c0) || !fitsG(g, rsL[cur], csL[cur], r + 1, c0)) {
          ok = false
          break
        }
        r += 1
      }
      if (!ok) {
        continue
      }
      const rs = rsL[k]
      const cs = csL[k]
      for (let side = -1; side <= 1; side += 2) {
        let cc = c0
        let rr = r
        let first = side < 0
        while (true) {
          if (first || cc !== c0) {
            const l = landPrepared(rs, cs, rr, cc)
            const dv = l > rr ? (count * (height - rr)) / 10 : 0
            const v = quickPlacement(g, rs, cs, l, cc, dv)
            if (v > best) {
              best = v
            }
          }
          first = false
          if (!fitsG(g, rs, cs, rr, cc + side)) {
            break
          }
          cc += side
          if (!fitsG(g, rs, cs, rr + 1, cc)) {
            break
          }
          rr += 1
        }
      }
    }
    return best < -1e8 ? -1e6 : best
  }

  const after: number[] = grid.slice()
  let bestJ = allowed[0]
  let bestV = Number.NEGATIVE_INFINITY
  for (let q = 0; q < K; q += 1) {
    const j = allowed[q]
    if (v1[j] < -1e6) {
      continue
    }
    const o = cO[j]
    const full = evalPlacement(grid, offR[o], offC[o], cR[j], cC[j], cD[j], after)
    const m = full - prepare(after)
    let sum = 0
    for (let b = 0; b < nR.length; b += 1) {
      sum += bestNext(after, nR[b], nC[b])
    }
    const v = m + sum / nR.length
    if (v > bestV + 1e-9) {
      bestV = v
      bestJ = j
    }
  }
  return emit(bestJ)
}

export const plan = adaptAuthoredPlan(authoredPlan)
