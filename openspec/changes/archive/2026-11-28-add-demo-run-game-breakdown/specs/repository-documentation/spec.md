## MODIFIED Requirements

### Requirement: The documentation describes the server demo batches

The repository documentation SHALL describe the server-side demo batches as a shipped capability. That capability is `POST /demo-runs` with its `gameCount` parameter, default `1` and maximum `256`. It includes the background execution and the retrievable status. It includes the run result with two sections, `engines` and `games`. It SHALL state that `engines` lists one line per engine, ordered winner to loser. Each line carries `engineId`, `name`, `totalPoints`, `totalLines`, `totalPieces`, planning time, and time per `1000` pieces over every game, and no `description`. It SHALL state that `games` lists one entry per finished game, ordered by `index`. It SHALL state that each entry carries the zero-based `index`, the stored game `id`, and its own `standings`. It SHALL state that a game's `standings` is ordered by points, then lines, then pieces, then shorter planning time, then engine id. It SHALL state that a game row carries `engineId`, points, lines, pieces, and planning time, and no engine name and no rate. It SHALL state that the time per `1000` pieces is `null` when `totalPieces` is `0`. The documentation SHALL state that a run record is in memory only and that a restart forgets its id. It SHALL state that each finished demo session is stored as an action log under its engine's AI user, in the `PENTIX_DATA_FILE` store. It SHALL state that the browser attract demo stays local and stores nothing. The documentation SHALL also describe the shared demo playback in `pentix-core`, which covers seeded demo sessions, Action-then-Tick replay, the recorded log, and plan-time measurement. It SHALL NOT present demo games as something that can only be watched in the browser.

#### Scenario: The Server API section lists the demo endpoints

- **GIVEN** a developer reading `README.md`
- **WHEN** they look up the server API
- **THEN** `POST /demo-runs` and `GET /demo-runs/{id}` are documented
- **AND** the `gameCount` default and maximum are stated
- **AND** the `engines` and `games` sections are named

#### Scenario: The result fields name the per-game breakdown

- **GIVEN** a developer reading the `GET /v1/demo-runs/{id}` paragraph
- **WHEN** they look for the game of a score
- **THEN** the paragraph names the `engines` list with `engineId`, `name`, and the `total*` fields
- **AND** it names the `games` list with `index`, `id`, and `standings`
- **AND** it names `playingTimePer1000PiecesMs` on an engine line and states that a game row omits it
- **AND** it states the `null` value for a line without total pieces

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
- **AND** they find the engine ranking, the per-game standings, and the time per `1000` pieces rule
