/**
 * The classic Delphi 5 demo strategy expressed as a replayable action log.
 *
 * The strategy is unchanged: the destination still comes from the ported
 * `CalcDemoDest` heuristic, which now plans directly on the `0`/`1` board and the
 * piece's reachable orientations. The scan already scores the placements one
 * column to either side of a resting placement, so the planner reports the
 * winning side-step as a last-tick move and the log carries it after the hard
 * drop — that is how a piece reaches a pocket a straight drop cannot.
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

export const id = 'delphi5'
export const name = 'Delphi 5'
export const description =
  "The original Delphi 5 client's CalcDemoDest heuristic: prefers low placements, fewer holes, and more cleared lines."

export function plan(
  board: DemoBoard,
  piece: DemoPiece,
  position: DemoPosition,
): DemoActionLog {
  const destination = planDemoDestinationForOrientations(board, piece)
  if (destination === null) {
    return ''
  }

  return actionsToward(
    destination.orientation,
    position,
    destination.column,
    destination.lastTickMove,
  )
}
