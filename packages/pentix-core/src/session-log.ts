/** Compact, replayable session action log plus the function that replays it. */
import type { PentixGame } from './game.js'
import { createPentixGameSession, type PentixGameSession } from './session.js'
import { gameSessionEngine } from './session-engine.js'

/**
 * The recorded session action alphabet. Each entry maps an operation to its
 * single-character code:
 *
 * - `T` – tick (a gravity step where the active piece may settle)
 * - `L` – move the active piece left
 * - `R` – move the active piece right
 * - `C` – rotate the active piece clockwise
 * - `A` – rotate the active piece anticlockwise (counterclockwise)
 * - `H` – hard drop the active piece to its lowest position
 *
 * Soft drop is intentionally not represented and must not appear in a log.
 */
export const SESSION_ACTIONS = Object.freeze({
  tick: 'T',
  left: 'L',
  right: 'R',
  clockwise: 'C',
  anticlockwise: 'A',
  hardDrop: 'H',
} as const)

/** A single recorded session action code. */
export type SessionAction =
  (typeof SESSION_ACTIONS)[keyof typeof SESSION_ACTIONS]

/** Every valid session action code, in no particular order. */
export const SESSION_ACTION_CODES: readonly SessionAction[] = Object.freeze(
  Object.values(SESSION_ACTIONS),
)

/**
 * One played piece plus the compact sequence of single-character actions
 * applied to it (for example `"RCTT"`), identified by its stable numeric
 * catalog ID.
 */
export interface PieceActionLog {
  readonly pieceId: number
  readonly actions: string
}

/**
 * The durable, replayable representation of a session: the ordered actions
 * taken per piece, rather than the full board state after every action.
 */
export interface SessionActionLog {
  readonly sessionId: string
  readonly userId: string
  readonly gameId: string
  readonly pieces: readonly PieceActionLog[]
}

/**
 * Reconstructs a `PentixGameSession` by folding the recorded actions through
 * the deterministic engine. The supplied game must already contain the piece
 * sequence the session was played against so no random extension occurs.
 */
export function replayPentixGameSession(
  log: SessionActionLog,
  game: PentixGame,
): PentixGameSession {
  let session = createPentixGameSession({
    id: log.sessionId,
    userId: log.userId,
    game,
  })
  let currentGame = game

  for (const pieceLog of log.pieces) {
    for (const action of pieceLog.actions) {
      switch (action) {
        case 'L':
          session = gameSessionEngine.move(session, 'left')
          break
        case 'R':
          session = gameSessionEngine.move(session, 'right')
          break
        case 'C':
          session = gameSessionEngine.rotate(session, 'clockwise')
          break
        case 'A':
          session = gameSessionEngine.rotate(session, 'counterclockwise')
          break
        case 'T': {
          const result = gameSessionEngine.tick(session, currentGame)
          session = result.session
          currentGame = result.game
          break
        }
        case 'H': {
          const result = gameSessionEngine.drop(session, currentGame)
          session = result.session
          currentGame = result.game
          break
        }
        default:
          throw new Error(`Unknown session action: ${action}.`)
      }
    }
  }

  return session
}