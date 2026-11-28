## Why

The SQLite data file lives at `data/pentix.db` inside the working copy. A clone or a clean script can delete that folder together with the users, games, and sessions. An operator who wants another location must export `PENTIX_DATA_FILE` in every shell before the server starts. No backup command exists, so one damaged file ends every retained game.

## What Changes

- Move the data file to `C:\db\pentix\pentix.db`, outside the working copy.
- Add the app settings file `apps/pentix-server/settings.json`. It holds `dataFile` and `backupDirectory`, which defaults to `C:\db\Backups\pentix`.
- Add `apps/pentix-server/src/settings.ts`. It reads one settings file, resolves each relative path against the folder that holds that file, and applies three environment overrides. `PENTIX_SERVER_SETTINGS_FILE` names another settings file, `PENTIX_DATA_FILE` names another data file, and `PENTIX_BACKUP_DIRECTORY` names another backup directory.
- Fail startup with a `SettingsError` that names the settings file when the file is missing, is not JSON, breaks the schema, or carries an empty path. A silent default would hide a deployment mistake.
- Print the settings file, the data file, and the backup directory at startup.
- Add `apps/pentix-server/src/storage/backup.ts`. It copies the live data file through the `node:sqlite` `backup()` call. The copy is then consistent while the server runs, and no `-wal` or `-shm` file needs a copy.
- Add the command `npm run backup:server`. It writes `<yyyyMMddHHmm>-pentix.db` into the backup directory, creates that directory when it is missing, prints the written path, and exits `1` on any failure.
- Refuse to replace an existing backup file. The command names the file that is already there and exits `1`. An overwritten backup cannot be recovered.
- Add tests for the settings precedence, the startup failure, the backup file name and content, the created directory, and the refused collision.
- Update `README.md`, `docs/foundation.md`, and `GLOSSARY.md` for the settings file, the new path, and the backup command.
- Move the retained `data/pentix.db` file, when it exists, to `C:\db\pentix\` before the first start on the new path. No schema change and no backfill occur.

**Not in scope**: scheduled backups, a backup retention policy, a restore command, and a server endpoint for backups. The schema, the API, and the in-memory store do not change.

## Capabilities

### New Capabilities

- `server-settings`: the app settings file, the keys it holds, the path resolution rule, the environment overrides, the validation rules, and the startup failure behavior.
- `storage-backup`: the backup command, the `yyyyMMddHHmm-pentix.db` file name, the backup directory, the consistent online copy, the collision rule, and the reported path.

### Modified Capabilities

- `demo-session-storage`: the data path comes from the app settings file instead of one environment variable, and its default moves to `C:\db\pentix\pentix.db`.
- `pentix-server-bootstrap`: startup loads the storage settings from the settings file, builds the store from the resolved data file, and reports the resolved paths.
- `repository-documentation`: the documentation states the settings file, the data file location, the backup directory, and the backup command.

## Impact

- Affected code: `apps/pentix-server/src/settings.ts` (new), `apps/pentix-server/src/storage/backup.ts` (new), `apps/pentix-server/src/backup.ts` (new command entry point), `apps/pentix-server/src/main.ts` (settings-driven startup), `apps/pentix-server/settings.json` (new), `package.json` (the `backup:server` script), `tests/pentix-server.test.mjs` (new cases).
- Affected APIs: none. Route paths, request bodies, response bodies, and status codes stay the same. The server exposes no backup endpoint.
- Dependencies: none. The `backup()` call ships in the `node:sqlite` module, and the built-in `node:fs` and `node:path` modules cover the rest.
- Storage: the data file moves to `C:\db\pentix\pentix.db`, and write-ahead logging still creates `pentix.db-wal` and `pentix.db-shm` beside it. A backup file is a full SQLite database, and a failed run leaves no partial copy.
- Configuration: `PENTIX_DATA_FILE` keeps working, and it stops being the only data-path setting. `PENTIX_SERVER_SETTINGS_FILE` and `PENTIX_BACKUP_DIRECTORY` are new, and all three default to the settings file.
- Affected docs: `README.md` (commands and the storage section), `docs/foundation.md` (persistence section), and `GLOSSARY.md` (three new terms).
- Browser client: the change needs no client work, because the client calls no server endpoint and reads no storage file.
- Affected teams: backend/server development owns the settings module, the backup module, the command, and the server tests. Storage/maintenance owns the file move, the backup location, and the restore note. Documentation/maintenance owns the README, the foundation note, and the glossary rows. Frontend/web development and product/gameplay design need no work.

## Rollback Plan

Revert the `settings.json`, `settings.ts`, `backup.ts`, and `main.ts` changes together with the `backup:server` script. Revert the tests and the three documents. Set `PENTIX_DATA_FILE=data/pentix.db` or move `C:\db\pentix\pentix.db` back to `data/` after the server stops. The schema and the row shapes do not change, so an existing backup file opens directly as a data file. The change needs no data repair.
