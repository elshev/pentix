## ADDED Requirements

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
