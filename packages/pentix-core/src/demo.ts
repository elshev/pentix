import type { BoardSnapshot } from './board.js'
import {
  getOccupiedOffsets,
  normalizeAngle,
  type Offset,
  type RotationAngle,
  type RotationMode,
} from './piece.js'
import { canPlace, getActivePiece, getOccupiedCells } from './placement.js'
import type { BoardPosition, PentixGameSession } from './session.js'

/**
 * Demo (attract-mode) auto-play. Ports the Delphi `CalcDemoDest` destination
 * heuristic so the browser demo imitates the classic client's self-play.
 * `planDemoDestination` chooses where to steer the active piece, and
 * `planDemoLastTickMove` chooses the side-step a resting piece takes instead of
 * locking when the neighbouring placement scores better. Both compare the
 * placement itself with its immediate side-steps, so a placement that is only
 * reachable on the last tick is planned like any other.
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

interface DemoChoice extends PlacementScore {
  /** Index of the reachable orientation this choice scores. */
  readonly orientation: number
  /** Column of the settled placement this choice scores. */
  readonly column: number
  /** Settled row of the placement this choice scores. */
  readonly row: number
  /** Column the demo steers to before the placement settles. */
  readonly landingColumn: number
  /** True when the settled placement is reached by a last-tick side-step. */
  readonly shifted: boolean
}

/** The scored facts about a settled placement that the planner ranks. */
interface PlacementScore {
  readonly priority: number
  readonly bottom: number
  readonly top: number
  readonly touchesWall: boolean
  readonly contacts: number
}

function pieceExtents(offsets: readonly Offset[]): PieceExtents {
  let minX = 0
  let maxX = 0
  let minY = 0
  let maxY = 0

  for (const offset of offsets) {
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

/** The board cells occupied by `offsets` anchored at `origin`. */
function cellsAt(
  offsets: readonly Offset[],
  origin: BoardPosition,
): BoardPosition[] {
  return offsets.map((offset) => ({
    row: origin.row + offset.y,
    column: origin.column + offset.x,
  }))
}

/** The rotation angles to try, normalized for the piece's rotation mode. */
export function candidateAngles(rotationMode: RotationMode): RotationAngle[] {
  const angles = new Set<RotationAngle>()
  for (const raw of ALL_ANGLES) {
    angles.add(normalizeAngle(raw, rotationMode))
  }
  return [...angles]
}

/**
 * Walks a piece straight down from `origin` and returns its landing origin, or
 * `null` when the piece cannot be placed at `origin` at all.
 */
function descend(
  board: BoardSnapshot,
  offsets: readonly Offset[],
  origin: BoardPosition,
): BoardPosition | null {
  if (!canPlace(board, cellsAt(offsets, origin))) {
    return null
  }

  let row = origin.row
  while (
    canPlace(board, cellsAt(offsets, { row: row + 1, column: origin.column }))
  ) {
    row += 1
  }

  return { row, column: origin.column }
}

/**
 * Finds where a piece dropped straight down in `column` comes to rest, or
 * `null` when the column's shaft is blocked at the top so the piece can never
 * reach it.
 */
export function findLandingRow(
  board: BoardSnapshot,
  offsets: readonly Offset[],
  column: number,
): number | null {
  const { minY } = pieceExtents(offsets)
  const landing = descend(board, offsets, { row: -minY, column })
  return landing === null ? null : landing.row
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

const NEIGHBOR_OFFSETS = [
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
] as const

function countContacts(
  baseGrid: readonly (readonly boolean[])[],
  width: number,
  height: number,
  cells: readonly { readonly row: number; readonly column: number }[],
): number {
  let contacts = 0
  for (const cell of cells) {
    for (const { dx, dy } of NEIGHBOR_OFFSETS) {
      const row = cell.row + dy
      const column = cell.column + dx
      if (row < 0 || row >= height || column < 0 || column >= width) {
        // Wall contact: a side wall, the floor, or the ceiling.
        contacts += 1
      } else if (baseGrid[row][column]) {
        // Mino contact: touches an already-settled mino.
        contacts += 1
      }
    }
  }
  return contacts
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

/**
 * The tie-break chain shared by both planners: a lower bottom, then a lower top,
 * then more contacts, then a placement that does not touch a side wall. Returns
 * `null` when the two placements are indistinguishable on every criterion.
 */
function placementTieBreak(
  candidate: PlacementScore,
  other: PlacementScore,
): boolean | null {
  if (candidate.bottom !== other.bottom) {
    return candidate.bottom > other.bottom
  }
  if (candidate.top !== other.top) {
    return candidate.top > other.top
  }
  if (candidate.contacts !== other.contacts) {
    return candidate.contacts > other.contacts
  }
  if (candidate.touchesWall !== other.touchesWall) {
    return !candidate.touchesWall
  }
  return null
}

/** True when `candidate` is strictly better than `current` on the shared ordering. */
function isBetterPlacement(
  candidate: DemoChoice,
  current: PlacementScore,
): boolean {
  if (candidate.priority !== current.priority) {
    return candidate.priority > current.priority
  }
  return placementTieBreak(candidate, current) === true
}

function preferCandidate(candidate: DemoChoice, best: DemoChoice): boolean {
  if (candidate.priority !== best.priority) {
    return candidate.priority > best.priority
  }
  const tie = placementTieBreak(candidate, best)
  if (tie !== null) {
    return tie
  }
  if (candidate.shifted !== best.shifted) {
    // Between otherwise equal placements, prefer the one the demo reaches
    // without spending a last-tick side-step.
    return !candidate.shifted
  }
  return Math.random() < 0.5
}

/**
 * Scores one settled placement: `row + round((holesBefore − holesAfter) × 1.5) +
 * fullLines²`, plus the values the tie-breaks compare. Both demo planners score
 * through this helper so their candidates stay comparable.
 */
function scorePlacement(
  baseGrid: readonly (readonly boolean[])[],
  width: number,
  height: number,
  holesBefore: number,
  offsets: readonly Offset[],
  origin: BoardPosition,
): PlacementScore {
  const { minX, maxX, minY, maxY } = pieceExtents(offsets)
  const cells = cellsAt(offsets, origin)
  const grid = baseGrid.map((gridRow) => gridRow.slice())
  for (const cell of cells) {
    grid[cell.row][cell.column] = true
  }

  const holesAfter = countHoles(grid, width, height)
  const delLines = countFullLines(grid, width, height)

  return {
    priority:
      origin.row +
      bankersRound((holesBefore - holesAfter) * HOLES_COEF) +
      delLines * delLines,
    bottom: origin.row + maxY,
    top: origin.row + minY,
    touchesWall:
      origin.column + minX === 0 || origin.column + maxX === width - 1,
    contacts: countContacts(baseGrid, width, height, cells),
  }
}

/** A scored placement together with where the piece settles. */
interface SettledPlacement extends PlacementScore {
  readonly row: number
  readonly column: number
}

/**
 * Scores the placement of `piece` at `origin` after letting it fall as far as it
 * can. A placement that can still move down is therefore scored at its further
 * landing, which is what makes a side-step that keeps the piece falling outrank a
 * side-step that merely parks it.
 */
function scoreSettledPlacement(
  board: BoardSnapshot,
  baseGrid: readonly (readonly boolean[])[],
  width: number,
  height: number,
  holesBefore: number,
  offsets: readonly Offset[],
  origin: BoardPosition,
): SettledPlacement | null {
  const landing = descend(board, offsets, origin)
  if (landing === null) {
    return null
  }

  return {
    row: landing.row,
    column: landing.column,
    ...scorePlacement(baseGrid, width, height, holesBefore, offsets, landing),
  }
}

/**
 * Chooses the demo's target rotation angle and column for the active piece.
 *
 * This is a faithful port of the Delphi `CalcDemoDest` heuristic. It follows
 * Delphi's bottom-up scan: for every valid orientation, origin column, and
 * reachable origin row (a row the piece can fall into from the top), it scores
 * `row + round((holesBefore − holesAfter) × 1.5) + fullLines²` and selects the
 * maximum. Remaining ties prefer a lower bottom, then a lower top, then more
 * contacts with settled minos or the board walls, then placements that do not
 * touch a side wall. Candidates that remain indistinguishable are chosen at
 * random.
 *
 * Every candidate at a column's resting row is additionally compared with the
 * placements one column to its left and right, because the demo can side-step
 * there on its last tick. The destination is then the column the piece must be
 * dropped in to reach the winning placement — the side-step itself is executed by
 * `planDemoLastTickMove` once the piece comes to rest.
 */
export function planDemoDestination(
  session: PentixGameSession,
): DemoDestination | null {
  const piece = getActivePiece(session)
  const angles = candidateAngles(piece.rotationMode)
  const orientations = angles.map((angle) =>
    getOccupiedOffsets(piece.definition.offsets, angle, piece.rotationMode),
  )
  const destination = planDemoDestinationForOrientations(
    session.board,
    orientations,
  )

  return destination === null
    ? null
    : { angle: angles[destination.orientation], column: destination.column }
}

/** The chosen reachable orientation index and origin column. */
export interface DemoOrientationDestination {
  readonly orientation: number
  readonly column: number
}

/**
 * The classic heuristic planned from a list of reachable orientations (current
 * first) instead of a session. Demo engines receive exactly that list, so the
 * `delphi5` engine plans through this entry point.
 */
export function planDemoDestinationForOrientations(
  board: BoardSnapshot,
  orientations: readonly (readonly Offset[])[],
): DemoOrientationDestination | null {
  const { width, height } = board
  const baseGrid = board.rows.map((row) => row.map((cell) => cell.isOccupied))
  const holesBefore = countHoles(baseGrid, width, height)

  const candidates: DemoChoice[] = []

  for (
    let orientation = 0;
    orientation < orientations.length;
    orientation += 1
  ) {
    const rotated = orientations[orientation]
    const topExtent = -pieceExtents(rotated).minY

    for (let column = 0; column < width; column += 1) {
      // `findLandingRow` returns null when the column's shaft is blocked at the
      // top, otherwise the lowest reachable row; every row above it down to the
      // spawn top is also reachable, matching the Delphi `CheckUp` scan.
      const landingRow = findLandingRow(board, rotated, column)
      if (landingRow === null) {
        continue
      }

      for (let row = landingRow; row >= topExtent; row -= 1) {
        const settled = scoreSettledPlacement(
          board,
          baseGrid,
          width,
          height,
          holesBefore,
          rotated,
          { row, column },
        )
        if (settled === null) {
          continue
        }

        candidates.push({
          orientation,
          landingColumn: column,
          shifted: false,
          ...settled,
        })

        if (row !== landingRow) {
          // Only a resting placement can be side-stepped on the last tick.
          continue
        }

        for (const shift of [-1, 1] as const) {
          const sideStep = scoreSettledPlacement(
            board,
            baseGrid,
            width,
            height,
            holesBefore,
            rotated,
            { row, column: column + shift },
          )
          if (sideStep === null) {
            continue
          }

          candidates.push({
            orientation,
            landingColumn: column,
            shifted: true,
            ...sideStep,
          })
        }
      }
    }
  }

  // Iterate in a stable order (bottom-up by row, then left-to-right by column,
  // then by orientation); indistinguishable tied candidates are picked at random.
  candidates.sort(
    (a, b) => b.row - a.row || a.column - b.column || a.orientation - b.orientation,
  )

  let best: DemoChoice | null = null
  for (const candidate of candidates) {
    if (best === null || preferCandidate(candidate, best)) {
      best = candidate
    }
  }

  return best === null
    ? null
    : { orientation: best.orientation, column: best.landingColumn }
}

/**
 * True while the active demo piece can still be placed one row lower, i.e. it is
 * not yet resting on its last tick before locking.
 */
export function canDemoPieceMoveDown(session: PentixGameSession): boolean {
  const piece = getActivePiece(session)
  const { row, column } = session.activePiece.origin
  return canPlace(session.board, getOccupiedCells(piece, { row: row + 1, column }))
}

/**
 * Chooses the demo's "last tick move": the side-step the demo takes instead of
 * locking when the active piece can no longer move down.
 *
 * The demo may only shift one column on that tick, so the piece's resting
 * placement is compared with the placements one column left and one column right
 * at the same row. A side-step that keeps the piece falling is scored at its
 * further landing, so it is prioritized over one that merely parks the piece. The
 * better placement is taken only when it beats the resting placement on the shared
 * ordering (score, then the deterministic tie-breaks); an indistinguishable
 * side-step is not taken, which keeps the demo from shuffling back and forth.
 * The returned destination is the side-step column, so the ordinary steering
 * dispatches exactly that one step.
 */
export function planDemoLastTickMove(
  session: PentixGameSession,
): DemoDestination | null {
  if (canDemoPieceMoveDown(session)) {
    return null
  }

  const { board } = session
  const { width, height } = board
  const baseGrid = board.rows.map((row) => row.map((cell) => cell.isOccupied))
  const holesBefore = countHoles(baseGrid, width, height)

  const piece = getActivePiece(session)
  const offsets = piece.occupiedOffsets
  const origin = session.activePiece.origin
  const current = scoreSettledPlacement(
    board,
    baseGrid,
    width,
    height,
    holesBefore,
    offsets,
    origin,
  )
  if (current === null) {
    return null
  }

  let best: DemoChoice | null = null
  for (const shift of [-1, 1] as const) {
    const sideStep = scoreSettledPlacement(
      board,
      baseGrid,
      width,
      height,
      holesBefore,
      offsets,
      { row: origin.row, column: origin.column + shift },
    )
    if (sideStep === null) {
      continue
    }

    const candidate: DemoChoice = {
      // The last-tick move keeps the current orientation; the index only
      // orders candidates inside the destination planner.
      orientation: 0,
      landingColumn: origin.column + shift,
      shifted: true,
      ...sideStep,
    }
    if (best === null || preferCandidate(candidate, best)) {
      best = candidate
    }
  }

  if (best === null || !isBetterPlacement(best, current)) {
    return null
  }

  return { angle: piece.angle, column: best.landingColumn }
}

