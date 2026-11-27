## 1. Pragma setup

- [x] 1.1 In `apps/pentix-server/src/storage/sqlite.ts`, set `PRAGMA journal_mode = WAL` and `PRAGMA synchronous = NORMAL` in `openDatabase` after `assertDatabaseIsReadable` and before `database.exec(SCHEMA_SQL)`.
- [x] 1.2 Read both values back with `PRAGMA journal_mode` and `PRAGMA synchronous`. Throw a `StorageError` that names the data file and the returned value when the mode is not `wal` or the level is not `1`.
- [x] 1.3 Leave the schema, the migration, the repositories, and the in-memory store unchanged.

## 2. Storage tests

- [x] 2.1 In `tests/pentix-server.test.mjs`, add a test that opens a fresh file. Assert `storage.pragmas()` reports `journalMode` `wal` and `synchronous` `1`, and that a separate `DatabaseSync` handle reports `journal_mode` `wal`.
- [x] 2.2 Add a test that saves a game and a session log. Close the store, reopen it, and assert that both rows load and both settings hold.
- [x] 2.3 Add a test that builds a rollback-journal file with a user row. Open it through `createSqliteStorage`, then assert the WAL mode and the retained row.
- [x] 2.4 The missing-file and corrupt-file tests must still pass, and temporary-directory cleanup must remove the `-wal` and `-shm` files.

## 3. Benchmark

- [x] 3.1 Run the nine-stub-engine write probe against the old build and the new build three times each. Record the commit count, the median storage time, and the median total time.
- [x] 3.2 Compare the results. If the storage time stays above `20` ms for one nine-engine game, record transaction batching as the next change instead of adding it now.

## 4. Documentation

- [x] 4.1 In `README.md`, state the WAL mode, the normal synchronization level, the `-wal` and `-shm` files, and the durability window.
- [x] 4.2 In `docs/foundation.md`, describe the same settings in the persistence section and name the startup read-back.

## 5. Verification

- [x] 5.1 Run `npm run build`. The core, server, and web builds must pass.
- [x] 5.2 Run `npm test`. Both suites must pass.
- [x] 5.3 Run `npm run lint`. The command must report no error.
- [x] 5.4 Run `openspec validate optimize-sqlite-writes --strict`.
- [x] 5.5 Run `powershell -NoProfile -File scripts\ste-lint.ps1 -Change optimize-sqlite-writes -Path README.md,docs/foundation.md`. The output must show no hard violation.
- [x] 5.6 Start the server against `PENTIX_DATA_FILE`, run `POST /v1/demo-runs` with `gameCount` `1`, restart the server, and confirm that the store still loads the demo rows and reports `wal`.
