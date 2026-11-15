/** Browser demo steering — maps the planner destination to a reducer action. */
import {
  planDemoDestination,
  planDemoLastTickMove,
  type DemoDestination,
  type PentixGameSession,
} from '#pentix/core'

import type { GameAction } from './gameReducer.ts'

/**
 * Cached demo plan for one spawned piece. A destination depends only on the
 * board and the active piece's shape, so it is planned once when the piece
 * appears and reused for every steering step until a new piece spawns — or
 * until the piece takes a last-tick side-step.
 */
export interface DemoPlan {
  readonly sessionId: string
  readonly pieceIndex: number
  readonly destination: DemoDestination | null
}

/**
 * Returns the cached `plan` while it still belongs to the session's current
 * piece, otherwise plans a fresh destination. `nextPieceIndex` advances only
 * when a new piece spawns, so this keeps the destination stable while a piece
 * falls — which matters now that tied destinations are resolved randomly.
 *
 * A resting piece that can still take a better side-step (the "last tick move")
 * re-targets the cached destination to that step, so the demo keeps steering into
 * the placement it just chose instead of pulling back.
 */
export function resolveDemoPlan(
  plan: DemoPlan | null,
  session: PentixGameSession,
): DemoPlan {
  if (
    plan !== null &&
    plan.sessionId === session.id &&
    plan.pieceIndex === session.nextPieceIndex
  ) {
    const destination = planDemoLastTickMove(session)
    if (destination === null) {
      return plan
    }
    return {
      sessionId: plan.sessionId,
      pieceIndex: plan.pieceIndex,
      destination,
    }
  }

  return {
    sessionId: session.id,
    pieceIndex: session.nextPieceIndex,
    destination: planDemoDestination(session),
  }
}

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
 * or `undefined` when there is no destination. Passing the cached destination
 * (see `resolveDemoPlan`) avoids re-planning on every steering step.
 */
export function nextDemoAction(
  session: PentixGameSession,
  destination: DemoDestination | null = planDemoDestination(session),
): GameAction | undefined {
  if (destination === null) {
    return undefined
  }
  return actionTowardDestination(session, destination)
}
