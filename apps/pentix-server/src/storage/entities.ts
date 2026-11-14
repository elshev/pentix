import type {
  PentixGame,
  PentixGameSession,
  User,
} from '../../../../packages/pentix-core/dist/index.js'

/**
 * Snapshot of every user retained by a `UserRepository`.
 */
export interface UserCollection {
  readonly users: readonly User[]
}

/**
 * Snapshot of every game retained by a `GameRepository`. A game keeps its
 * piece sequence as a single ordered field (`PentixGame.pieceIds`).
 */
export interface GameCollection {
  readonly games: readonly PentixGame[]
}

/**
 * Snapshot of every session retained by a `GameSessionRepository`.
 */
export interface GameSessionCollection {
  readonly sessions: readonly PentixGameSession[]
}
