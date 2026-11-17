/** Auto-play hooks: one alternating tick/steering clock per board, half an interval each. */
import { useEffect, useRef } from 'react'
import type { Dispatch } from 'react'

import {
  getDemoEngine,
  type DemoEngine,
  type DemoEngineId,
  type PentixGameSession,
} from '#pentix/core'

import {
  advanceDemoPlan,
  nextDemoAction,
  nextDemoSlot,
  resolveDemoPlan,
  type DemoPlan,
  type DemoSlot,
} from '../../engine/demo.ts'
import { getTickInterval } from '../../engine/gameLoop.ts'
import { MAIN_BOARD_ID, type GameAction } from '../../engine/gameReducer.ts'

export interface DemoStepperOptions {
  /** Board the steps belong to: `MAIN_BOARD_ID` or a demo board id. */
  readonly boardId: string
  readonly engine: DemoEngine
  readonly level: number
  readonly session: PentixGameSession
  readonly dispatch: Dispatch<GameAction>
  readonly active: boolean
}

/**
 * Drives one board's auto-play from a single clock at half that board's gravity
 * interval. The clock alternates two board-addressed steps: a steering step that
 * applies one action from the engine's log, and a gravity step that applies one
 * tick. The action lands halfway between two ticks, so a piece is never moved and
 * descended in the same instant.
 *
 * A hard drop restarts the alternation the way the player's own drop restarts the
 * gravity epoch: the next step is the action again, so the log's last-tick move
 * lands halfway after the drop and the tick that locks the piece a full interval
 * after it. The dropped piece therefore rests visibly, and the next piece appears
 * a whole tick later.
 *
 * The destination is planned once per spawned piece and reused across steps, so a
 * randomly chosen tied destination does not flip while the piece falls. Each
 * steering step carries the session and piece it was planned for, so the reducer
 * can drop a step that arrived after the piece locked or the board was swapped.
 */
export function useDemoStepper({
  boardId,
  engine,
  level,
  session,
  dispatch,
  active,
}: DemoStepperOptions): void {
  const sessionRef = useRef(session)
  const dispatchRef = useRef(dispatch)
  const planRef = useRef<DemoPlan | null>(null)

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    dispatchRef.current = dispatch
  }, [dispatch])

  useEffect(() => {
    if (!active) {
      return
    }

    // Half an interval per slot. The clock starts on the action, so a piece that
    // already exists when the board mounts waits half an interval before it is
    // steered and a full interval before it descends. `nextDemoSlot` restarts the
    // alternation after a hard drop, so the dropped piece locks a full interval
    // later instead of at the next tick boundary half an interval away.
    const interval = getTickInterval(level) / 2
    let slot: DemoSlot = 'action'
    const timer = window.setInterval(() => {
      if (slot === 'tick') {
        slot = 'action'
        dispatchRef.current({ type: 'demoTick', boardId })
        return
      }

      const current = sessionRef.current
      const plan = resolveDemoPlan(planRef.current, current, engine)
      const action = nextDemoAction(plan)
      // The plan advances even past an exhausted log so the demo keeps ticking
      // until the piece locks.
      planRef.current = advanceDemoPlan(plan)
      slot = nextDemoSlot(action)

      dispatchRef.current({
        type: 'demoAction',
        boardId,
        action,
        sessionId: current.id,
        pieceIndex: current.nextPieceIndex,
      })
    }, interval)

    return () => window.clearInterval(timer)
  }, [active, level, boardId, engine])
}

/**
 * Drives the main board's attract demo with the engine its state holds. Passing
 * the engine id (instead of a module constant) lets a swapped demo board bring
 * its engine to the main board, and rebuilds the timer when it changes.
 */
export function useDemoController(
  active: boolean,
  level: number,
  session: PentixGameSession,
  engineId: DemoEngineId,
  dispatch: Dispatch<GameAction>,
): void {
  useDemoStepper({
    boardId: MAIN_BOARD_ID,
    engine: getDemoEngine(engineId),
    level,
    session,
    dispatch,
    active,
  })
}

