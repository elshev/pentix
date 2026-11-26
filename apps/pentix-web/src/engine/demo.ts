/** Browser demo steering — replays the selected engine's per-piece action log. */
import {
  DEMO_ACTION_CODES,
  createDemoEngineInput,
  isDemoAction,
  type DemoAction,
  type DemoActionLog,
  type DemoEngine,
  type PentixGameSession,
} from '#pentix/core'

/**
 * Cached action log for one spawned piece. A destination depends only on the
 * board and the active piece's shape, so it is planned once when the piece
 * appears and replayed one action per interval until a new piece spawns.
 */
export interface DemoPlan {
  readonly sessionId: string
  readonly pieceIndex: number
  readonly actions: DemoActionLog
  readonly index: number
}

/**
 * Returns the cached `plan` while it still belongs to the session's current
 * piece, otherwise asks the engine for a fresh action log. `nextPieceIndex`
 * advances only when a new piece spawns, so the log stays stable while a piece
 * falls — which matters for engines that resolve ties randomly.
 */
export function resolveDemoPlan(
  plan: DemoPlan | null,
  session: PentixGameSession,
  engine: DemoEngine,
): DemoPlan {
  if (
    plan !== null &&
    plan.sessionId === session.id &&
    plan.pieceIndex === session.nextPieceIndex
  ) {
    return plan
  }

  const input = createDemoEngineInput(session)
  return {
    sessionId: session.id,
    pieceIndex: session.nextPieceIndex,
    actions: engine.plan(input.board, input.piece, input.position),
    index: 0,
  }
}

/**
 * The next action in the plan, or `null` when the log is exhausted. A character
 * outside the demo alphabet is treated as no action. The paired tick still runs.
 */
export function nextDemoAction(plan: DemoPlan): DemoAction | null {
  const code = plan.actions[plan.index]
  return code !== undefined && isDemoAction(code) ? code : null
}

/** Advances the plan past the action returned by `nextDemoAction`. */
export function advanceDemoPlan(plan: DemoPlan): DemoPlan {
  if (plan.index >= plan.actions.length) {
    return plan
  }
  return { ...plan, index: plan.index + 1 }
}

/** The two halves of the demo clock: one steering action or one gravity tick. */
export type DemoSlot = 'action' | 'tick'

/**
 * The slot that follows one steering step. A hard drop restarts the clock's
 * phase, exactly like the player's own drop restarts the gravity epoch: the next
 * slot is an action (the log's last-tick move, when it carries one) and the tick
 * that locks the dropped piece comes a full interval after the drop. The dropped
 * piece therefore rests visibly before the next piece appears, and its side-step
 * is never applied in the drop's own instant.
 */
export function nextDemoSlot(action: DemoAction | null): DemoSlot {
  return action === DEMO_ACTION_CODES.hardDrop ? 'action' : 'tick'
}
