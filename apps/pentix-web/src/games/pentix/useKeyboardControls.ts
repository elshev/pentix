import { useEffect } from 'react'
import type { Dispatch } from 'react'

import type { GameAction, GamePhase } from '../../engine/gameReducer.ts'
import { mapKeyToAction } from '../../engine/keyMap.ts'

export function useKeyboardControls(
  phase: GamePhase,
  dispatch: Dispatch<GameAction>,
): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const action = mapKeyToAction(event.key, phase)
      if (action === undefined) {
        return
      }
      event.preventDefault()
      dispatch(action)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [phase, dispatch])
}