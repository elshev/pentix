# demo-session-storage Specification

## Purpose
TBD - created by archiving change save-demo-game-sessions. Update Purpose after archive.
## Requirements
### Requirement: Every registered demo engine owns one AI user

`PentixServer` SHALL retain exactly one `User` row for every demo engine in its
configured engine list. The row SHALL carry `type` `ai` and `engineId` set to the
engine id. Its `name` SHALL be the engine name. Its `id` SHALL be a UUIDv7 value
from the server id seam. The server SHALL create a missing row during startup,
after it loads the retained users, through `UserRepository.create`. When a
retained row already has that `engineId`, the server SHALL reuse the row and
SHALL NOT create another. A removed engine SHALL keep its row and SHALL NOT block
startup. A request to `POST /v1/users` SHALL NOT create an AI user, and a `type`
in that request body SHALL NOT set the stored type.

#### Scenario: The first start seeds one user per engine

- **GIVEN** a durable store with no AI user and the built-in registry with nine engines
- **WHEN** `PentixServer` starts
- **THEN** the store holds nine user rows with `type` `ai`
- **AND** their `engineId` values equal the nine registered engine ids
- **AND** every `id` is a UUIDv7 value

#### Scenario: A restart reuses the seeded rows

- **GIVEN** a retained AI user for `delphi5` and a server that stopped
- **WHEN** the server starts again on the same store
- **THEN** `GET /v1/users` holds exactly one row with `engineId` `delphi5`
- **AND** that row keeps its original `id` and `name`

#### Scenario: The engine list decides the seeded set

- **GIVEN** a server context whose engine list holds one stub engine
- **WHEN** the server starts
- **THEN** the store holds one AI user row
- **AND** its `engineId` equals the stub engine id

#### Scenario: A client cannot create an AI user

- **GIVEN** a request body of `{ "name": "Ada", "type": "ai" }`
- **WHEN** a client posts to `/v1/users`
- **THEN** the response status is `201`
- **AND** the created user reports `type` `human`
- **AND** the user has no `engineId`

### Requirement: A finished demo session is stored with its action log

`DemoRunService` SHALL store one `PentixGame` for every game of a run. It SHALL
store one `SessionActionLog` for every engine's session when that session reaches
`game-over`. The game SHALL be written before a session log that references it.
The log SHALL carry the session id, the engine's AI user id as `userId`, the game
id, the opening level as `level`, the seed column as `seedColumn`, and `pieces`.
`pieces` SHALL hold every code that playback applied, including `T`. The service
SHALL write each log once, after that session ends. It SHALL NOT write a log for
a session that has not ended. A write failure SHALL fail the run, SHALL publish
no standings, and SHALL keep the rows that earlier finished sessions wrote.

#### Scenario: One game seeds one log per engine

- **GIVEN** two stub engines and a run of `1` game
- **WHEN** the run completes
- **THEN** the store holds one new game row
- **AND** it holds two new session logs
- **AND** each log reports its engine's AI user as `userId`

#### Scenario: A log is written once, when the session ends

- **GIVEN** a run with a stub engine that plays to `game-over`
- **WHEN** the run completes
- **THEN** each session id appears in the store exactly once
- **AND** no session row existed while the run was queued

#### Scenario: The log carries actions and ticks

- **GIVEN** a stored demo session log
- **WHEN** its `pieces` are inspected
- **THEN** every action is one of `T`, `L`, `R`, `C`, `A`, and `H`
- **AND** at least one `T` code appears for a piece that fell under gravity

#### Scenario: A storage failure fails the run

- **GIVEN** a session repository whose `create` rejects
- **WHEN** a run reaches its first finished session
- **THEN** the run reports `failed`
- **AND** the snapshot carries the storage error message

### Requirement: A stored demo log replays to the state that live play reached

After a restart, `PentixGameLifecycle.load()` SHALL replay every stored demo log
against its game. `replayPentixGameSession` SHALL apply `level` and SHALL seed
the opening mino from `seedColumn` before it folds the recorded actions. The
rebuilt session SHALL equal the session that live playback ended with in
`status`, `board`, `statistics`, `nextPieceIndex`, `id`, `userId`, and `gameId`.
A log without `seedColumn` SHALL replay without a seed.

#### Scenario: A restart rebuilds a demo session

- **GIVEN** a completed run whose store holds a demo log for every engine
- **WHEN** a new server loads that store
- **THEN** every stored demo log replays without an error
- **AND** each rebuilt session equals the session that live playback ended with
- **AND** the rebuilt session still names its engine's AI user

#### Scenario: The opening level survives the replay

- **GIVEN** a stored demo log whose `level` is `9`
- **WHEN** the log is replayed
- **THEN** the rebuilt session reports level `9` for the opening piece
- **AND** its score matches the score that live play reported

#### Scenario: A human log keeps its old replay

- **GIVEN** a stored human session log without `level` and without `seedColumn`
- **WHEN** the log is replayed
- **THEN** the session opens at level `0`
- **AND** its board holds no seed mino

### Requirement: Demo session storage uses the configured data path

The server SHALL take its data file from the app settings file that `server-settings` owns. `apps/pentix-server/src/main.ts` SHALL pass the resolved `dataFile` to the SQLite store, and `PENTIX_DATA_FILE` SHALL override the `dataFile` value of that file. The shipped settings file SHALL name `C:\db\pentix\pentix.db`. Demo game and session rows SHALL reach the repositories that this setting configures. The change SHALL add no second database file and no demo-specific setting. When the server runs with in-memory storage, a demo run SHALL still complete and SHALL keep no row after a restart.

#### Scenario: The configured data file holds the demo rows

- **GIVEN** a server started from `main.ts` with the shipped settings file and no environment override
- **WHEN** a demo run completes
- **THEN** `C:\db\pentix\pentix.db` holds the run's game and session rows
- **AND** the store creates no other file

#### Scenario: No demo-specific setting exists

- **GIVEN** the documented server settings
- **WHEN** an operator looks for the demo storage path
- **THEN** the `dataFile` key of the app settings file names it
- **AND** no demo-specific variable appears

#### Scenario: The environment override moves the demo rows

- **GIVEN** a running server whose process sets `PENTIX_DATA_FILE` to `D:\data\pentix.db`
- **WHEN** a demo run completes
- **THEN** `D:\data\pentix.db` holds the run's game and session rows
- **AND** `C:\db\pentix\pentix.db` is not written

#### Scenario: In-memory storage keeps the run working

- **GIVEN** a server started with in-memory storage
- **WHEN** a demo run completes
- **THEN** the snapshot reports its engine lines and its game entries
- **AND** a restarted server holds no demo row

