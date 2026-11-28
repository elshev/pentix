## MODIFIED Requirements

### Requirement: Engine-agnostic repository interfaces for each entity

The server SHALL define repository interfaces for users, games, sessions, and
high scores. Those interfaces expose create, read, and save operations, where
needed, without referencing any specific storage engine. Application code
SHALL depend only on these interfaces.

#### Scenario: Application code depends on interfaces, not engines

- **GIVEN** the server's persistence layer
- **WHEN** the HTTP or lifecycle code stores or loads an entity
- **THEN** it calls a repository interface method
- **AND** no concrete storage engine appears in that code path

#### Scenario: A high-score row reads and writes through its interface

- **GIVEN** the server's storage bundle
- **WHEN** the high-score service loads, submits, or replaces rows
- **THEN** it calls `HighScoreRepository` methods
- **AND** no SQLite or in-memory type appears in that code path

### Requirement: Users, games, and sessions are stored separately

The system SHALL store users, games, sessions, and high scores as separate
collections. A game's piece sequence SHALL be stored as a single field
containing the ordered list of its piece IDs. A user record SHALL hold its
`type` and its optional demo engine binding as their own columns. A session
record SHALL hold its optional opening level and its optional demo seed column
as their own columns. A high-score record SHALL hold its session id, user id,
user name, user type, score, and achievement date as their own fields.

#### Scenario: A game persists its sequence as one field

- **GIVEN** a game with a piece sequence
- **WHEN** it is saved to and reloaded from storage
- **THEN** its piece sequence is recovered as one ordered list equal to the original

#### Scenario: Entities live in distinct collections

- **GIVEN** stored users, games, sessions, and high scores
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

#### Scenario: A high-score row keeps every field

- **GIVEN** a high-score row with a name, type `ai`, score `900`, and an
  achievement date
- **WHEN** the row is saved to and reloaded from storage
- **THEN** every field is recovered unchanged

### Requirement: SQLite and in-memory implementations share the interface

A SQLite-backed implementation SHALL persist each entity to durable storage and
reload it. An in-memory implementation SHALL provide the same interface for
tests and non-durable runs. Both implementations SHALL round-trip the user
type, the user engine binding, the session opening level, the session seed
column, and every high-score field. Both implementations SHALL enforce the
same per-type row limit on `submit` and `replace`.

#### Scenario: SQLite round-trips entities

- **GIVEN** a SQLite-backed repository with saved entities
- **WHEN** a new repository instance loads from the same database
- **THEN** the loaded entities equal the saved entities
- **AND** every user keeps its `type` and its optional `engineId`
- **AND** every demo session log keeps its `level` and its optional `seedColumn`
- **AND** every high-score row keeps its name, type, score, and date

#### Scenario: In-memory retains nothing across instances

- **GIVEN** an in-memory repository to which entities were saved
- **WHEN** a new instance loads
- **THEN** the loaded collections are empty

#### Scenario: Both stores limit each high-score type

- **GIVEN** a SQLite store and an in-memory store
- **WHEN** each store submits more than 1000 rows of one type
- **THEN** each store holds the best 1000 rows of that type
- **AND** both stores report the same order
### Requirement: The server loads retained entities on startup

On startup the server SHALL load previously persisted users, games, sessions,
and high-score rows from the configured repository. The retained entities are
then available without being recreated.

#### Scenario: Previously created users survive a restart

- **GIVEN** a server configured with a durable repository has created a user
- **WHEN** the server restarts and loads from the same repository
- **THEN** `GET /users` returns the previously created user

#### Scenario: A missing database starts empty

- **GIVEN** a durable repository whose database file does not yet exist
- **WHEN** the server starts
- **THEN** no retained entities are loaded and the server starts successfully
- **AND** the high-score table holds no row

#### Scenario: Stored score rows survive a restart

- **GIVEN** a durable server whose high-score table holds one row
- **WHEN** the server restarts
- **THEN** `GET /v1/high-scores?type=human` or the matching AI request returns
  that row

### Requirement: An older database file migrates in place

The SQLite implementation SHALL create every current column in a new file.
When the file already holds a `users` or `game_sessions` table without a
current column, the implementation SHALL add the missing column with
`ALTER TABLE ... ADD COLUMN`. The `users.type` column SHALL be
`NOT NULL DEFAULT 'human'`, so every existing user row becomes a human user.
The `users.engine_id`, `game_sessions.level`, and `game_sessions.seed_column`
columns SHALL be nullable. The implementation SHALL create the `high_scores`
table and its order index when they are missing, including in a file written
by an earlier version. The migration SHALL run once per missing column or
table and SHALL be safe to repeat.

#### Scenario: An old file gains the new columns

- **GIVEN** a SQLite file whose `users` table holds `id` and `name` only
- **WHEN** `createSqliteStorage` opens that file
- **THEN** the `users` table also holds `type` and `engine_id`
- **AND** the `game_sessions` table also holds `level` and `seed_column`
- **AND** every earlier user row reports `type` `human`

#### Scenario: An old file gains the high-score table

- **GIVEN** a SQLite file without a `high_scores` table
- **WHEN** `createSqliteStorage` opens that file
- **THEN** the file holds the `high_scores` table and its order index
- **AND** the table loads no row

#### Scenario: A repeated start adds nothing twice

- **GIVEN** a SQLite file that this version already migrated
- **WHEN** the storage opens that file again
- **THEN** the open succeeds
- **AND** no column or table is added a second time
- **AND** stored rows are unchanged

#### Scenario: Existing rows stay readable

- **GIVEN** a migrated file with a human user, a game, and a session log
- **WHEN** the repositories load
- **THEN** each entity loads with its earlier values
- **AND** the session log reports no `level` and no `seedColumn`
- **AND** the high-score collection is empty

