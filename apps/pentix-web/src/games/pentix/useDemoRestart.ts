/** One-shot timer that restarts the attract demo after its post-game-over delay. */
import { useEffect } from 'react'
import type { Dispatch } from 'react'

import {
  GAME_OVER_COOLDOWN_MS,
  type GameAction,
} from '../../engine/gameReducer.ts'

/**
 * Waits out the same delay a player game over uses while `active` is true, then
 * dispatches `demoRestart` so the attract demo starts a fresh session.
 */
export function useDemoRestart(
  active: boolean,
  dispatch: Dispatch<GameAction>,
): void {
  useEffect(() => {
    if (!active) {
      return
    }

    const timer = window.setTimeout(() => {
      dispatch({ type: 'demoRestart' })
    }, GAME_OVER_COOLDOWN_MS)

    return () => window.clearTimeout(timer)
  }, [active, dispatch])
}
