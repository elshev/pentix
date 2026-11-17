/** Auto-play hooks: one combined gravity + steering step per interval, per board. */
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
  resolveDemoPlan,
  type DemoPlan,
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
 * Drives one board's auto-play by dispatching one step per gravity interval.
 * The reducer applies the gravity descent and this steering step together, so a
 * last-tick side-step can never be pre-empted by a separate gravity loop.
 *
 * The destination is planned once per spawned piece and reused across ticks, so
 * a randomly chosen tied destination does not flip while the piece falls. A
 * last-tick side-step re-targets the destination, and the step carries the
 * placement it was planned for so the reducer can drop stale steps.
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

    const interval = getTickInterval(level)
    const timer = window.setInterval(() => {
      const current = sessionRef.current
      const plan = resolveDemoPlan(planRef.current, current, engine)
      const action = nextDemoAction(plan)
      // The plan advances even past an exhausted log so the demo keeps ticking
      // until the piece locks.
      planRef.current = advanceDemoPlan(plan)

      dispatchRef.current(
        boardId === MAIN_BOARD_ID
          ? {
              type: 'demoStep',
              action,
              sessionId: current.id,
              pieceIndex: current.nextPieceIndex,
            }
          : {
              type: 'demoBoardStep',
              boardId,
              action,
              sessionId: current.id,
              pieceIndex: current.nextPieceIndex,
            },
      )
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

