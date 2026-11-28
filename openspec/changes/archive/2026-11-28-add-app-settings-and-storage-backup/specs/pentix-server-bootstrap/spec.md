## ADDED Requirements

### Requirement: Startup reads its storage settings and reports the resolved paths

`apps/pentix-server/src/main.ts` SHALL load its storage settings through `loadPentixServerSettings()` before it builds any store. It SHALL build the SQLite store from the resolved `dataFile`, and it SHALL NOT build a store from a built-in path. After the server listens, it SHALL print the settings file, the data file, and the backup directory to standard output. A settings failure SHALL print the error message and SHALL exit with code `1`.

`PENTIX_SERVER_HOST` and `PENTIX_SERVER_PORT` SHALL keep their current meaning. The app settings file SHALL NOT hold a host, a port, or any other server setting.

#### Scenario: Startup names the resolved paths

- **GIVEN** the shipped settings file and no environment override
- **WHEN** the server starts
- **THEN** the output names `apps/pentix-server/settings.json`
- **AND** it names `C:\db\pentix\pentix.db` as the data file
- **AND** it names `C:\db\Backups\pentix` as the backup directory
- **AND** the server answers on its usual host and port

#### Scenario: A broken settings file stops the start

- **GIVEN** a settings file that holds no `dataFile` key
- **WHEN** the server starts
- **THEN** the output names the missing key and the settings file
- **AND** the process exits with code `1`
- **AND** the server opens no store

#### Scenario: Host and port stay outside the settings file

- **GIVEN** a process that sets `PENTIX_SERVER_PORT` to `3999`
- **WHEN** the server starts from the shipped settings file
- **THEN** the server listens on port `3999`
- **AND** the settings file still holds only `dataFile` and `backupDirectory`
