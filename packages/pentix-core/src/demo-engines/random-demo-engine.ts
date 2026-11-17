/**
 * The demonstration engine: plans a uniformly random reachable placement.
 *
 * It exists to exercise the demo-engine seam and to give the rail a second
 * baseline strategy. It deliberately implements no heuristic beyond picking a
 * reachable orientation and column at random, so it never plans a last-tick
 * move: its logs end at the hard drop.
 */
import {
  actionsToward,
  demoLandingRow,
} from '../demo-engine-toolkit.js'
import type {
  DemoActionLog,
  DemoBoard,
  DemoPiece,
  DemoPosition,
} from '../demo-engine-toolkit.js'

export const id = 'random'
export const name = 'Random'
export const description =
  'Picks a uniformly random reachable orientation and landing column for every piece.'

export function plan(
  board: DemoBoard,
  piece: DemoPiece,
  position: DemoPosition,
): DemoActionLog {
  const width = board[0]?.length ?? 0
  const destinations: { orientation: number; column: number }[] = []

  for (
    let orientation = 0;
    orientation < piece.length;
    orientation += 1
  ) {
    for (let column = 0; column < width; column += 1) {
      if (demoLandingRow(board, piece[orientation], column) !== null) {
        destinations.push({ orientation, column })
      }
    }
  }

  if (destinations.length === 0) {
    return ''
  }

  const picked =
    destinations[Math.floor(Math.random() * destinations.length)]
  return actionsToward(picked.orientation, position, picked.column)
}
