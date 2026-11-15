/** One-shot timer that re-arms the game-over overlay after its cooldown. */
import { useEffect } from 'react'
import type { Dispatch } from 'react'

import {
  GAME_OVER_COOLDOWN_MS,
  type GameAction,
} from '../../engine/gameReducer.ts'

/**
 * Waits out the game-over cooldown while `active` is true, then dispatches
 * `gameOverCooldownElapsed` so the overlay's buttons and the start/demo
 * hotkeys stop being ignored.
 */
export function useGameOverCooldown(
  active: boolean,
  dispatch: Dispatch<GameAction>,
): void {
  useEffect(() => {
    if (!active) {
      return
    }

    const timer = window.setTimeout(() => {
      dispatch({ type: 'gameOverCooldownElapsed' })
    }, GAME_OVER_COOLDOWN_MS)

    return () => window.clearTimeout(timer)
  }, [active, dispatch])
}
