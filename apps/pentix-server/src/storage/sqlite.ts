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
  /** Path of the SQLite file; created (with its parent directory) when missing. */
  readonly dataFile: string
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
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
  pieces TEXT NOT NULL
);
`

interface UserRow {
  readonly id: string
  readonly name: string
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
  readonly pieces: string
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
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

function readUserRow(row: UserRow): User {
  return Object.freeze({
    id: row.id,
    name: row.name,
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

function readSessionLog(row: GameSessionRow): SessionActionLog {
  const label = `game session ${row.id}`
  const decoded = decodeJson(row.pieces, `${label} pieces`)
  if (!Array.isArray(decoded)) {
    throw new StorageError(`Pentix storage contains an invalid ${label} pieces.`)
  }

  return Object.freeze({
    sessionId: row.id,
    userId: row.user_id,
    gameId: row.game_id,
    pieces: Object.freeze(
      decoded.map((piece) => readPieceLog(piece, `${label} piece`)),
    ),
  })
}

/**
 * Durable storage backed by a single SQLite file. Users, games, and sessions
 * live in separate tables; a game's piece sequence is one ordered JSON field.
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

function writeSessionLog(statement: StatementSync, log: SessionActionLog): void {
  statement.run(
    log.sessionId,
    log.userId,
    log.gameId,
    JSON.stringify(log.pieces),
  )
}

function createRepositories(database: DatabaseSync): PentixStorage {
  const selectUsers = database.prepare(
    'SELECT id, name FROM users ORDER BY rowid',
  )
  const selectUserById = database.prepare(
    'SELECT id, name FROM users WHERE id = ?',
  )
  const upsertUser = database.prepare(
    'INSERT INTO users (id, name) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name',
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
    'SELECT id, user_id, game_id, pieces FROM game_sessions ORDER BY rowid',
  )
  const upsertSession = database.prepare(
    `INSERT INTO game_sessions (id, user_id, game_id, pieces)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       user_id = excluded.user_id,
       game_id = excluded.game_id,
       pieces = excluded.pieces`,
  )

  const users: UserRepository = {
    async load(): Promise<UserCollection> {
      const rows = selectUsers.all() as unknown as readonly UserRow[]
      return { users: rows.map(readUserRow) }
    },
    async create(user: User): Promise<void> {
      upsertUser.run(user.id, user.name)
    },
    async save(user: User): Promise<void> {
      upsertUser.run(user.id, user.name)
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


