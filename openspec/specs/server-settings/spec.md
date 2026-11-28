# server-settings Specification

## Purpose
TBD - created by archiving change add-app-settings-and-storage-backup. Update Purpose after archive.
## Requirements
### Requirement: PentixServer reads one app settings file

The repository SHALL ship `apps/pentix-server/settings.json` as the app settings file. That file SHALL hold exactly two keys, `dataFile` and `backupDirectory`, and each value SHALL be a non-empty string. `apps/pentix-server/src/settings.ts` SHALL be the only module that reads the file. It SHALL expose `loadPentixServerSettings()`, which returns `settingsFile`, `dataFile`, and `backupDirectory`, and every returned path SHALL be absolute.

The shipped file SHALL name `C:\db\pentix\pentix.db` as `dataFile` and `C:\db\Backups\pentix` as `backupDirectory`.

The default settings file path SHALL resolve from the module URL, so a start from any working directory reads `apps/pentix-server/settings.json`. `PENTIX_SERVER_SETTINGS_FILE` SHALL replace that path, and a relative value SHALL resolve against the working directory.

An absolute `dataFile` or `backupDirectory` value SHALL be used as written. A relative value SHALL resolve against the directory that holds the settings file. `PENTIX_DATA_FILE` SHALL replace `dataFile`, and `PENTIX_BACKUP_DIRECTORY` SHALL replace `backupDirectory`. An environment value SHALL win over the file value, and the file value SHALL win over every other source.

#### Scenario: The shipped settings name the new data file

- **GIVEN** a checkout without an environment override
- **WHEN** a developer reads `apps/pentix-server/settings.json`
- **THEN** `dataFile` is `C:\db\pentix\pentix.db`
- **AND** `backupDirectory` is `C:\db\Backups\pentix`
- **AND** the file holds no other key

#### Scenario: A start from another directory finds the file

- **GIVEN** a shell whose working directory is outside the repository
- **WHEN** `loadPentixServerSettings()` runs with no argument
- **THEN** it reads `apps/pentix-server/settings.json`
- **AND** it returns an absolute `settingsFile` path

#### Scenario: A relative path resolves against the settings folder

- **GIVEN** a settings file that holds `{ "dataFile": "pentix.db", "backupDirectory": "backups" }`
- **WHEN** a caller loads the settings
- **THEN** `dataFile` resolves inside the directory that holds that settings file
- **AND** `backupDirectory` resolves inside the same directory

#### Scenario: The environment overrides one value

- **GIVEN** a settings file that names `C:\db\pentix\pentix.db`
- **WHEN** the process sets `PENTIX_DATA_FILE` to `D:\data\other.db`
- **THEN** the resolved `dataFile` is `D:\data\other.db`
- **AND** `backupDirectory` still comes from the settings file

#### Scenario: An alternate settings file wins over the default

- **GIVEN** a file at `C:\temp\pentix-settings.json` that holds two paths
- **WHEN** the process sets `PENTIX_SERVER_SETTINGS_FILE` to that path
- **THEN** the settings come from that file
- **AND** `apps/pentix-server/settings.json` is not read

### Requirement: A missing or invalid settings file fails startup

`loadPentixServerSettings()` SHALL throw a `SettingsError` when the settings file is missing, unreadable, or not valid JSON. It SHALL also throw when the file holds an unknown key, lacks one of the two keys, or holds an empty or non-string value. The message SHALL name the settings file. A message about one key SHALL name that key and the rule that it broke. No caller SHALL receive a path from a built-in default after a failure, and no store SHALL open.

#### Scenario: The loader names a missing file

- **GIVEN** a settings file path that no file occupies
- **WHEN** a caller loads the settings
- **THEN** a `SettingsError` names that path
- **AND** it does not fall back to `data/pentix.db`

#### Scenario: The loader names a malformed file

- **GIVEN** a settings file whose text is not JSON
- **WHEN** a caller loads the settings
- **THEN** a `SettingsError` names the file and states that the text is not valid JSON

#### Scenario: The loader rejects an unknown key

- **GIVEN** a settings file that also holds `"dataFileBackup": "x"`
- **WHEN** a caller loads the settings
- **THEN** a `SettingsError` names the unknown key
- **AND** no store opens

#### Scenario: The loader rejects an empty path

- **GIVEN** a settings file whose `backupDirectory` is `""`
- **WHEN** a caller loads the settings
- **THEN** a `SettingsError` names `backupDirectory` and states that the value must be a non-empty string

#### Scenario: The server exits when the settings file is missing

- **GIVEN** a start command with `PENTIX_SERVER_SETTINGS_FILE` set to a missing path
- **WHEN** `apps/pentix-server/dist/main.js` runs
- **THEN** the process prints the `SettingsError` message
- **AND** it exits with code `1`
- **AND** it listens on no port

