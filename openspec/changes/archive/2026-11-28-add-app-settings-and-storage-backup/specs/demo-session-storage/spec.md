## MODIFIED Requirements

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
