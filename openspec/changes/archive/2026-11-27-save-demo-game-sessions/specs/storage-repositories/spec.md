## MODIFIED Requirements

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

## ADDED Requirements

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
