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
import { orderHighScoreEntries } from './high-scores.js'
import type {
  GameRepository,
  GameSessionRepository,
  HighScoreRepository,
  PentixStorage,
  UserRepository,
} from './repositories.js'

const HIGH_SCORE_TYPES = ['ai', 'human'] as const

/**
 * Non-durable storage used by tests and by runs that opt out of persistence.
 * Each instance owns its own collections, so a new instance always loads
 * empty collections even when another instance retained entities.
 */
export function createInMemoryStorage(): PentixStorage {
  const users = new Map<string, User>()
  const games = new Map<string, PentixGame>()
  const sessions = new Map<string, SessionActionLog>()

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
    async create(log: SessionActionLog): Promise<void> {
      sessions.set(log.sessionId, log)
    },
    async save(log: SessionActionLog): Promise<void> {
      sessions.set(log.sessionId, log)
    },
  }

  const highScoreRows = new Map<string, HighScoreEntry>()

  /** Drops the rows of each type beyond the limit. */
  function trimHighScores(tableLimit: number): void {
    for (const type of HIGH_SCORE_TYPES) {
      const kept = orderHighScoreEntries(
        [...highScoreRows.values()].filter((entry) => entry.type === type),
        tableLimit,
      )
      const keptIds = new Set(kept.map((entry) => entry.sessionId))

      for (const [sessionId, entry] of highScoreRows) {
        if (entry.type === type && !keptIds.has(sessionId)) {
          highScoreRows.delete(sessionId)
        }
      }
    }
  }

  const highScoreRepository: HighScoreRepository = {
    async load(): Promise<HighScoreCollection> {
      const entries: HighScoreEntry[] = []
      for (const type of HIGH_SCORE_TYPES) {
        entries.push(
          ...orderHighScoreEntries(
            [...highScoreRows.values()].filter((entry) => entry.type === type),
            Number.POSITIVE_INFINITY,
          ),
        )
      }

      return { entries }
    },
    async submit(entry: HighScoreEntry, tableLimit: number): Promise<void> {
      highScoreRows.set(entry.sessionId, entry)
      trimHighScores(tableLimit)
    },
    async replace(
      entries: readonly HighScoreEntry[],
      tableLimit: number,
    ): Promise<void> {
      highScoreRows.clear()
      for (const entry of entries) {
        highScoreRows.set(entry.sessionId, entry)
      }
      trimHighScores(tableLimit)
    },
  }

  return {
    users: userRepository,
    games: gameRepository,
    sessions: sessionRepository,
    highScores: highScoreRepository,
    close(): void {
      // In-memory storage owns no external resources.
    },
  }
}
