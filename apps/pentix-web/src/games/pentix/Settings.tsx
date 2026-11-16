/** Player settings — rotation direction, next-piece toggle, and the key hint. */
import type { Dispatch } from 'react'

import type { GameAction, GameSettings } from '../../engine/gameReducer.ts'

interface SettingsProps {
  readonly settings: GameSettings
  readonly dispatch: Dispatch<GameAction>
}

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

      <p className="settings__hint">
        Keys: ←/→ or 7/9 move · ↑/Z/5/8 rotate · Space hard drop ·
        Q rotation direction · N next piece · +/- or 0-9 level · P pause ·
        R restart · Space after game over replays the demo
      </p>
    </div>
  )
}