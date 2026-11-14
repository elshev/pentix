/** Browser demo steering — maps the planner destination to a reducer action. */
import {
  planDemoDestination,
  type DemoDestination,
  type PentixGameSession,
} from '#pentix/core'

import type { GameAction } from './gameReducer.ts'

/**
 * Picks the next demo action toward a destination, mirroring the Delphi
 * `TimerExpired` demo branch: rotate first, then move laterally, then hard-drop
 * once the angle and column match.
 */
export function actionTowardDestination(
  session: PentixGameSession,
  destination: DemoDestination,
): GameAction {
  if (session.activePiece.angle !== destination.angle) {
    return { type: 'rotate' }
  }

  const column = session.activePiece.origin.column
  if (column > destination.column) {
    return { type: 'move', direction: 'left' }
  }
  if (column < destination.column) {
    return { type: 'move', direction: 'right' }
  }

  return { type: 'drop' }
}

/**
 * Computes the next action the attract demo should take for the current piece,
 * or `undefined` when the planner finds no reachable placement.
 */
export function nextDemoAction(
  session: PentixGameSession,
): GameAction | undefined {
  const destination = planDemoDestination(session)
  if (destination === null) {
    return undefined
  }
  return actionTowardDestination(session, destination)
}
