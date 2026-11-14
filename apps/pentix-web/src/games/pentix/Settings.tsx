/** Player settings — rotation direction, next-piece toggle, and starting level. */
import type { Dispatch } from 'react'

import type { GameAction, GameSettings } from '../../engine/gameReducer.ts'

interface SettingsProps {
  readonly settings: GameSettings
  readonly dispatch: Dispatch<GameAction>
}

const LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const

export function Settings({ settings, dispatch }: SettingsProps) {
  const directionLabel =
    settings.rotateDirection === 'clockwise' ? 'clockwise' : 'anticlockwise'

  return (
    <div className="settings" aria-label="Game settings">
      <div className="settings__row">
        <button
          type="button"
          className="control-button control-button--wide"
          onClick={() => dispatch({ type: 'toggleRotateDirection' })}
        >
          Rotation: {directionLabel}
        </button>
        <button
          type="button"
          className="control-button control-button--wide"
          onClick={() => dispatch({ type: 'toggleNextPiece' })}
        >
          Next piece: {settings.showNextPiece ? 'on' : 'off'}
        </button>
      </div>

      <div className="settings__levels">
        <div className="settings__levels-header">
          <span className="settings__label">Start level: {settings.startingLevel}</span>
          <button
            type="button"
            className="control-button"
            onClick={() => dispatch({ type: 'increaseLevel' })}
          >
            ▲ level
          </button>
        </div>
        <div className="settings__level-grid">
          {LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              className={
                settings.startingLevel === level
                  ? 'level-button level-button--active'
                  : 'level-button'
              }
              onClick={() => dispatch({ type: 'setStartingLevel', level })}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <p className="settings__hint">
        Keys: ←/→ or 7/9 move · ↑/Z/5/8 rotate · ↓ soft drop · Space hard drop ·
        Q rotation direction · N next piece · +/- level · 0-9 start level · P
        pause · R restart · Space after game over replays the demo
      </p>
    </div>
  )
}