/** Attract-mode hook that steers the demo one action per gravity tick. */
import { useEffect, useRef } from 'react'
import type { Dispatch } from 'react'

import type { PentixGameSession } from '#pentix/core'

import {
  nextDemoAction,
  resolveDemoPlan,
  type DemoPlan,
} from '../../engine/demo.ts'
import { getTickInterval } from '../../engine/gameLoop.ts'
import type { GameAction } from '../../engine/gameReducer.ts'

/**
 * Drives the attract demo by issuing one steering action per gravity interval.
 * The destination is planned once per spawned piece and reused across ticks, so
 * a randomly chosen tied destination does not flip while the piece falls.
 */
export function useDemoController(
  active: boolean,
  level: number,
  session: PentixGameSession,
  dispatch: Dispatch<GameAction>,
): void {
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
      const plan = resolveDemoPlan(planRef.current, current)
      planRef.current = plan

      const action = nextDemoAction(current, plan.destination)
      if (action !== undefined) {
        dispatchRef.current({
          type: 'demoAction',
          action,
          sessionId: current.id,
          pieceIndex: current.nextPieceIndex,
        })
      }
    }, interval)

    return () => window.clearInterval(timer)
  }, [active, level])
}
