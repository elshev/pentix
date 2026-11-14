/** Attract-mode hook that steers the demo one action per gravity tick. */
import { useEffect, useRef } from 'react'
import type { Dispatch } from 'react'

import type { PentixGameSession } from '#pentix/core'

import { nextDemoAction } from '../../engine/demo.ts'
import { getTickInterval } from '../../engine/gameLoop.ts'
import type { GameAction } from '../../engine/gameReducer.ts'

/**
 * Drives the attract demo by issuing one steering action per gravity interval.
 * This mirrors the Delphi `TimerExpired` demo branch, which steers a single step
 * toward the destination on each tick.
 */
export function useDemoController(
  active: boolean,
  level: number,
  session: PentixGameSession,
  dispatch: Dispatch<GameAction>,
): void {
  const sessionRef = useRef(session)
  const dispatchRef = useRef(dispatch)

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
      const action = nextDemoAction(sessionRef.current)
      if (action !== undefined) {
        dispatchRef.current(action)
      }
    }, interval)

    return () => window.clearInterval(timer)
  }, [active, level])
}
