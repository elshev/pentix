/**
 * In-memory high-score tables, refreshed from the store once at startup and
 * updated after every finished session. Reads answer from memory, so a request
 * never replays or selects a stored session.
 */
import type {
  PentixGameSession,
  User,
  UserType,
} from '../../../packages/pentix-core/dist/index.js'
import type { HighScoreEntry } from './storage/entities.js'
import { orderHighScoreEntries } from './storage/high-scores.js'
import type { HighScoreRepository } from './storage/repositories.js'

/** The most rows one user type keeps in its table. */
export const HIGH_SCORE_TABLE_SIZE = 1000

const HIGH_SCORE_TYPES = ['ai', 'human'] as const

const UUID_V7_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const MAX_DATE_MILLISECONDS = 8.64e15

/** One finished session as a caller submits it. The service stamps the date. */
export interface HighScoreSubmission {
  readonly sessionId: string
  readonly userId: string
  readonly name: string
  readonly type: UserType
  readonly score: number
}

/** One row as the endpoint returns it. */
export interface HighScoreView {
  readonly name: string
  readonly score: number
  readonly achievedAt: string
}

/** The operation that a completion path needs from the high-score service. */
export interface HighScoreRecorder {
  submit(submission: HighScoreSubmission): Promise<void>
}

/**
 * Reads the UUIDv7 timestamp of a session id and returns it as an ISO 8601 UTC
 * string. An id that is not a UUIDv7 value has no date, so it answers
 * `undefined`.
 */
export function achievedAtFromSessionId(
  sessionId: string,
): string | undefined {
  if (!UUID_V7_PATTERN.test(sessionId)) {
    return undefined
  }

  const milliseconds = Number.parseInt(
    sessionId.replace(/-/g, '').slice(0, 12),
    16,
  )
  if (
    !Number.isFinite(milliseconds) ||
    milliseconds < 0 ||
    milliseconds > MAX_DATE_MILLISECONDS
  ) {
    return undefined
  }

  return new Date(milliseconds).toISOString()
}

/** Keeps the best `tableLimit` rows of each type, keyed by session id. */
function orderTables(
  entries: readonly HighScoreEntry[],
  tableLimit: number,
): Readonly<Record<UserType, readonly HighScoreEntry[]>> {
  const tables: Record<UserType, readonly HighScoreEntry[]> = {
    ai: [],
    human: [],
  }
  const rows = new Map<UserType, Map<string, HighScoreEntry>>([
    ['ai', new Map()],
    ['human', new Map()],
  ])

  for (const entry of entries) {
    rows.get(entry.type)?.set(entry.sessionId, entry)
  }

  for (const type of HIGH_SCORE_TYPES) {
    tables[type] = orderHighScoreEntries(
      [...(rows.get(type)?.values() ?? [])],
      tableLimit,
    )
  }

  return Object.freeze({
    ai: Object.freeze(tables.ai),
    human: Object.freeze(tables.human),
  })
}

export class HighScoreService implements HighScoreRecorder {
  private readonly repository: HighScoreRepository
  private readonly clock: () => Date
  private tables: Readonly<Record<UserType, readonly HighScoreEntry[]>> =
    Object.freeze({ ai: Object.freeze([]), human: Object.freeze([]) })
  private loaded = false

  constructor(
    repository: HighScoreRepository,
    clock: () => Date = () => new Date(),
  ) {
    this.repository = repository
    this.clock = clock
  }

  /** True when the store held no row, so the lifecycle may rebuild it once. */
  get needsBackfill(): boolean {
    return (
      this.loaded &&
      this.tables.ai.length === 0 &&
      this.tables.human.length === 0
    )
  }

  /** Reads every stored row once and keeps the ordered tables in memory. */
  async load(): Promise<void> {
    const collection = await this.repository.load()
    this.tables = orderTables(collection.entries, HIGH_SCORE_TABLE_SIZE)
    this.loaded = true
  }

  /** Writes one finished session, then updates the memory tables. */
  async submit(submission: HighScoreSubmission): Promise<void> {
    if (!Number.isInteger(submission.score) || submission.score < 0) {
      throw new RangeError(
        'High score must be a non-negative integer.',
      )
    }

    const entry: HighScoreEntry = Object.freeze({
      ...submission,
      achievedAt: this.clock().toISOString(),
    })
    await this.repository.submit(entry, HIGH_SCORE_TABLE_SIZE)
    this.tables = orderTables(
      [...this.tables.ai, ...this.tables.human, entry],
      HIGH_SCORE_TABLE_SIZE,
    )
  }

  /** Returns one table, in its stored order. */
  list(type: UserType): readonly HighScoreView[] {
    return Object.freeze(
      this.tables[type].map((entry) =>
        Object.freeze({
          name: entry.name,
          score: entry.score,
          achievedAt: entry.achievedAt,
        }),
      ),
    )
  }

  /**
   * Rebuilds an empty table from stored sessions. It runs only when the store
   * held no row, keeps `game-over` sessions, and skips a session without a
   * UUIDv7 date or a known user.
   */
  async backfill(
    sessions: Iterable<PentixGameSession>,
    userOf: (userId: string) => User | undefined,
  ): Promise<void> {
    if (!this.needsBackfill) {
      return
    }

    const entries: HighScoreEntry[] = []
    for (const session of sessions) {
      if (session.status !== 'game-over') {
        continue
      }

      const achievedAt = achievedAtFromSessionId(session.id)
      if (achievedAt === undefined) {
        continue
      }

      const user = userOf(session.userId)
      if (user === undefined) {
        continue
      }

      entries.push(
        Object.freeze({
          sessionId: session.id,
          userId: user.id,
          name: user.name,
          type: user.type,
          score: session.statistics.score,
          achievedAt,
        }),
      )
    }

    if (entries.length === 0) {
      return
    }

    const tables = orderTables(entries, HIGH_SCORE_TABLE_SIZE)
    const rows = [...tables.ai, ...tables.human]
    await this.repository.replace(rows, HIGH_SCORE_TABLE_SIZE)
    this.tables = tables
  }
}
