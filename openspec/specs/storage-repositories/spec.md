# storage-repositories Specification

## Purpose
Define the engine-agnostic persistence contract for users, games, and sessions. The contract has durable SQLite and non-durable in-memory implementations. `PentixServer` reloads them at startup and writes to them on every successful state change.
## Requirements
### Requirement: Engine-agnostic repository interfaces for each entity

The server SHALL define repository interfaces for users, games, and sessions. Those interfaces expose create, read, and save operations, where needed, without referencing any specific storage engine. Application code SHALL depend only on these interfaces.

#### Scenario: Application code depends on interfaces, not engines

- **GIVEN** the server's persistence layer
- **WHEN** the HTTP or lifecycle code stores or loads an entity
- **THEN** it calls a repository interface method
- **AND** no concrete storage engine appears in that code path

### Requirement: Users, games, and sessions are stored separately

The system SHALL store users, games, and sessions as separate collections. A game's piece sequence SHALL be stored as a single field containing the ordered list of its piece IDs. A user record SHALL hold its `type` and its optional demo engine binding as their own columns. A session record SHALL hold its optional opening level and its optional demo seed column as their own columns.

#### Scenario: A game persists its sequence as one field

- **GIVEN** a game with a piece sequence
- **WHEN** it is saved to and reloaded from storage
- **THEN** its piece sequence is recovered as one ordered list equal to the original

#### Scenario: Entities live in distinct collections

- **GIVEN** stored users, games, and sessions
- **WHEN** a consumer lists or fetches one kind of entity
- **THEN** the other kinds are not interleaved into the result

#### Scenario: A user stores its type and engine binding

- **GIVEN** an AI user with `type` `ai` and `engineId` `delphi5`
- **WHEN** the user is saved to and reloaded from storage
- **THEN** both values are recovered unchanged

#### Scenario: A demo session stores its opening level and seed

- **GIVEN** a session log with `level` `9` and `seedColumn` `7`
- **WHEN** the log is saved to and reloaded from storage
- **THEN** both values are recovered unchanged

### Requirement: SQLite and in-memory implementations share the interface

A SQLite-backed implementation SHALL persist each entity to durable storage and reload it. An in-memory implementation SHALL provide the same interface for tests and non-durable runs. Both implementations SHALL round-trip the user type, the user engine binding, the session opening level, and the session seed column.

#### Scenario: SQLite round-trips entities

- **GIVEN** a SQLite-backed repository with saved entities
- **WHEN** a new repository instance loads from the same database
- **THEN** the loaded entities equal the saved entities
- **AND** every user keeps its `type` and its optional `engineId`
- **AND** every demo session log keeps its `level` and its optional `seedColumn`

#### Scenario: In-memory retains nothing across instances

- **GIVEN** an in-memory repository to which entities were saved
- **WHEN** a new instance loads
- **THEN** the loaded collections are empty

### Requirement: The server loads retained entities on startup

On startup the server SHALL load previously persisted users, games, and sessions from the configured repository so retained entities are available without being recreated.

#### Scenario: Previously created users survive a restart

- **GIVEN** a server configured with a durable repository has created a user
- **WHEN** the server restarts and loads from the same repository
- **THEN** `GET /users` returns the previously created user

#### Scenario: A missing database starts empty

- **GIVEN** a durable repository whose database file does not yet exist
- **WHEN** the server starts
- **THEN** no retained entities are loaded and the server starts successfully

### Requirement: State-changing operations are persisted

The server SHALL persist through the matching repository after every successful state-changing operation (creating a user, game, or session, and each gameplay mutation).

#### Scenario: A created entity is durable

- **GIVEN** a durable server
- **WHEN** a client creates a user, game, or session
- **THEN** the entity is retrievable after a restart
- **AND** its identity and relationships are preserved

### Requirement: An older database file migrates in place

The SQLite implementation SHALL create every current column in a new file. When the file already holds a `users` or `game_sessions` table without a current column, the implementation SHALL add the missing column with `ALTER TABLE ... ADD COLUMN`. The `users.type` column SHALL be `NOT NULL DEFAULT 'human'`, so every existing user row becomes a human user. The `users.engine_id`, `game_sessions.level`, and `game_sessions.seed_column` columns SHALL be nullable. The migration SHALL run once per missing column and SHALL be safe to repeat.

#### Scenario: An old file gains the new columns

- **GIVEN** a SQLite file whose `users` table holds `id` and `name` only
- **WHEN** `createSqliteStorage` opens that file
- **THEN** the `users` table also holds `type` and `engine_id`
- **AND** the `game_sessions` table also holds `level` and `seed_column`
- **AND** every earlier user row reports `type` `human`

#### Scenario: A repeated start adds nothing twice

- **GIVEN** a SQLite file that this version already migrated
- **WHEN** the storage opens that file again
- **THEN** the open succeeds
- **AND** no column is added a second time
- **AND** stored rows are unchanged

#### Scenario: Existing rows stay readable

- **GIVEN** a migrated file with a human user, a game, and a session log
- **WHEN** the repositories load
- **THEN** each entity loads with its earlier values
- **AND** the session log reports no `level` and no `seedColumn`

### Requirement: The SQLite store uses write-ahead logging and normal synchronization

The SQLite implementation SHALL set `PRAGMA journal_mode = WAL` and `PRAGMA synchronous = NORMAL` when it opens a writable data file. It SHALL read both values back before it creates the schema or applies a migration. It SHALL fail startup with a `StorageError` that names the data file when the mode is not `wal` or the level is not `1`. The store SHALL report the active values through `pragmas()` on the object that `createSqliteStorage` returns. The setting SHALL apply to a new file and to an existing file. The store SHALL keep its rows across a close and a reopen, and a missing file SHALL start empty. The store SHALL accept the `-wal` and `-shm` sidecar files that the mode creates. A crash or power loss MAY lose the most recent commits, and the reopened database SHALL NOT contain corrupt pages.

#### Scenario: A new file opens in WAL mode with normal synchronization

- **GIVEN** a data file path that does not exist yet
- **WHEN** `createSqliteStorage` opens that path
- **THEN** `storage.pragmas()` reports `journalMode` `wal` and `synchronous` `1`
- **AND** a separate connection reports `journal_mode` `wal`
- **AND** the store loads empty collections

#### Scenario: An older file moves to WAL mode and keeps its rows

- **GIVEN** a SQLite file in rollback-journal mode that holds a user row
- **WHEN** `createSqliteStorage` opens that file
- **THEN** `PRAGMA journal_mode` reports `wal`
- **AND** the store still returns the user row

#### Scenario: A reopen keeps the rows and the settings

- **GIVEN** a store that saved a game and a session log
- **WHEN** the store closes and a new store opens the same file
- **THEN** the game and the session log load unchanged
- **AND** `PRAGMA journal_mode` still reports `wal`
- **AND** `PRAGMA synchronous` still reports `1`

#### Scenario: A file that cannot use WAL fails startup

- **GIVEN** a data file whose filesystem rejects write-ahead logging
- **WHEN** `createSqliteStorage` opens that file
- **THEN** it throws a `StorageError`
- **AND** the message names the data file
- **AND** the message names the returned journal mode

#### Scenario: A corrupt file keeps its current error

- **GIVEN** a file that is not a readable SQLite database
- **WHEN** `createSqliteStorage` opens that file
- **THEN** it throws a `StorageError`
- **AND** the message names the data file
- **AND** the store sets no journal mode on that file

