import type {
  PentixGame,
  PentixGameSession,
  User,
} from '../../../../packages/pentix-core/dist/index.js'
import type {
  GameCollection,
  GameSessionCollection,
  UserCollection,
} from './entities.js'

/**
 * Persistence contract for `User` entities. Implementations may be relational
 * (SQLite now, PostgreSQL later) or in-memory; callers never depend on which.
 */
export interface UserRepository {
  /** Returns every retained user; an empty collection when nothing is stored. */
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
  /** Returns every retained game; an empty collection when nothing is stored. */
  load(): Promise<GameCollection>
  /** Persists a newly created game. */
  create(game: PentixGame): Promise<void>
  /** Persists changes to an existing game, inserting it when absent. */
  save(game: PentixGame): Promise<void>
  findById(gameId: string): Promise<PentixGame | undefined>
  list(): Promise<readonly PentixGame[]>
}

/**
 * Persistence contract for `PentixGameSession` entities.
 */
export interface GameSessionRepository {
  /** Returns every retained session; an empty collection when nothing is stored. */
  load(): Promise<GameSessionCollection>
  /** Persists a newly created session. */
  create(session: PentixGameSession): Promise<void>
  /** Persists changes to an existing session, inserting it when absent. */
  save(session: PentixGameSession): Promise<void>
  findById(sessionId: string): Promise<PentixGameSession | undefined>
  list(): Promise<readonly PentixGameSession[]>
}

/**
 * The repository set injected into `PentixServerContext` and consumed by the
 * lifecycle. Users, games, and sessions are stored separately.
 */
export interface PentixStorage {
  readonly users: UserRepository
  readonly games: GameRepository
  readonly sessions: GameSessionRepository
  /** Releases any store handle; in-memory storage has nothing to release. */
  close(): void
}
