/**
 * The demo action alphabet, the minimal planning input, and the geometry
 * helpers an engine needs.
 *
 * A demo engine plans from the visible board, the active piece's reachable
 * orientations (cells relative to the rotation point), and that rotation point.
 * It returns a `DemoActionLog`: the per-piece sequence of actions the demo
 * should replay. The alphabet is the one session action vocabulary without the
 * tick: ticks belong to the demo driver, which applies Action then Tick.
 *
 * A log may end with one code after its hard drop: that code is the piece's
 * last-tick move, a one-column side-step the driver applies after the drop and
 * before that interval's tick.
 */
import type { BoardSnapshot } from './board.js'
import { getActivePiece } from './placement.js'
import { getOccupiedOffsets, normalizeAngle } from './piece.js'
import type { Offset, RotationAngle, RotationMode } from './piece.js'
import { SESSION_ACTIONS, type SessionAction } from './session-log.js'
import type { PentixGameSession } from './session.js'

/** A single demo action code: any session action except the tick. */
export type DemoAction = Exclude<
  SessionAction,
  (typeof SESSION_ACTIONS)['tick']
>

/**
 * The one-column side-step a demo may take after its hard drop: the code that
 * follows `H` in a `DemoActionLog`.
 */
export type DemoLastTickMove =
  | (typeof DEMO_ACTION_CODES)['left']
  | (typeof DEMO_ACTION_CODES)['right']

/** The demo action codes, derived from the one session action vocabulary. */
export const DEMO_ACTION_CODES = Object.freeze({
  left: SESSION_ACTIONS.left,
  right: SESSION_ACTIONS.right,
  clockwise: SESSION_ACTIONS.clockwise,
  anticlockwise: SESSION_ACTIONS.anticlockwise,
  hardDrop: SESSION_ACTIONS.hardDrop,
} satisfies Record<string, DemoAction>)

/** A replayable sequence of demo actions for one piece. Never contains `T`. */
export type DemoActionLog = string

const DEMO_ACTION_VALUES: readonly string[] = Object.freeze(
  Object.values(DEMO_ACTION_CODES),
)

/** True when `code` is one of the demo's action codes. */
export function isDemoAction(code: string): code is DemoAction {
  return DEMO_ACTION_VALUES.includes(code)
}

/** True when `code` is a legal last-tick move (a one-column side-step). */
export function isDemoLastTickMove(code: string): code is DemoLastTickMove {
  return (
    code === DEMO_ACTION_CODES.left || code === DEMO_ACTION_CODES.right
  )
}

/** The visible board: one row per line, `1` occupied and `0` free. */
export type DemoBoard = readonly (readonly (0 | 1)[])[]

/** One cell of the active piece relative to the piece's rotation point. */
export interface DemoPieceCell {
  readonly row: number
  readonly column: number
}

/** One reachable orientation of the active piece, as cells around its point. */
export type DemoPieceOrientation = readonly DemoPieceCell[]

/**
 * The active piece's reachable orientations, in clockwise order: `[0]` is the
 * current orientation, one `C` selects `[1]`, and the last one wraps to `[0]`.
 * A piece that cannot rotate has exactly one orientation.
 */
export type DemoPiece = readonly DemoPieceOrientation[]

/** The active piece's rotation point on the board. */
export interface DemoPosition {
  readonly row: number
  readonly column: number
}

/** Everything a demo engine receives when it plans one piece. */
export interface DemoEngineInput {
  readonly board: DemoBoard
  readonly piece: DemoPiece
  readonly position: DemoPosition
}

/** A stable signature of an orientation, used to drop duplicate shapes. */
function orientationKey(cells: DemoPieceOrientation): string {
  return cells
    .map((cell) => `${cell.row},${cell.column}`)
    .sort()
    .join(';')
}

/** The piece geometry as planning cells, relative to the rotation point. */
export function demoOffsetCells(offsets: readonly Offset[]): DemoPieceCell[] {
  return offsets.map((offset) => ({ row: offset.y, column: offset.x }))
}

/** The visible board of a session snapshot, as rows of `0` and `1`. */
export function demoBoardOf(board: BoardSnapshot): DemoBoard {
  return board.rows.map((row) =>
    row.map((cell): 0 | 1 => (cell.isOccupied ? 1 : 0)),
  )
}

/**
 * Every distinct orientation the game reaches by repeatedly rotating clockwise,
 * current first. The game rotates by `-90` and normalizes for the piece mode, so
 * the sequence is derived from the game rule rather than a separate transform.
 */
function reachableOrientations(
  angle: RotationAngle,
  offsets: readonly Offset[],
  rotationMode: RotationMode,
): DemoPiece {
  const turns = rotationMode === 'none' ? 0 : rotationMode === 'half' ? 1 : 3
  const orientations: DemoPieceCell[][] = []
  const seen = new Set<string>()
  let currentAngle = angle

  for (let turn = 0; turn <= turns; turn += 1) {
    const cells = demoOffsetCells(
      getOccupiedOffsets(offsets, currentAngle, rotationMode),
    )
    const key = orientationKey(cells)
    if (!seen.has(key)) {
      seen.add(key)
      orientations.push(cells)
    }
    currentAngle = normalizeAngle(currentAngle - 90, rotationMode)
  }

  return orientations
}

/** Extracts the minimal planning input for a session's active piece. */
export function createDemoEngineInput(
  session: PentixGameSession,
): DemoEngineInput {
  const piece = getActivePiece(session)
  const { offsets, rotationMode } = piece.definition

  return {
    board: demoBoardOf(session.board),
    piece: reachableOrientations(
      session.activePiece.angle,
      offsets,
      rotationMode,
    ),
    position: {
      row: session.activePiece.origin.row,
      column: session.activePiece.origin.column,
    },
  }
}

/** The board row and column of every cell at `position`. */
export function demoPieceCells(
  cells: DemoPieceOrientation,
  position: DemoPosition,
): DemoPieceCell[] {
  return cells.map((cell) => ({
    row: position.row + cell.row,
    column: position.column + cell.column,
  }))
}

/**
 * True when every cell fits the board columns and the board height, and no
 * settled cell is occupied. Rows above the board are allowed: pieces enter from
 * the top.
 */
export function demoCanPlaceAt(
  board: DemoBoard,
  cells: DemoPieceOrientation,
  row: number,
  column: number,
): boolean {
  const width = board[0]?.length ?? 0
  const height = board.length

  for (const cell of cells) {
    const cellRow = row + cell.row
    const cellColumn = column + cell.column
    if (cellColumn < 0 || cellColumn >= width || cellRow >= height) {
      return false
    }
    if (cellRow >= 0 && board[cellRow][cellColumn] === 1) {
      return false
    }
  }

  return true
}

/**
 * True when every cell is inside the board columns and above the bottom, and no
 * settled cell is occupied. Rows above the board are allowed: pieces enter from
 * the top.
 */
export function demoCanPlace(
  board: DemoBoard,
  cells: DemoPieceOrientation,
  position: DemoPosition,
): boolean {
  return demoCanPlaceAt(board, cells, position.row, position.column)
}

/**
 * Finds where a piece with `cells` comes to rest when dropped from above in
 * `column`, or `null` when the column is blocked at the top.
 */
export function demoLandingRow(
  board: DemoBoard,
  cells: DemoPieceOrientation,
  column: number,
): number | null {
  if (cells.length === 0) {
    return null
  }

  let top = cells[0].row
  for (const cell of cells) {
    if (cell.row < top) {
      top = cell.row
    }
  }

  const start = -top
  if (!demoCanPlaceAt(board, cells, start, column)) {
    return null
  }

  let row = start
  while (demoCanPlaceAt(board, cells, row + 1, column)) {
    row += 1
  }

  return row
}

/**
 * The log that rotates the piece clockwise `orientation` times, moves its
 * rotation point to `column`, hard-drops it, and — when given — applies the
 * last-tick side-step after the drop.
 */
export function actionsToward(
  orientation: number,
  position: DemoPosition,
  column: number,
  lastTickMove: DemoLastTickMove | null = null,
): DemoActionLog {
  const delta = column - position.column
  const lateral = delta < 0 ? DEMO_ACTION_CODES.left : DEMO_ACTION_CODES.right

  return (
    DEMO_ACTION_CODES.clockwise.repeat(orientation) +
    lateral.repeat(Math.abs(delta)) +
    DEMO_ACTION_CODES.hardDrop +
    (lastTickMove ?? '')
  )
}
