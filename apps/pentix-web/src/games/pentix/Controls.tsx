/** On-screen buttons that dispatch game actions. */
import type { Dispatch } from 'react'

import type { GameAction, GamePhase } from '../../engine/gameReducer.ts'

interface ControlsProps {
  readonly phase: GamePhase
  readonly dispatch: Dispatch<GameAction>
}

export function Controls({ phase, dispatch }: ControlsProps) {
  const playDisabled = phase !== 'playing'
  const pauseDisabled = phase !== 'playing' && phase !== 'paused'

  return (
    <div className="controls" aria-label="Game controls">
      <div className="controls__row">
        <button
          type="button"
          className="control-button"
          onClick={() => dispatch({ type: 'move', direction: 'left' })}
          disabled={playDisabled}
        >
          ◀
        </button>
        <button
          type="button"
          className="control-button control-button--wide"
          onClick={() => dispatch({ type: 'rotate' })}
          disabled={playDisabled}
        >
          ⟳ Rotate
        </button>
        <button
          type="button"
          className="control-button"
          onClick={() => dispatch({ type: 'move', direction: 'right' })}
          disabled={playDisabled}
        >
          ▶
        </button>
      </div>
      <div className="controls__row">
        <button
          type="button"
          className="control-button control-button--wide"
          onClick={() => dispatch({ type: 'drop' })}
          disabled={playDisabled}
        >
          Hard drop
        </button>
      </div>
      <div className="controls__row">
        <button
          type="button"
          className="control-button control-button--wide"
          onClick={() => dispatch({ type: 'togglePause' })}
          disabled={pauseDisabled}
        >
          {phase === 'paused' ? 'Resume' : 'Pause'}
        </button>
        <button
          type="button"
          className="control-button control-button--wide"
          onClick={() => dispatch({ type: 'restart' })}
        >
          Restart
        </button>
      </div>
    </div>
  )
}