/** One-shot timer that restarts the attract demo after its post-game-over delay. */
import { useEffect } from 'react'
import type { Dispatch } from 'react'

import {
  GAME_OVER_COOLDOWN_MS,
  type GameAction,
} from '../../engine/gameReducer.ts'

/**
 * Waits out the same delay a player game over uses while `active` is true, then
 * dispatches `demoRestart` so the attract demo starts a fresh board set. The
 * caller arms it only while the whole board set is over, so the main panel keeps
 * its finished demo until the rail's last board ends.
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
