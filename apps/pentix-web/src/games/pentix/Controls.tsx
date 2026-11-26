/** On-screen buttons that dispatch game actions, including the level selector. */
import type { Dispatch } from 'react'

import type { GameAction, GamePhase } from '../../engine/gameReducer.ts'

interface ControlsProps {
  readonly phase: GamePhase
  /** Current session level, highlighted in the level selector. */
  readonly level: number
  readonly dispatch: Dispatch<GameAction>
}

const LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const

export function Controls({ phase, level, dispatch }: ControlsProps) {
  const playDisabled = phase !== 'playing'
  const pauseDisabled = phase !== 'playing' && phase !== 'paused'
  // During a player game the engine owns the level, so only raising it is
  // allowed. In the demo a level retunes the live session and on the game-over
  // screen it starts that level.
  const levelLocked = phase === 'playing' || phase === 'paused'

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
      <div className="controls__levels" role="group" aria-label="Level">
        {LEVELS.map((option) => (
          <button
            key={option}
            type="button"
            className={
              option === level
                ? 'level-button level-button--active'
                : 'level-button'
            }
            aria-label={`Level ${option}`}
            aria-pressed={option === level}
            disabled={levelLocked && option <= level}
            onClick={() => dispatch({ type: 'setStartingLevel', level: option })}
          >
            {option}
          </button>
        ))}
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
