import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync, type StatementSync } from 'node:sqlite'

import {
  SESSION_ACTION_CODES,
  type BoardCell,
  type BoardSnapshot,
  type PentixGame,
  type PieceActionLog,
  type PieceKey,
  type SessionActionLog,
  type User,
  type UserType,
} from '../../../../packages/pentix-core/dist/index.js'
import type {
  GameCollection,
  GameSessionCollection,
  UserCollection,
} from './entities.js'
import { StorageError } from './errors.js'
import type {
  GameRepository,
  GameSessionRepository,
  PentixStorage,
  UserRepository,
} from './repositories.js'

export interface SqliteStorageOptions {
  /** Path of the SQLite file. The store creates the file and its parent directory when they are missing. */
  readonly dataFile: string
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'human',
  engine_id TEXT
);

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  board TEXT NOT NULL,
  available_piece_ids TEXT NOT NULL,
  piece_ids TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS game_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  level INTEGER,
  seed_column INTEGER,
  pieces TEXT NOT NULL
);
`

/** A column that a database written by an earlier version does not yet hold. */
interface MissingColumn {
  readonly name: string
  /** The `ALTER TABLE` statement that adds the column. */
  readonly sql: string
}

const USER_MIGRATION_COLUMNS: readonly MissingColumn[] = [
  {
    name: 'type',
    sql: "ALTER TABLE users ADD COLUMN type TEXT NOT NULL DEFAULT 'human'",
  },
  { name: 'engine_id', sql: 'ALTER TABLE users ADD COLUMN engine_id TEXT' },
]

const GAME_SESSION_MIGRATION_COLUMNS: readonly MissingColumn[] = [
  { name: 'level', sql: 'ALTER TABLE game_sessions ADD COLUMN level INTEGER' },
  {
    name: 'seed_column',
    sql: 'ALTER TABLE game_sessions ADD COLUMN seed_column INTEGER',
  },
]

interface UserRow {
  readonly id: string
  readonly name: string
  readonly type: string
  readonly engine_id: string | null
}

interface GameRow {
  readonly id: string
  readonly name: string
  readonly board: string
  readonly available_piece_ids: string
  readonly piece_ids: string
}

interface GameSessionRow {
  readonly id: string
  readonly user_id: string
  readonly game_id: string
  readonly level: number | null
  readonly seed_column: number | null
  readonly pieces: string
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** The columns a table currently holds, so a migration adds only the missing ones. */
function tableColumnNames(
  database: DatabaseSync,
  table: string,
): ReadonlySet<string> {
  const rows = database
    .prepare(`PRAGMA table_info(${table})`)
    .all() as unknown as readonly { readonly name?: unknown }[]
  const names = new Set<string>()

  for (const row of rows) {
    if (typeof row.name === 'string') {
      names.add(row.name)
    }
  }

  return names
}

function addMissingColumns(
  database: DatabaseSync,
  table: string,
  columns: readonly MissingColumn[],
): void {
  const existing = tableColumnNames(database, table)

  for (const column of columns) {
    if (!existing.has(column.name)) {
      database.exec(column.sql)
    }
  }
}

/**
 * Adds the columns that a database written by an earlier version lacks. Every
 * statement runs once per missing column, so a repeated start changes nothing.
 */
function migrateSchema(database: DatabaseSync): void {
  addMissingColumns(database, 'users', USER_MIGRATION_COLUMNS)
  addMissingColumns(database, 'game_sessions', GAME_SESSION_MIGRATION_COLUMNS)
}

/**
 * Opens the SQLite file and creates the table set, failing fast with a
 * `StorageError` when the file exists but is not a readable SQLite database.
 */
function openDatabase(dataFile: string): DatabaseSync {
  const dataDirectory = path.dirname(dataFile)

  try {
    mkdirSync(dataDirectory, { recursive: true })
  } catch (error) {
    throw new StorageError(
      `Pentix data directory "${dataDirectory}" could not be created: ${describeError(error)}`,
      error,
    )
  }

  let database: DatabaseSync
  try {
    database = new DatabaseSync(dataFile)
  } catch (error) {
    throw new StorageError(
      `Pentix data file "${dataFile}" could not be opened: ${describeError(error)}`,
      error,
    )
  }

  try {
    assertDatabaseIsReadable(database, dataFile)
    database.exec(SCHEMA_SQL)
    migrateSchema(database)
  } catch (error) {
    database.close()
    if (error instanceof StorageError) {
      throw error
    }

    throw new StorageError(
      `Pentix data file "${dataFile}" could not be initialized: ${describeError(error)}`,
      error,
    )
  }

  return database
}

function assertDatabaseIsReadable(
  database: DatabaseSync,
  dataFile: string,
): void {
  let integrity: string | undefined

  try {
    const result = database
      .prepare('PRAGMA integrity_check')
      .get() as unknown as { readonly integrity_check?: string } | undefined
    integrity = result?.integrity_check
  } catch (error) {
    throw new StorageError(
      `Pentix data file "${dataFile}" is not a readable SQLite database: ${describeError(error)}`,
      error,
    )
  }

  if (integrity !== undefined && integrity !== 'ok') {
    throw new StorageError(
      `Pentix data file "${dataFile}" is not a readable SQLite database: ${integrity}`,
    )
  }
}

function decodeJson(value: string, label: string): unknown {
  try {
    return JSON.parse(value) as unknown
  } catch (error) {
    throw new StorageError(
      `Pentix storage contains invalid JSON in ${label}.`,
      error,
    )
  }
}

function decodeObject<T extends object>(value: string, label: string): T {
  const decoded = decodeJson(value, label)
  if (
    typeof decoded !== 'object' ||
    decoded === null ||
    Array.isArray(decoded)
  ) {
    throw new StorageError(`Pentix storage contains an invalid ${label}.`)
  }

  return decoded as T
}

function decodeNumberArray(value: string, label: string): readonly number[] {
  const decoded = decodeJson(value, label)
  if (
    !Array.isArray(decoded) ||
    !decoded.every((item) => typeof item === 'number')
  ) {
    throw new StorageError(`Pentix storage contains an invalid ${label}.`)
  }

  return Object.freeze(decoded as number[])
}

function readBoardCell(cell: unknown, label: string): BoardCell {
  if (typeof cell !== 'object' || cell === null || Array.isArray(cell)) {
    throw new StorageError(`Pentix storage contains an invalid ${label}.`)
  }

  const record = cell as {
    readonly row?: unknown
    readonly column?: unknown
    readonly isOccupied?: unknown
    readonly pieceKey?: unknown
  }

  if (
    !Number.isInteger(record.row) ||
    !Number.isInteger(record.column) ||
    typeof record.isOccupied !== 'boolean'
  ) {
    throw new StorageError(`Pentix storage contains an invalid ${label}.`)
  }

  const pieceKey =
    typeof record.pieceKey === 'string'
      ? (record.pieceKey as PieceKey)
      : undefined

  return Object.freeze({
    row: record.row as number,
    column: record.column as number,
    isOccupied: record.isOccupied,
    // Rebuild the optional cell field so a round trip preserves the snapshot
    // shape even though JSON drops `undefined` properties.
    pieceKey: record.isOccupied ? pieceKey : undefined,
  })
}

function decodeBoard(value: string, label: string): BoardSnapshot {
  const decoded = decodeObject<{
    readonly width?: unknown
    readonly height?: unknown
    readonly rows?: unknown
  }>(value, label)

  if (
    !Number.isInteger(decoded.width) ||
    !Number.isInteger(decoded.height) ||
    !Array.isArray(decoded.rows)
  ) {
    throw new StorageError(`Pentix storage contains an invalid ${label}.`)
  }

  const rows = decoded.rows.map((row) => {
    if (!Array.isArray(row)) {
      throw new StorageError(`Pentix storage contains an invalid ${label}.`)
    }

    return Object.freeze(row.map((cell) => readBoardCell(cell, label)))
  })

  return Object.freeze({
    width: decoded.width as number,
    height: decoded.height as number,
    rows: Object.freeze(rows),
  })
}

function readUserType(value: unknown): UserType {
  if (value !== 'human' && value !== 'ai') {
    throw new StorageError('Pentix storage contains an invalid user type.')
  }

  return value
}

function readUserRow(row: UserRow): User {
  const engineId =
    typeof row.engine_id === 'string' && row.engine_id.trim().length > 0
      ? row.engine_id
      : undefined

  return Object.freeze({
    id: row.id,
    name: row.name,
    type: readUserType(row.type),
    ...(engineId === undefined ? {} : { engineId }),
  })
}

function readGameRow(row: GameRow): PentixGame {
  const label = `game ${row.id}`

  return Object.freeze({
    id: row.id,
    name: row.name,
    board: decodeBoard(row.board, `${label} board`),
    availablePieceIds: decodeNumberArray(
      row.available_piece_ids,
      `${label} available piece ids`,
    ),
    pieceIds: decodeNumberArray(row.piece_ids, `${label} piece ids`),
  })
}

const SESSION_ACTION_SET: ReadonlySet<string> = new Set(SESSION_ACTION_CODES)

function readPieceLog(value: unknown, label: string): PieceActionLog {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new StorageError(`Pentix storage contains an invalid ${label}.`)
  }

  const record = value as { readonly pieceId?: unknown; readonly actions?: unknown }
  const pieceId = record.pieceId
  const actions = record.actions

  if (
    !Number.isInteger(pieceId) ||
    typeof actions !== 'string' ||
    ![...actions].every((action) => SESSION_ACTION_SET.has(action))
  ) {
    throw new StorageError(`Pentix storage contains an invalid ${label}.`)
  }

  return Object.freeze({
    pieceId: pieceId as number,
    actions,
  })
}

/** Reads an optional integer column, rejecting a value of the wrong kind. */
function readOptionalInteger(
  value: number | null,
  label: string,
): number | undefined {
  if (value === null) {
    return undefined
  }

  if (!Number.isInteger(value)) {
    throw new StorageError(`Pentix storage contains an invalid ${label}.`)
  }

  return value
}

function readSessionLog(row: GameSessionRow): SessionActionLog {
  const label = `game session ${row.id}`
  const decoded = decodeJson(row.pieces, `${label} pieces`)
  if (!Array.isArray(decoded)) {
    throw new StorageError(`Pentix storage contains an invalid ${label} pieces.`)
  }

  const level = readOptionalInteger(row.level, `${label} level`)
  const seedColumn = readOptionalInteger(row.seed_column, `${label} seed column`)

  return Object.freeze({
    sessionId: row.id,
    userId: row.user_id,
    gameId: row.game_id,
    ...(level === undefined ? {} : { level }),
    ...(seedColumn === undefined ? {} : { seedColumn }),
    pieces: Object.freeze(
      decoded.map((piece) => readPieceLog(piece, `${label} piece`)),
    ),
  })
}

/**
 * Durable storage backed by a single SQLite file. Users, games, and sessions
 * live in separate tables. A game's piece sequence is one ordered JSON field.
 */
export function createSqliteStorage(
  options: SqliteStorageOptions,
): PentixStorage {
  const dataFile = path.resolve(options.dataFile)
  const database = openDatabase(dataFile)

  try {
    return createRepositories(database)
  } catch (error) {
    database.close()
    if (error instanceof StorageError) {
      throw error
    }

    throw new StorageError(
      `Pentix data file "${dataFile}" could not be used: ${describeError(error)}`,
      error,
    )
  }
}

function writeGameRow(statement: StatementSync, game: PentixGame): void {
  statement.run(
    game.id,
    game.name,
    JSON.stringify(game.board),
    JSON.stringify(game.availablePieceIds),
    JSON.stringify(game.pieceIds),
  )
}

function writeUserRow(statement: StatementSync, user: User): void {
  statement.run(user.id, user.name, user.type, user.engineId ?? null)
}

function writeSessionLog(statement: StatementSync, log: SessionActionLog): void {
  statement.run(
    log.sessionId,
    log.userId,
    log.gameId,
    log.level ?? null,
    log.seedColumn ?? null,
    JSON.stringify(log.pieces),
  )
}

function createRepositories(database: DatabaseSync): PentixStorage {
  const selectUsers = database.prepare(
    'SELECT id, name, type, engine_id FROM users ORDER BY rowid',
  )
  const selectUserById = database.prepare(
    'SELECT id, name, type, engine_id FROM users WHERE id = ?',
  )
  const upsertUser = database.prepare(
    `INSERT INTO users (id, name, type, engine_id)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       type = excluded.type,
       engine_id = excluded.engine_id`,
  )

  const selectGames = database.prepare(
    'SELECT id, name, board, available_piece_ids, piece_ids FROM games ORDER BY rowid',
  )
  const selectGameById = database.prepare(
    'SELECT id, name, board, available_piece_ids, piece_ids FROM games WHERE id = ?',
  )
  const upsertGame = database.prepare(
    `INSERT INTO games (id, name, board, available_piece_ids, piece_ids)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       board = excluded.board,
       available_piece_ids = excluded.available_piece_ids,
       piece_ids = excluded.piece_ids`,
  )

  const selectSessions = database.prepare(
    'SELECT id, user_id, game_id, level, seed_column, pieces FROM game_sessions ORDER BY rowid',
  )
  const upsertSession = database.prepare(
    `INSERT INTO game_sessions (id, user_id, game_id, level, seed_column, pieces)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       user_id = excluded.user_id,
       game_id = excluded.game_id,
       level = excluded.level,
       seed_column = excluded.seed_column,
       pieces = excluded.pieces`,
  )

  const users: UserRepository = {
    async load(): Promise<UserCollection> {
      const rows = selectUsers.all() as unknown as readonly UserRow[]
      return { users: rows.map(readUserRow) }
    },
    async create(user: User): Promise<void> {
      writeUserRow(upsertUser, user)
    },
    async save(user: User): Promise<void> {
      writeUserRow(upsertUser, user)
    },
    async findById(userId: string): Promise<User | undefined> {
      const row = selectUserById.get(userId) as unknown as UserRow | undefined
      return row === undefined ? undefined : readUserRow(row)
    },
    async list(): Promise<readonly User[]> {
      const rows = selectUsers.all() as unknown as readonly UserRow[]
      return rows.map(readUserRow)
    },
  }

  const games: GameRepository = {
    async load(): Promise<GameCollection> {
      const rows = selectGames.all() as unknown as readonly GameRow[]
      return { games: rows.map(readGameRow) }
    },
    async create(game: PentixGame): Promise<void> {
      writeGameRow(upsertGame, game)
    },
    async save(game: PentixGame): Promise<void> {
      writeGameRow(upsertGame, game)
    },
    async findById(gameId: string): Promise<PentixGame | undefined> {
      const row = selectGameById.get(gameId) as unknown as GameRow | undefined
      return row === undefined ? undefined : readGameRow(row)
    },
    async list(): Promise<readonly PentixGame[]> {
      const rows = selectGames.all() as unknown as readonly GameRow[]
      return rows.map(readGameRow)
    },
  }

  const sessions: GameSessionRepository = {
    async load(): Promise<GameSessionCollection> {
      const rows = selectSessions.all() as unknown as readonly GameSessionRow[]
      return { sessions: rows.map(readSessionLog) }
    },
    async create(log: SessionActionLog): Promise<void> {
      writeSessionLog(upsertSession, log)
    },
    async save(log: SessionActionLog): Promise<void> {
      writeSessionLog(upsertSession, log)
    },
  }

  return {
    users,
    games,
    sessions,
    close(): void {
      database.close()
    },
  }
}


