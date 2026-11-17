/** Auto-play hook for one small demo board, driven by that board's engine. */
import type { Dispatch } from 'react'

import { getDemoEngine } from '#pentix/core'

import type { DemoBoardState, GameAction } from '../../engine/gameReducer.ts'
import { useDemoStepper } from './useDemoController.ts'

/**
 * Advances one demo board on its own clock, at that board's level cadence and
 * with its own engine: a steering step at each interval's midpoint and a gravity
 * tick between them. A finished board stops stepping and keeps its final board
 * until the whole board set restarts.
 */
export function useDemoBoard(
  board: DemoBoardState,
  dispatch: Dispatch<GameAction>,
): void {
  useDemoStepper({
    boardId: board.id,
    engine: getDemoEngine(board.engineId),
    level: board.session.statistics.level,
    session: board.session,
    dispatch,
    active: board.session.status === 'active',
  })
}
