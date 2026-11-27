## MODIFIED Requirements

### Requirement: The documentation describes the server demo batches

The repository documentation SHALL describe the server-side demo batches as a shipped capability. That capability is `POST /demo-runs` with its `gameCount` parameter, default `1` and maximum `256`. It includes the background execution and the retrievable status. It includes the standings, ordered winner to loser, with name, points, lines, pieces, and planning time. The documentation SHALL state that a run record is in memory only and that a restart forgets its id. It SHALL state that each finished demo session is stored as an action log under its engine's AI user, in the `PENTIX_DATA_FILE` store. It SHALL state that the browser attract demo stays local and stores nothing. The documentation SHALL also describe the shared demo playback in `pentix-core`, which covers seeded demo sessions, Action-then-Tick replay, the recorded log, and plan-time measurement. It SHALL NOT present demo games as something that can only be watched in the browser.

#### Scenario: The Server API section lists the demo endpoints

- **GIVEN** a developer reading `README.md`
- **WHEN** they look up the server API
- **THEN** `POST /demo-runs` and `GET /demo-runs/{id}` are documented
- **AND** the `gameCount` default and maximum are stated
- **AND** the standings fields are named

#### Scenario: The shipped demo batches are not listed as missing

- **GIVEN** the "not implemented yet" section of the root documentation
- **WHEN** a developer reads it
- **THEN** server demo runs are not listed there
- **AND** the absence of a UI for them is stated
- **AND** the in-memory run record and the durable demo sessions are both stated
- **AND** the missing browser-to-server connection is stated

#### Scenario: The foundation notes explain the shared playback

- **GIVEN** a developer reading `docs/foundation.md`
- **WHEN** they look for how a demo is played without a browser
- **THEN** they find the shared playback module in `pentix-core`, its seeded session and Action-then-Tick rules, and the plan-time measurement
- **AND** they find the recorded session log that the playback returns
- **AND** they find the demo-run service in `apps/pentix-server`, its in-memory run record, and its durable demo sessions

## ADDED Requirements

### Requirement: The documentation names the AI users and the stored demo sessions

The repository documentation SHALL state that a `User` has a `type` of `human` or `ai`. It SHALL state that every registered demo engine owns one AI `User` row with an `engineId`, and that a client filters on `type` to read only human users. `GLOSSARY.md` SHALL define `User type`, `AI user`, and `Demo session log`. The foundation note SHALL name the four added storage columns and the in-place migration. `docs/decisions/README.md` SHALL gain one row for this change when `openspec archive` moves it.

#### Scenario: A developer looks up the user type

- **GIVEN** a developer who reads `GLOSSARY.md`
- **WHEN** they look for the user type
- **THEN** the entry names `User type`, the values `human` and `ai`, and the `engineId` binding
- **AND** it states that `README.md` does not repeat the entry

#### Scenario: The documentation describes the stored demo sessions

- **GIVEN** a developer who reads the storage section
- **WHEN** they look for demo persistence
- **THEN** the text names the AI user per engine
- **AND** it names the stored game and session log per finished demo session
- **AND** it names the `PENTIX_DATA_FILE` setting

#### Scenario: The decision index gains the record

- **GIVEN** this change has been archived
- **WHEN** a developer reads `docs/decisions/README.md`
- **THEN** one row links this design record
- **AND** the row states the date, the scope, and the status
