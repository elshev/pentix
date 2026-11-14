import type { BoardSnapshot } from './board.js'
import {
  normalizeAngle,
  type Piece,
  type RotationAngle,
  type RotationMode,
} from './piece.js'
import { canPlace, getActivePiece, getOccupiedCells } from './placement.js'
import type { PentixGameSession } from './session.js'

/**
 * Demo (attract-mode) auto-play. Ports the Delphi `CalcDemoDest` destination
 * heuristic so the browser demo imitates the classic client's self-play.
 * `planDemoDestination` chooses where to steer the active piece; the web layer
 * turns that destination into engine mutations.
 */

/** The demo's chosen rotation angle and origin column for the active piece. */
export interface DemoDestination {
  readonly angle: RotationAngle
  readonly column: number
}

const HOLES_COEF = 1.5
const ALL_ANGLES = [0, 90, 180, 270] as const

interface PieceExtents {
  readonly minX: number
  readonly maxX: number
  readonly minY: number
  readonly maxY: number
}

interface DemoChoice {
  readonly angle: RotationAngle
  readonly column: number
  readonly row: number
  readonly priority: number
  readonly bottom: number
  readonly top: number
  readonly touchesWall: boolean
}

function pieceExtents(piece: Piece): PieceExtents {
  let minX = 0
  let maxX = 0
  let minY = 0
  let maxY = 0

  for (const offset of piece.occupiedOffsets) {
    if (offset.x < minX) {
      minX = offset.x
    }
    if (offset.x > maxX) {
      maxX = offset.x
    }
    if (offset.y < minY) {
      minY = offset.y
    }
    if (offset.y > maxY) {
      maxY = offset.y
    }
  }

  return { minX, maxX, minY, maxY }
}

function candidateAngles(rotationMode: RotationMode): RotationAngle[] {
  const angles = new Set<RotationAngle>()
  for (const raw of ALL_ANGLES) {
    angles.add(normalizeAngle(raw, rotationMode))
  }
  return [...angles]
}

/**
 * Finds where a piece dropped straight down in `column` comes to rest, or
 * `null` when the column's shaft is blocked at the top so the piece can never
 * reach it.
 */
function findLandingRow(
  board: BoardSnapshot,
  piece: Piece,
  column: number,
): number | null {
  const { minY } = pieceExtents(piece)
  let row = -minY

  if (!canPlace(board, getOccupiedCells(piece, { row, column }))) {
    return null
  }

  while (canPlace(board, getOccupiedCells(piece, { row: row + 1, column }))) {
    row += 1
  }

  return row
}

function countHoles(
  grid: readonly (readonly boolean[])[],
  width: number,
  height: number,
): number {
  let holes = 0
  for (let column = 0; column < width; column += 1) {
    let hasBlock = false
    for (let row = 0; row < height; row += 1) {
      if (grid[row][column]) {
        hasBlock = true
      } else if (hasBlock) {
        holes += 1
      }
    }
  }
  return holes
}

function countFullLines(
  grid: readonly (readonly boolean[])[],
  width: number,
  height: number,
): number {
  let lines = 0
  for (let row = 0; row < height; row += 1) {
    let full = true
    for (let column = 0; column < width; column += 1) {
      if (!grid[row][column]) {
        full = false
        break
      }
    }
    if (full) {
      lines += 1
    }
  }
  return lines
}

/**
 * Delphi `Round` uses banker's rounding (round half to even), which differs
 * from JavaScript's `Math.round` (round half up). The holes term multiplies an
 * integer difference by `1.5`, so exact `.5` results occur and must round the
 * Delphi way.
 */
function bankersRound(value: number): number {
  const floor = Math.floor(value)
  const fraction = value - floor
  if (fraction < 0.5) {
    return floor
  }
  if (fraction > 0.5) {
    return Math.ceil(value)
  }
  return floor % 2 === 0 ? floor : floor + 1
}

function preferCandidate(candidate: DemoChoice, best: DemoChoice): boolean {
  if (candidate.bottom > best.bottom) {
    return true
  }
  if (candidate.top > best.top) {
    return true
  }
  return candidate.touchesWall
}

/**
 * Chooses the demo's target rotation angle and column for the active piece.
 *
 * This is a faithful port of the Delphi `CalcDemoDest` heuristic. It follows
 * Delphi's bottom-up scan: for every valid orientation, origin column, and
 * reachable origin row (a row the piece can fall into from the top), it scores
 * `row + round((holesBefore − holesAfter) × 1.5) + fullLines²` and selects the
 * maximum, resolving ties with Delphi's rules (prefer a lower bottom, then a
 * lower top, then a wall-adjacent placement).
 */
export function planDemoDestination(
  session: PentixGameSession,
): DemoDestination | null {
  const { board } = session
  const { width, height } = board
  const baseGrid = board.rows.map((row) => row.map((cell) => cell.isOccupied))
  const holesBefore = countHoles(baseGrid, width, height)

  const piece = getActivePiece(session)
  const candidates: DemoChoice[] = []

  for (const angle of candidateAngles(piece.rotationMode)) {
    const rotated = piece.withAngle(angle)
    const { minX, maxX, minY, maxY } = pieceExtents(rotated)
    const topExtent = -minY
    const leftExtent = -minX

    for (let column = 0; column < width; column += 1) {
      // `findLandingRow` returns null when the column's shaft is blocked at the
      // top, otherwise the lowest reachable row; every row above it down to the
      // spawn top is also reachable, matching the Delphi `CheckUp` scan.
      const landingRow = findLandingRow(board, rotated, column)
      if (landingRow === null) {
        continue
      }

      for (let row = landingRow; row >= topExtent; row -= 1) {
        const grid = baseGrid.map((gridRow) => gridRow.slice())
        for (const cell of getOccupiedCells(rotated, { row, column })) {
          grid[cell.row][cell.column] = true
        }

        const holesAfter = countHoles(grid, width, height)
        const delLines = countFullLines(grid, width, height)
        const priority =
          row +
          bankersRound((holesBefore - holesAfter) * HOLES_COEF) +
          delLines * delLines

        candidates.push({
          angle,
          column,
          row,
          priority,
          bottom: row + maxY,
          top: row - topExtent,
          touchesWall:
            column - leftExtent === 0 || column + maxX === width - 1,
        })
      }
    }
  }

  // Delphi visits candidates bottom-up by row, then left-to-right by column,
  // then by angle; sort to the same order so ties resolve identically.
  candidates.sort(
    (a, b) => b.row - a.row || a.column - b.column || a.angle - b.angle,
  )

  let best: DemoChoice | null = null
  for (const candidate of candidates) {
    if (
      best === null ||
      candidate.priority > best.priority ||
      (candidate.priority === best.priority &&
        preferCandidate(candidate, best))
    ) {
      best = candidate
    }
  }

  return best === null ? null : { angle: best.angle, column: best.column }
}
