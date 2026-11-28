## ADDED Requirements

### Requirement: The documentation states where the server stores and backs up its data

The repository documentation SHALL name the app settings file, the data file, the backup directory, and the backup command.

`README.md` SHALL state that `apps/pentix-server/settings.json` holds `dataFile` and `backupDirectory`. It SHALL state that the shipped values are `C:\db\pentix\pentix.db` and `C:\db\Backups\pentix`, and that `PENTIX_SERVER_SETTINGS_FILE`, `PENTIX_DATA_FILE`, and `PENTIX_BACKUP_DIRECTORY` override them. It SHALL state that a missing or invalid settings file fails startup. Its command list SHALL hold `npm run backup:server` with the `<yyyyMMddHHmm>-pentix.db` name and the refusal to replace an existing file.

`docs/foundation.md` SHALL state the same settings precedence in its persistence section. It SHALL state that a backup file is a full SQLite database, and that a restore copies it back as a data file.

`GLOSSARY.md` SHALL define the terms `App settings`, `Data file`, `Backup directory`, and `Storage backup`, each with its code name and its avoid list.

No document SHALL name `data/pentix.db` as the default data file after this change.

#### Scenario: A developer finds the data file from the documentation

- **GIVEN** a developer who reads `README.md` and `docs/foundation.md`
- **WHEN** they look for where the server keeps its data
- **THEN** both documents name `apps/pentix-server/settings.json` and the `dataFile` key
- **AND** both state the `C:\db\pentix\pentix.db` default
- **AND** neither names `data/pentix.db` as the default

#### Scenario: The documentation covers the backup command and its file name

- **GIVEN** a developer who reads the `README.md` command list
- **WHEN** they look for the backup command
- **THEN** the list holds `npm run backup:server`
- **AND** the entry states the `<yyyyMMddHHmm>-pentix.db` name and the backup directory
- **AND** it states that an existing file is never replaced

#### Scenario: The glossary holds the new terms

- **GIVEN** a developer who opens `GLOSSARY.md`
- **WHEN** they look for the storage terms
- **THEN** the file defines `App settings`, `Data file`, `Backup directory`, and `Storage backup`
- **AND** every entry carries a code name and an avoid list
