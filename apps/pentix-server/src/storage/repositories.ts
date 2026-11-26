import type {
  PentixGame,
  SessionActionLog,
  User,
} from '../../../../packages/pentix-core/dist/index.js'
import type {
  GameCollection,
  GameSessionCollection,
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
 * The repository set injected into `PentixServerContext` and consumed by the
 * lifecycle. Users, games, and sessions are stored separately.
 */
export interface PentixStorage {
  readonly users: UserRepository
  readonly games: GameRepository
  readonly sessions: GameSessionRepository
  /** Releases any store handle. In-memory storage has nothing to release. */
  close(): void
}
