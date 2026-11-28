## ADDED Requirements

### Requirement: A backup command writes one consistent copy of the data file

The repository SHALL provide `apps/pentix-server/src/storage/backup.ts`, which exports `createStorageBackup` for one backup run. The repository SHALL register the command `npm run backup:server`. That command builds the shared core and the server, then runs `apps/pentix-server/src/backup.ts` through its compiled output. That entry point SHALL read the paths from `loadPentixServerSettings()` and SHALL accept no path argument.

`createStorageBackup` SHALL create the backup directory when it is missing. It SHALL open the data file read-only and SHALL write the copy through the `node:sqlite` `backup()` call. The copy SHALL hold every committed row and no uncommitted row. It SHALL close the source handle after the copy. It SHALL leave no `-wal` or `-shm` file beside the backup, and it SHALL write one file per run.

A run SHALL print the written path and SHALL exit with code `0`. A run SHALL exit with code `1` when the data file is missing or when the settings cannot load. It SHALL also exit with code `1` when the target cannot be written or already exists. A failed write SHALL discard the partial target file. The command SHALL run while `PentixServer` holds the data file open. The copy SHALL hold every row that the server committed before the run started.

#### Scenario: A backup copies the retained rows

- **GIVEN** a data file that holds two users, one game, and one session
- **WHEN** `createStorageBackup` runs
- **THEN** the backup directory holds one new file
- **AND** opening that file with the SQLite store returns the same two users, the same game, and the same session

#### Scenario: The backup works while the server runs

- **GIVEN** a running `PentixServer` on a data file with write-ahead logging enabled
- **WHEN** the backup command runs
- **THEN** the run exits with code `0`
- **AND** the copy holds every row that the server committed before the run
- **AND** the server keeps serving requests

#### Scenario: The command creates a missing backup directory

- **GIVEN** a backup directory that does not exist
- **WHEN** `createStorageBackup` runs
- **THEN** it creates the directory and every parent directory
- **AND** it writes the backup file there

#### Scenario: A missing data file fails the run

- **GIVEN** a data file path that no file occupies
- **WHEN** the command runs
- **THEN** the message names that data file
- **AND** the run exits with code `1`
- **AND** the backup directory holds no new file

#### Scenario: A failed write leaves no partial file

- **GIVEN** a backup directory that rejects a new file
- **WHEN** `createStorageBackup` runs
- **THEN** the run reports the failure
- **AND** the directory holds no partial backup file

### Requirement: The backup file name is `<yyyyMMddHHmm>-pentix.db`

A backup file SHALL be named `<yyyyMMddHHmm>-pentix.db`. The stamp SHALL hold the local calendar year, month, day, hour, and minute of the run, and every field SHALL hold its two-digit form. The stamp SHALL come from the local clock, not from UTC. The name SHALL hold no other text. A name sort of the backup directory SHALL therefore order the files by their creation minute.

#### Scenario: The name carries the local minute

- **GIVEN** a run whose local clock reads 2026-11-28 15:30
- **WHEN** the command writes the backup file
- **THEN** its name is `202611281530-pentix.db`
- **AND** the name uses the local hour, not the UTC hour

#### Scenario: Every field keeps two digits

- **GIVEN** a run whose local clock reads 2026-01-05 04:07
- **WHEN** the command writes the backup file
- **THEN** its name is `202601050407-pentix.db`

#### Scenario: Two minutes give two files

- **GIVEN** two runs whose stamps fall in different minutes
- **WHEN** both runs finish
- **THEN** the backup directory holds two files
- **AND** the later name sorts after the earlier name

### Requirement: An existing backup file is never replaced

A run SHALL NOT overwrite or delete an existing file in the backup directory. When the target name already exists, the run SHALL print that path and SHALL exit with code `1`. It SHALL leave the existing file byte for byte unchanged. The run SHALL NOT add a suffix, a counter, or another name in that case.

#### Scenario: The command refuses a second run in the same minute

- **GIVEN** a backup file for the current minute
- **WHEN** the command runs again in that minute
- **THEN** the message names the existing file
- **AND** the run exits with code `1`
- **AND** the existing file keeps its size and its rows
- **AND** the directory still holds one file for that minute
