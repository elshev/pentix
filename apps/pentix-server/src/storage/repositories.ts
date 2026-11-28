import type {
  PentixGame,
  SessionActionLog,
  User,
} from '../../../../packages/pentix-core/dist/index.js'
import type {
  GameCollection,
  GameSessionCollection,
  HighScoreCollection,
  HighScoreEntry,
  UserCollection,
} from './entities.js'

/**
 * Persistence contract for `User` entities. Implementations may be relational
 * (SQLite now, PostgreSQL later) or in-memory. Callers never depend on which
 * one is in use.
 */
export interface UserRepository {
  /** Returns every retained user, or an empty collection when nothing is stored. */
  load(): Promise<UserCollection>
  /** Persists a newly created user. */
  create(user: User): Promise<void>
  /** Persists changes to an existing user, inserting it when absent. */
  save(user: User): Promise<void>
  findById(userId: string): Promise<User | undefined>
  list(): Promise<readonly User[]>
}

/**
 * Persistence contract for `PentixGame` entities. A game's piece sequence is
 * stored as a single ordered field alongside the rest of the game.
 */
export interface GameRepository {
  /** Returns every retained game, or an empty collection when nothing is stored. */
  load(): Promise<GameCollection>
  /** Persists a newly created game. */
  create(game: PentixGame): Promise<void>
  /** Persists changes to an existing game, inserting it when absent. */
  save(game: PentixGame): Promise<void>
  findById(gameId: string): Promise<PentixGame | undefined>
  list(): Promise<readonly PentixGame[]>
}

/**
 * Persistence contract for `PentixGameSession` entities, stored as their
 * replayable action logs (piece ID + ordered actions) rather than full state.
 */
export interface GameSessionRepository {
  /** Returns every retained session log, or an empty collection when nothing is stored. */
  load(): Promise<GameSessionCollection>
  /** Persists a newly created session log. */
  create(log: SessionActionLog): Promise<void>
  /** Persists changes to an existing session log, inserting it when absent. */
  save(log: SessionActionLog): Promise<void>
}

/**
 * Persistence contract for high-score rows. A row is a finished session
 * reduced to its user, name, type, score, and achievement date. Both
 * implementations keep at most `tableLimit` rows of each user type.
 */
export interface HighScoreRepository {
  /** Returns every retained high-score row, or an empty collection when nothing is stored. */
  load(): Promise<HighScoreCollection>
  /** Persists one row and drops the rows of its type beyond `tableLimit`. */
  submit(entry: HighScoreEntry, tableLimit: number): Promise<void>
  /** Replaces every row with the supplied rows and applies `tableLimit` per type. */
  replace(entries: readonly HighScoreEntry[], tableLimit: number): Promise<void>
}

/**
 * The repository set injected into `PentixServerContext` and consumed by the
 * lifecycle. Users, games, sessions, and high scores are stored separately.
 */
export interface PentixStorage {
  readonly users: UserRepository
  readonly games: GameRepository
  readonly sessions: GameSessionRepository
  readonly highScores: HighScoreRepository
  /** Releases any store handle. In-memory storage has nothing to release. */
  close(): void
}
