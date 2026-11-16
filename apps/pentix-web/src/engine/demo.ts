/** Browser demo steering — maps a demo engine's destination to a reducer action. */
import {
  DEFAULT_DEMO_ENGINE_ID,
  getDemoEngine,
  type DemoDestination,
  type DemoEngine,
  type DemoEngineId,
  type PentixGameSession,
} from '#pentix/core'

import type { DemoStepAction } from './gameReducer.ts'

/**
 * TEMPORARY: the attract demo on the main board runs the `random` engine so it
 * can be watched and compared against the classic `delphi5` heuristic while the
 * demo boards are evaluated. Set this back to `null` to let the demo use the
 * registry's default engine (`delphi5`) again.
 */
const DEMO_ENGINE_OVERRIDE: DemoEngineId | null = 'random'

/**
 * The engine driving the attract demo: the temporary override above, otherwise
 * the registry's default engine (`delphi5`).
 */
export const ACTIVE_DEMO_ENGINE_ID: DemoEngineId =
  DEMO_ENGINE_OVERRIDE ?? DEFAULT_DEMO_ENGINE_ID

/** The engine selected by `ACTIVE_DEMO_ENGINE_ID`. */
export const activeDemoEngine: DemoEngine = getDemoEngine(ACTIVE_DEMO_ENGINE_ID)

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
 * the placement it just chose instead of pulling back. Both operations come from
 * the supplied demo engine, which defaults to the active engine.
 */
export function resolveDemoPlan(
  plan: DemoPlan | null,
  session: PentixGameSession,
  engine: DemoEngine = activeDemoEngine,
): DemoPlan {
  if (
    plan !== null &&
    plan.sessionId === session.id &&
    plan.pieceIndex === session.nextPieceIndex
  ) {
    const destination = engine.planLastTickMove(session)
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
    destination: engine.planDestination(session),
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
): DemoStepAction {
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
  destination: DemoDestination | null = activeDemoEngine.planDestination(session),
): DemoStepAction | undefined {
  if (destination === null) {
    return undefined
  }
  return actionTowardDestination(session, destination)
}
