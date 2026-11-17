/**
 * The classic Delphi 5 demo strategy expressed as a replayable action log.
 *
 * The strategy is unchanged: the destination still comes from the ported
 * `CalcDemoDest` heuristic. Only its input changed — the engine receives the
 * board as 0/1 rows and the piece as cells around its rotation point — so the
 * destination is converted into rotations, lateral moves, and a hard drop.
 */
import {
  actionsToward,
  planDemoDestinationForOrientations,
} from '../demo-engine-toolkit.js'
import type {
  DemoActionLog,
  DemoBoard,
  DemoPiece,
  DemoPosition,
} from '../demo-engine-toolkit.js'
import type { BoardSnapshot } from '../board.js'

export const id = 'delphi5'
export const name = 'Delphi 5'
export const description =
  "The original Delphi 5 client's CalcDemoDest heuristic: prefers low placements, fewer holes, and more cleared lines."

/** Converts the minimal 0/1 board into the planner's cell snapshot. */
function boardSnapshotOf(board: DemoBoard): BoardSnapshot {
  return {
    width: board[0]?.length ?? 0,
    height: board.length,
    rows: board.map((row, rowIndex) =>
      row.map((value, column) => ({
        row: rowIndex,
        column,
        isOccupied: value === 1,
      })),
    ),
  }
}

export function plan(
  board: DemoBoard,
  piece: DemoPiece,
  position: DemoPosition,
): DemoActionLog {
  const destination = planDemoDestinationForOrientations(
    boardSnapshotOf(board),
    piece.map((orientation) =>
      orientation.map((cell) => ({ x: cell.column, y: cell.row })),
    ),
  )
  if (destination === null) {
    return ''
  }

  return actionsToward(destination.orientation, position, destination.column)
}
