/** Auto-play hook for one small demo board, driven by that board's engine. */
import type { Dispatch } from 'react'

import { getDemoEngine } from '#pentix/core'

import type { DemoBoardState, GameAction } from '../../engine/gameReducer.ts'
import { useDemoStepper } from './useDemoController.ts'

/**
 * Advances one demo board on its own timer, at that board's level cadence, and
 * with its own engine. A finished board stops stepping and keeps its final
 * board until a new board set replaces it.
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
