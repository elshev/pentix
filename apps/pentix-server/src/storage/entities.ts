import type {
  PentixGame,
  SessionActionLog,
  User,
  UserType,
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
 * Snapshot of every session retained by a `GameSessionRepository`. Sessions
 * are stored as action logs (piece ID + actions), not as full board snapshots.
 */
export interface GameSessionCollection {
  readonly sessions: readonly SessionActionLog[]
}

/**
 * One high-score row: a finished session reduced to the values that a
 * high-score table shows. The name is a snapshot of the user name at
 * submission, and `achievedAt` is an ISO 8601 UTC date string.
 */
export interface HighScoreEntry {
  readonly sessionId: string
  readonly userId: string
  readonly name: string
  readonly type: UserType
  readonly score: number
  readonly achievedAt: string
}

/** Snapshot of every high-score row retained by a repository. */
export interface HighScoreCollection {
  readonly entries: readonly HighScoreEntry[]
}
