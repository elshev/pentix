import {
  DEMO_ACTION_CODES,
  demoBoardOf,
  demoCanPlaceAt,
  demoLandingRow,
  demoOffsetCells,
  type DemoBoard,
  type DemoLastTickMove,
  type DemoPieceOrientation,
} from './demo-actions.js'
import { canPlace, getActivePiece, getOccupiedCells } from './placement.js'
import {
  getOccupiedOffsets,
  normalizeAngle,
  type RotationAngle,
  type RotationMode,
} from './piece.js'
import type { BoardPosition, PentixGameSession } from './session.js'

/**
 * Demo (attract-mode) auto-play. Ports the Delphi `CalcDemoDest` destination
 * heuristic so the browser demo imitates the classic client's self-play.
 *
 * `planDemoDestination` chooses where to steer the active piece and
 * `planDemoLastTickMove` chooses the side-step a resting piece takes instead of
 * locking when the neighbouring placement scores better. Both compare the
 * placement itself with its immediate side-steps, so a placement that is only
 * reachable on the last tick is planned like any other. The destination also
 * reports that side-step as a last-tick move, which is what a `plan` log
 * appends after its hard drop.
 */

/** The demo's chosen rotation angle and origin column. */
export interface DemoDestination {
  readonly angle: RotationAngle
  readonly column: number
  /** The side-step the piece takes after its hard drop, or `null`. */
  readonly lastTickMove: DemoLastTickMove | null
}

const HOLES_COEF = 1.5
const ALL_ANGLES = [0, 90, 180, 270] as const

interface PieceExtents {
  readonly minColumn: number
  readonly maxColumn: number
  readonly minRow: number
  readonly maxRow: number
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

/**
 * The visible board as a scratch grid, plus the per-column hole counts and the
 * already-full rows a score needs. A candidate writes its cells into the grid,
 * scores them, and clears them again, so no candidate copies the board.
 */
interface DemoGrid {
  readonly grid: boolean[][]
  readonly width: number
  readonly height: number
  readonly columnHoles: readonly number[]
  readonly fullRows: readonly boolean[]
}

function pieceExtents(cells: DemoPieceOrientation): PieceExtents {
  let minColumn = 0
  let maxColumn = 0
  let minRow = 0
  let maxRow = 0

  for (const cell of cells) {
    if (cell.column < minColumn) {
      minColumn = cell.column
    }
    if (cell.column > maxColumn) {
      maxColumn = cell.column
    }
    if (cell.row < minRow) {
      minRow = cell.row
    }
    if (cell.row > maxRow) {
      maxRow = cell.row
    }
  }

  return { minColumn, maxColumn, minRow, maxRow }
}

/** The scratch grid and the base-board facts a placement score needs. */
function createDemoGrid(board: DemoBoard): DemoGrid {
  const height = board.length
  const width = height > 0 ? board[0].length : 0
  const grid = board.map((row) => row.map((value) => value === 1))
  const columnHoles: number[] = new Array<number>(width).fill(0)

  for (let column = 0; column < width; column += 1) {
    let hasBlock = false
    let holes = 0
    for (let row = 0; row < height; row += 1) {
      if (grid[row][column]) {
        hasBlock = true
      } else if (hasBlock) {
        holes += 1
      }
    }
    columnHoles[column] = holes
  }

  return {
    grid,
    width,
    height,
    columnHoles,
    fullRows: grid.map((row) => row.every((occupied) => occupied)),
  }
}

/**
 * The rotation angles to try, normalized for the piece's rotation mode.
 */
function candidateAngles(rotationMode: RotationMode): RotationAngle[] {
  const angles = new Set<RotationAngle>()
  for (const raw of ALL_ANGLES) {
    angles.add(normalizeAngle(raw, rotationMode))
  }
  return [...angles]
}

/**
 * Walks `cells` straight down from `origin` and returns its resting origin, or
 * `null` when the piece cannot be placed at `origin` at all.
 */
function settle(
  board: DemoBoard,
  cells: DemoPieceOrientation,
  origin: BoardPosition,
): BoardPosition | null {
  if (!demoCanPlaceAt(board, cells, origin.row, origin.column)) {
    return null
  }

  let row = origin.row
  while (demoCanPlaceAt(board, cells, row + 1, origin.column)) {
    row += 1
  }

  return { row, column: origin.column }
}

/**
 * Counts the orthogonal contacts of `cells` at `origin` with settled minos and
 * the board walls. The piece cells are not yet written into the grid, so it
 * never counts the piece's own cells.
 */
function countContacts(
  demoGrid: DemoGrid,
  cells: DemoPieceOrientation,
  origin: BoardPosition,
): number {
  const { grid, width, height } = demoGrid
  let contacts = 0

  for (const cell of cells) {
    const row = origin.row + cell.row
    const column = origin.column + cell.column
    // Wall contact: a side wall, the floor, or the ceiling.
    contacts += row - 1 < 0 || grid[row - 1][column] ? 1 : 0
    contacts += row + 1 >= height || grid[row + 1][column] ? 1 : 0
    contacts += column - 1 < 0 || grid[row][column - 1] ? 1 : 0
    contacts += column + 1 >= width || grid[row][column + 1] ? 1 : 0
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
 * Scores one settled placement: `row + round((holesBefore − holesAfter) × 1.5) +
 * fullLines²`, plus the values the tie-breaks compare. Both demo planners score
 * through this helper so their candidates stay comparable.
 *
 * Only the columns the piece touches can change their hole count, and only the
 * rows it touches can become full, so the score is computed locally and the
 * piece cells are cleared from the shared grid afterwards.
 */
function scorePlacement(
  demoGrid: DemoGrid,
  cells: DemoPieceOrientation,
  origin: BoardPosition,
): PlacementScore {
  const { grid, width, height, columnHoles, fullRows } = demoGrid
  const { minColumn, maxColumn, minRow, maxRow } = pieceExtents(cells)
  // Contacts compare with the board without this piece, so count them first.
  const contacts = countContacts(demoGrid, cells, origin)

  const touchedColumns = new Set<number>()
  const touchedRows = new Set<number>()
  for (const cell of cells) {
    const row = origin.row + cell.row
    const column = origin.column + cell.column
    grid[row][column] = true
    touchedColumns.add(column)
    touchedRows.add(row)
  }

  let holesDelta = 0
  for (const column of touchedColumns) {
    let hasBlock = false
    let holes = 0
    for (let row = 0; row < height; row += 1) {
      if (grid[row][column]) {
        hasBlock = true
      } else if (hasBlock) {
        holes += 1
      }
    }
    holesDelta += holes - columnHoles[column]
  }

  let fullLines = 0
  for (const row of touchedRows) {
    if (grid[row].every((occupied) => occupied)) {
      fullLines += 1
    }
  }
  for (let row = 0; row < height; row += 1) {
    if (fullRows[row] && !touchedRows.has(row)) {
      fullLines += 1
    }
  }

  for (const cell of cells) {
    grid[origin.row + cell.row][origin.column + cell.column] = false
  }

  return {
    priority:
      origin.row + bankersRound(-holesDelta * HOLES_COEF) + fullLines * fullLines,
    bottom: origin.row + maxRow,
    top: origin.row + minRow,
    touchesWall:
      origin.column + minColumn === 0 ||
      origin.column + maxColumn === width - 1,
    contacts,
  }
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

/** A scored placement together with where the piece settles. */
interface SettledPlacement extends PlacementScore {
  readonly row: number
  readonly column: number
}

/**
 * Scores the placement of `cells` at `origin` after letting the piece fall as
 * far as it can. A placement that can still move down is therefore scored at its
 * further landing, which is what makes a side-step that keeps the piece falling
 * outrank a side-step that merely parks it.
 */
function scoreSettledPlacement(
  board: DemoBoard,
  demoGrid: DemoGrid,
  cells: DemoPieceOrientation,
  origin: BoardPosition,
): SettledPlacement | null {
  const landing = settle(board, cells, origin)
  if (landing === null) {
    return null
  }

  return { ...landing, ...scorePlacement(demoGrid, cells, landing) }
}

/** The one-column side-step that turns the drop column into the settled one. */
function lastTickMoveOf(choice: DemoChoice): DemoLastTickMove | null {
  if (!choice.shifted) {
    return null
  }
  if (choice.column > choice.landingColumn) {
    return DEMO_ACTION_CODES.right
  }
  if (choice.column < choice.landingColumn) {
    return DEMO_ACTION_CODES.left
  }
  return null
}


/** The chosen reachable orientation index and origin column. */
export interface DemoOrientationDestination {
  readonly orientation: number
  readonly column: number
  /** The side-step the piece takes after its hard drop, or `null`. */
  readonly lastTickMove: DemoLastTickMove | null
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
 * dropped in to reach the winning placement — the side-step itself travels back
 * in `lastTickMove` and is appended to the piece's action log after its drop.
 */
export function planDemoDestination(
  session: PentixGameSession,
): DemoDestination | null {
  const piece = getActivePiece(session)
  const angles = candidateAngles(piece.rotationMode)
  const orientations = angles.map((angle) =>
    demoOffsetCells(
      getOccupiedOffsets(piece.definition.offsets, angle, piece.rotationMode),
    ),
  )
  const destination = planDemoDestinationForOrientations(
    demoBoardOf(session.board),
    orientations,
  )

  return destination === null
    ? null
    : {
        angle: angles[destination.orientation],
        column: destination.column,
        lastTickMove: destination.lastTickMove,
      }
}

/**
 * The classic heuristic planned from a list of reachable orientations (current
 * first) instead of a session. Demo engines receive exactly that list, so the
 * `delphi5` engine plans through this entry point.
 */
export function planDemoDestinationForOrientations(
  board: DemoBoard,
  orientations: readonly DemoPieceOrientation[],
): DemoOrientationDestination | null {
  const demoGrid = createDemoGrid(board)
  const { width } = demoGrid
  const candidates: DemoChoice[] = []

  for (
    let orientation = 0;
    orientation < orientations.length;
    orientation += 1
  ) {
    const cells = orientations[orientation]
    const topExtent = -pieceExtents(cells).minRow

    for (let column = 0; column < width; column += 1) {
      // `demoLandingRow` returns null when the column's shaft is blocked at the
      // top, otherwise the lowest reachable row; every row above it down to the
      // spawn top is also reachable, matching the Delphi `CheckUp` scan.
      const landingRow = demoLandingRow(board, cells, column)
      if (landingRow === null) {
        continue
      }

      for (let row = landingRow; row >= topExtent; row -= 1) {
        const settled = scoreSettledPlacement(board, demoGrid, cells, {
          row,
          column,
        })
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
          const sideStep = scoreSettledPlacement(board, demoGrid, cells, {
            row,
            column: column + shift,
          })
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
    (a, b) =>
      b.row - a.row || a.column - b.column || a.orientation - b.orientation,
  )

  let best: DemoChoice | null = null
  for (const candidate of candidates) {
    if (best === null || preferCandidate(candidate, best)) {
      best = candidate
    }
  }

  return best === null
    ? null
    : {
        orientation: best.orientation,
        column: best.landingColumn,
        lastTickMove: lastTickMoveOf(best),
      }
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

  const board = demoBoardOf(session.board)
  const demoGrid = createDemoGrid(board)
  const piece = getActivePiece(session)
  const cells = demoOffsetCells(piece.occupiedOffsets)
  const origin = session.activePiece.origin
  const current = scoreSettledPlacement(board, demoGrid, cells, origin)
  if (current === null) {
    return null
  }

  let best: DemoChoice | null = null
  for (const shift of [-1, 1] as const) {
    const sideStep = scoreSettledPlacement(board, demoGrid, cells, {
      row: origin.row,
      column: origin.column + shift,
    })
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

  return { angle: piece.angle, column: best.landingColumn, lastTickMove: null }
}

