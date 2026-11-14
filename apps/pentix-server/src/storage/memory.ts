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
import type {
  GameRepository,
  GameSessionRepository,
  PentixStorage,
  UserRepository,
} from './repositories.js'

/**
 * Non-durable storage used by tests and by runs that opt out of persistence.
 * Each instance owns its own collections, so a new instance always loads
 * empty collections even when another instance retained entities.
 */
export function createInMemoryStorage(): PentixStorage {
  const users = new Map<string, User>()
  const games = new Map<string, PentixGame>()
  const sessions = new Map<string, PentixGameSession>()

  const userRepository: UserRepository = {
    async load(): Promise<UserCollection> {
      return { users: [...users.values()] }
    },
    async create(user: User): Promise<void> {
      users.set(user.id, user)
    },
    async save(user: User): Promise<void> {
      users.set(user.id, user)
    },
    async findById(userId: string): Promise<User | undefined> {
      return users.get(userId)
    },
    async list(): Promise<readonly User[]> {
      return [...users.values()]
    },
  }

  const gameRepository: GameRepository = {
    async load(): Promise<GameCollection> {
      return { games: [...games.values()] }
    },
    async create(game: PentixGame): Promise<void> {
      games.set(game.id, game)
    },
    async save(game: PentixGame): Promise<void> {
      games.set(game.id, game)
    },
    async findById(gameId: string): Promise<PentixGame | undefined> {
      return games.get(gameId)
    },
    async list(): Promise<readonly PentixGame[]> {
      return [...games.values()]
    },
  }

  const sessionRepository: GameSessionRepository = {
    async load(): Promise<GameSessionCollection> {
      return { sessions: [...sessions.values()] }
    },
    async create(session: PentixGameSession): Promise<void> {
      sessions.set(session.id, session)
    },
    async save(session: PentixGameSession): Promise<void> {
      sessions.set(session.id, session)
    },
    async findById(sessionId: string): Promise<PentixGameSession | undefined> {
      return sessions.get(sessionId)
    },
    async list(): Promise<readonly PentixGameSession[]> {
      return [...sessions.values()]
    },
  }

  return {
    users: userRepository,
    games: gameRepository,
    sessions: sessionRepository,
    close(): void {
      // In-memory storage owns no external resources.
    },
  }
}
