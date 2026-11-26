/** Pure keyboard-key-to-action mapping per game phase (framework-free). */
import type { GameAction, GamePhase } from './gameReducer.ts'

const DIGIT_PATTERN = /^[0-9]$/

/**
 * Maps a keyboard event `key` plus the current phase to a game action.
 * Pure and framework-free so it can be unit tested without React.
 */
export function mapKeyToAction(
  key: string,
  phase: GamePhase,
): GameAction | undefined {
  const canStart =
    phase === 'demo' || phase === 'demo-over' || phase === 'game-over'
  const playing = phase === 'playing'

  if (key === 'Enter' && canStart) {
    return { type: 'start' }
  }

  // Space starts a player game from the demo, asks for the next demo from a
  // finished one, re-enters the demo after a game over, and hard-drops while
  // playing. A finished demo otherwise waits for the whole board set to end, so
  // Space is the way to skip straight to the next cycle.
  if (key === ' ' || key === 'Spacebar') {
    if (phase === 'demo') {
      return { type: 'start' }
    }
    if (phase === 'demo-over' || phase === 'game-over') {
      return { type: 'demo' }
    }
  }

  // Digits pick the starting level before a game. While playing, numeric keys
  // drive movement (7 left, 9 right) and rotation (5 or 8).
  if (DIGIT_PATTERN.test(key)) {
    if (!playing) {
      return { type: 'setStartingLevel', level: Number(key) }
    }
    switch (key) {
      case '5':
      case '8':
        return { type: 'rotate' }
      case '7':
        return { type: 'move', direction: 'left' }
      case '9':
        return { type: 'move', direction: 'right' }
      default:
        return undefined
    }
  }

  switch (key) {
    case 'ArrowLeft':
      return { type: 'move', direction: 'left' }
    case 'ArrowRight':
      return { type: 'move', direction: 'right' }
    case 'ArrowUp':
    case 'z':
    case 'Z':
      return { type: 'rotate' }
    case ' ':
    case 'Spacebar':
      return { type: 'drop' }
    case 'q':
    case 'Q':
      return { type: 'toggleRotateDirection' }
    case 'n':
    case 'N':
      return { type: 'toggleNextPiece' }
    case '+':
    case '=':
      return { type: 'increaseLevel' }
    case '-':
    case '_':
      return { type: 'decreaseLevel' }
    case 'p':
    case 'P':
      return { type: 'togglePause' }
    case 'r':
    case 'R':
      return { type: 'restart' }
    default:
      return undefined
  }
}