/** Auto-play hooks: one combined gravity + steering step per interval, per board. */
import { useEffect, useRef } from 'react'
import type { Dispatch } from 'react'

import type { DemoEngine, PentixGameSession } from '#pentix/core'

import {
  activeDemoEngine,
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
      planRef.current = plan

      const action = nextDemoAction(current, plan.destination)
      if (action === undefined) {
        return
      }

      const step = {
        action,
        sessionId: current.id,
        pieceIndex: current.nextPieceIndex,
        angle: current.activePiece.angle,
        column: current.activePiece.origin.column,
      }
      dispatchRef.current(
        boardId === MAIN_BOARD_ID
          ? { type: 'demoStep', ...step }
          : { type: 'demoBoardStep', boardId, ...step },
      )
    }, interval)

    return () => window.clearInterval(timer)
  }, [active, level, boardId, engine])
}

/** Drives the main board's attract demo with the active demo engine. */
export function useDemoController(
  active: boolean,
  level: number,
  session: PentixGameSession,
  dispatch: Dispatch<GameAction>,
): void {
  useDemoStepper({
    boardId: MAIN_BOARD_ID,
    engine: activeDemoEngine,
    level,
    session,
    dispatch,
    active,
  })
}

