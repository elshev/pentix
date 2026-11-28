## 1. App settings file

- [x] 1.1 Create `apps/pentix-server/settings.json` with `dataFile` `"C:\\db\\pentix\\pentix.db"` and `backupDirectory` `"C:\\db\\Backups\\pentix"`. It holds those two keys only.
- [x] 1.2 Create `apps/pentix-server/src/settings.ts`. Export `SettingsError`, `PentixServerSettings` (`settingsFile`, `dataFile`, `backupDirectory`), `DEFAULT_SETTINGS_FILE`, and `loadPentixServerSettings()`.
- [x] 1.3 Resolve the default settings file from `import.meta.url` two levels up, so `src/settings.ts` and `dist/settings.js` both reach `apps/pentix-server/settings.json`. `PENTIX_SERVER_SETTINGS_FILE` replaces that path, and a relative value resolves against the working directory.
- [x] 1.4 Read and parse the file. Reject a missing file, an unreadable file, invalid JSON, an unknown key, a missing key, a non-string value, and an empty value. Each failure throws a `SettingsError` that names the file and the offending key.
- [x] 1.5 Resolve `dataFile` and `backupDirectory` with `path.resolve` against the folder that holds the settings file, then apply `PENTIX_DATA_FILE` and `PENTIX_BACKUP_DIRECTORY`. The environment value wins over the file value. Return only absolute paths.

## 2. Startup wiring

- [x] 2.1 In `apps/pentix-server/src/main.ts`, replace `DEFAULT_DATA_FILE` and the `process.env.PENTIX_DATA_FILE` read with `loadPentixServerSettings()`, and build the SQLite store from the resolved `dataFile`.
- [x] 2.2 Print the settings file, the data file, and the backup directory after the existing listen lines, and keep the current `console.log` prefix.
- [x] 2.3 Keep the existing main-guard pattern and the `catch` that prints `Failed to start PentixServer bootstrap.` with the error and sets `process.exitCode = 1`.

## 3. Backup module

- [x] 3.1 Create `apps/pentix-server/src/storage/backup.ts`. Export `formatBackupStamp(date: Date): string`, which pads the local year, month, day, hour, and minute to two digits and returns `yyyyMMddHHmm`.
- [x] 3.2 Export `createStorageBackup(options)` with `dataFile`, `backupDirectory`, and an optional `now`. It throws a `StorageError` that names the data file when the file is missing. It then creates the backup directory with `mkdirSync(..., { recursive: true })`, builds `<stamp>-pentix.db`, and returns the written path.
- [x] 3.3 Refuse an existing target. Throw a `StorageError` that names the existing file before the data file opens.
- [x] 3.4 Open the data file with `new DatabaseSync(dataFile, { readOnly: true })`, await `backup(db, target)`, and close the handle in a `finally` block. Remove the partial target with `rmSync(target, { force: true })` when the copy fails.
- [x] 3.5 Re-export `createStorageBackup`, `formatBackupStamp`, and the option and result types from `apps/pentix-server/src/storage/index.ts`.
- [x] 3.6 Create `apps/pentix-server/src/backup.ts`. It loads the settings, runs `createStorageBackup`, prints `PentixServer backup written to <path>`, and uses the same main-guard and `catch` pattern as `main.ts`. The catch prints the error and sets `process.exitCode = 1`.
- [x] 3.7 In `package.json`, add `"backup:server": "npm run build:core && npm run build:server && node apps/pentix-server/dist/backup.js"` next to `start:server`.

## 4. Tests

- [x] 4.1 In `tests/pentix-server.test.mjs`, import `loadPentixServerSettings`, `SettingsError`, `createStorageBackup`, and `formatBackupStamp` from the built server output.
- [x] 4.2 Add a test for the shipped settings file. It must report `C:\db\pentix\pentix.db` and `C:\db\Backups\pentix` as absolute paths when the process sets no override, and it must clear the three variables first.
- [x] 4.3 Add a test for a temporary settings file with relative paths. Both results must resolve inside the folder that holds that file.
- [x] 4.4 Add a test for precedence. `PENTIX_SERVER_SETTINGS_FILE` selects another file, `PENTIX_DATA_FILE` replaces the data file, and `PENTIX_BACKUP_DIRECTORY` replaces the backup directory.
- [x] 4.5 Add tests for the failures: a missing file, invalid JSON, an unknown key, and an empty value. Each must throw a `SettingsError` whose message names the file or the key.
- [x] 4.6 Add a test for `formatBackupStamp` with the local dates `2026-11-28T15:30` and `2026-01-05T04:07`. It must return `202611281530` and `202601050407`.
- [x] 4.7 Add a test that a backup copies the rows. Write users, a game, and a session through `createSqliteStorage`, run `createStorageBackup`, then open the backup file and compare the loaded collections.
- [x] 4.8 Add a test that the command creates a missing backup directory. Add a test that a missing data file throws a `StorageError` that names that path and writes no file.
- [x] 4.9 Add a test that a second run in the same minute throws a `StorageError` that names the existing file. The existing file must keep its bytes and its rows.
- [x] 4.10 Add a test that the backup runs against an open write-ahead-logging store. Start the store, commit a user, run the backup, then read that user from the backup file.

## 5. Documentation

- [x] 5.1 In `README.md`, replace the `PENTIX_DATA_FILE` storage paragraph. It must name `apps/pentix-server/settings.json`, its two keys, and their shipped values. It must also name the three environment overrides, the startup failure rule, and the fact that the data file sits outside the working copy.
- [x] 5.2 In the `README.md` command list, add `npm run backup:server`. The entry must name the `<yyyyMMddHHmm>-pentix.db` file name and the backup directory. It must state that a run works while the server runs, and that an existing file is never replaced.
- [x] 5.3 In `docs/foundation.md`, rewrite the persistence paragraph that names `PENTIX_DATA_FILE`. It must state the settings precedence, the shipped paths, the module that owns the settings, and that a backup file is a full database.
- [x] 5.4 In `GLOSSARY.md`, add `App settings`, `Data file`, `Backup directory`, and `Storage backup` under `Server and storage`, each with its code name and its avoid list.
- [x] 5.5 After `openspec archive` moves this change, add one row to `docs/decisions/README.md` with the date, the design link, the scope, and the status.

## 6. Data move and verification

- [x] 6.1 Stop any running `PentixServer`, then move `data\pentix.db`, `data\pentix.db-wal`, and `data\pentix.db-shm` into `C:\db\pentix\`. The row count must match the count before the move.
- [x] 6.2 Run `npm run build`. The core, server, and web builds must pass.
- [x] 6.3 Run `npm test`. Both suites must pass.
- [x] 6.4 Run `npm run lint`. The command must report no error.
- [x] 6.5 Run `openspec validate add-app-settings-and-storage-backup --strict`.
- [x] 6.6 Run `powershell -NoProfile -File scripts\ste-lint.ps1 -Change add-app-settings-and-storage-backup -Path README.md,docs/foundation.md,GLOSSARY.md`. The output must show no new hard violation.
- [x] 6.7 Start the server with `npm run start:server` and confirm the three printed paths. Read `GET /v1/users` and confirm that the retained users survived the move.
- [x] 6.8 Run `npm run backup:server` while the server runs. Confirm one `<stamp>-pentix.db` file in `C:\db\Backups\pentix`. Run it twice in one minute and confirm the second run exits `1` with the existing path.
