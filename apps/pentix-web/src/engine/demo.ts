/** Browser demo steering — replays the selected engine's per-piece action log. */
import {
  DEMO_ACTION_CODES,
  createDemoEngineInput,
  isDemoAction,
  isDemoLastTickMove,
  type DemoAction,
  type DemoActionLog,
  type DemoEngine,
  type DemoLastTickMove,
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
 * outside the demo alphabet is treated as no action; the paired tick still runs.
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

/** One replayed step: the action, its post-drop side-step, and the rest of the log. */
export interface DemoStepPlan {
  readonly action: DemoAction | null
  readonly lastTickAction: DemoLastTickMove | null
  readonly plan: DemoPlan
}

/**
 * The next step of the plan. A hard drop consumes the code after it as the
 * piece's last-tick move, because the driver applies that side-step in the same
 * interval, after the drop and before the interval's tick. Any other code
 * consumes one position, and an exhausted or invalid log consumes nothing new.
 */
export function nextDemoStep(plan: DemoPlan): DemoStepPlan {
  const action = nextDemoAction(plan)
  let next = advanceDemoPlan(plan)

  if (action !== DEMO_ACTION_CODES.hardDrop) {
    return { action, lastTickAction: null, plan: next }
  }

  const followUp = nextDemoAction(next)
  next = advanceDemoPlan(next)
  return {
    action,
    lastTickAction:
      followUp !== null && isDemoLastTickMove(followUp) ? followUp : null,
    plan: next,
  }
}
