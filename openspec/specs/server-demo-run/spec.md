# server-demo-run Specification

## Purpose
TBD - created by archiving change add-server-play-demo. Update Purpose after archive.
## Requirements
### Requirement: The server starts demo batches on demand

`PentixServer` SHALL expose `POST /demo-runs` that starts a demo batch in the background and answers `202 Accepted` with the new run's snapshot. The request body SHALL be optional and SHALL accept one field, `gameCount`, which is the number of games the batch plays. An absent field SHALL mean `1`. A supplied value SHALL be an integer from `1` to `256`. The server SHALL reject any other value with `400 Bad Request` and a message that names the accepted range. Zero, a negative number, a fraction, a string, `null`, or a value more than `256` are such other values. The endpoint SHALL NOT play a game before it responds, SHALL NOT require a user, game, or session id, and SHALL have no UI counterpart.

#### Scenario: A run starts with the default game count

- **GIVEN** a running `PentixServer` and a request body without `gameCount`
- **WHEN** a caller posts to `/demo-runs`
- **THEN** the response status is `202`
- **AND** its snapshot reports `gameCount` `1`
- **AND** the snapshot id is a UUIDv7

#### Scenario: The maximum batch is accepted

- **GIVEN** a request body of `{ "gameCount": 256 }`
- **WHEN** a caller posts to `/demo-runs`
- **THEN** the response status is `202`
- **AND** the snapshot reports `gameCount` `256`

#### Scenario: An invalid game count is rejected

- **GIVEN** a request body whose `gameCount` is `0`, `257`, `1.5`, or `"3"`
- **WHEN** a caller posts to `/demo-runs`
- **THEN** the response status is `400`
- **AND** the message names the accepted `1` to `256` range
- **AND** no run is created

#### Scenario: The response arrives before the games are played

- **GIVEN** a fresh run of `2` games
- **WHEN** the `POST /demo-runs` response is received
- **THEN** the reported status is `queued` or `running`
- **AND** its `completedGameCount` is less than `2`

### Requirement: A batch plays one session per registered engine per game

Each game of a run SHALL create one `PentixGame` through the server's id and piece-selection seams. The game SHALL create one demo session for every engine registered in the shared demo engine registry, in registration order. All sessions of one game SHALL belong to that one game. In this way the engines at the same `nextPieceIndex` hold the same pieces. A playback that extends the sequence SHALL extend it for the engines that follow. Each session SHALL be created through the shared demo-session factory, seeded with one settled mino and opened at the run's demo starting level. The run's engine set SHALL be fixed when the run starts and reported in the snapshot. In this way a registry change during a batch does not add or remove a competitor mid-run.

#### Scenario: Every registered engine competes

- **GIVEN** the built-in registry with its nine engines
- **WHEN** a run starts
- **THEN** the snapshot lists those nine engine ids in registration order
- **AND** every one of them receives a session in every game

#### Scenario: One game, one piece sequence

- **GIVEN** a batch game whose engines have reached the same `nextPieceIndex`
- **WHEN** their sessions are compared
- **THEN** they report the same `gameId`
- **AND** they hold the same active and next piece keys

#### Scenario: Sessions keep their own play

- **GIVEN** two engines in the same batch game
- **WHEN** the game is played out
- **THEN** each session has a different session id
- **AND** each keeps its own board, statistics, and piece index
- **AND** it is not persisted as a retained game or session

#### Scenario: A new engine joins the field without server code changes

- **GIVEN** a registry that lists an additional engine module
- **WHEN** a run starts
- **THEN** the snapshot lists the extra engine id
- **AND** it receives a session in every game
- **AND** no `apps/pentix-server` code names that engine

### Requirement: A run reports its status while it plays

`GET /demo-runs/{id}` SHALL return `200 OK` with the run's snapshot, `404 Not Found` for a run id that is unknown, and `400 Bad Request` for an id that is not a UUIDv7 value. The snapshot SHALL carry `id`, `status`, `gameCount`, `completedGameCount`, `engines`, and `standings`, plus `error` only when the status is `failed`. `status` SHALL be `queued`, `running`, `completed`, or `failed`. `completedGameCount` SHALL count only fully played games, SHALL never decrease, and SHALL be `0` until the first game ends. `standings` SHALL be an empty array until the status becomes `completed`. A failed run SHALL carry a message naming the cause and SHALL publish no standings.

#### Scenario: A fresh run is queued

- **GIVEN** a run that was just created
- **WHEN** its id is fetched immediately
- **THEN** the status is `queued` or `running`
- **AND** `standings` is empty

#### Scenario: Progress is visible

- **GIVEN** a run of `2` games still playing
- **WHEN** its id is fetched after the first game ends
- **THEN** `completedGameCount` is `1`
- **AND** the status is `running`
- **AND** `standings` is still empty

#### Scenario: A completed run publishes its standings

- **GIVEN** a run whose last game ended
- **WHEN** its id is fetched
- **THEN** the status is `completed`
- **AND** `completedGameCount` equals `gameCount`
- **AND** `standings` holds one line per engine

#### Scenario: Unknown and malformed ids are rejected

- **GIVEN** an id that no run uses, and an id that is not a UUID
- **WHEN** either is fetched
- **THEN** the response status is `404` for the unknown id
- **AND** `400` for the malformed id

#### Scenario: Runs execute one at a time

- **GIVEN** two runs started back to back
- **WHEN** both are fetched while the first is still playing
- **THEN** only the first reports `running`
- **AND** the second reports `queued`

### Requirement: Standings rank the engines winner to loser

Once a run completes, `standings` SHALL list every engine that started the run exactly once, ordered by `points` descending, then `lines` descending, then `pieces` descending, then `playingTimeMs` ascending, then `engineId` ascending. Each line SHALL carry `engineId`, the registry `name`, `points`, `lines`, `pieces`, and `playingTimeMs`. `points`, `lines`, and `pieces` SHALL be the totals of `statistics.score`, `statistics.clearedLines`, and `statistics.blocks` over the run's games, and `playingTimeMs` SHALL be the total planning time over those games. The order SHALL be stable across reads of the same completed run.

#### Scenario: The highest score wins

- **GIVEN** a completed run whose engines ended with different totals
- **WHEN** the standings are read
- **THEN** the first line has the highest `points`
- **AND** the last line has the lowest
- **AND** every line names its engine's display name

#### Scenario: Totals are summed across games

- **GIVEN** an engine that scored `100` points in one game and `150` in the next
- **WHEN** the completed run's standings are read
- **THEN** its line reports `250` points
- **AND** its lines and pieces are summed the same way

#### Scenario: Equal points break on lines, pieces, and time

- **GIVEN** two engines with equal `points`
- **WHEN** their standing lines are read
- **THEN** the one with more `lines` comes first
- **AND** if those are equal, more `pieces` comes first
- **AND** if those are equal, the shorter `playingTimeMs` comes first
- **AND** if everything is equal, engine id order decides

#### Scenario: Every competitor is listed once

- **GIVEN** a completed run over the nine built-in engines
- **WHEN** its standings are read
- **THEN** there are nine lines
- **AND** no `engineId` appears twice

### Requirement: Playing time counts only plan executions

`playingTimeMs` SHALL be the sum of the durations measured around each engine `plan` call during the run, in fractional milliseconds rounded to three decimals. It SHALL exclude playback overhead, engine operations, gravity ticks, and game creation, SHALL be non-negative, and SHALL grow only when an engine plans. A run whose engines return empty logs SHALL still report each engine's planning time.

#### Scenario: Ticks are not billed as playing time

- **GIVEN** two engines that return the same empty log, one facing a taller starting stack
- **WHEN** their standing lines are compared
- **THEN** neither `playingTimeMs` includes the extra gravity ticks
- **AND** both values stay non-negative

#### Scenario: The reported value has millisecond precision

- **GIVEN** a completed run
- **WHEN** a `playingTimeMs` value is read
- **THEN** it is a number with no more than three decimals
- **AND** it is at least the sum of its plans' measured durations

### Requirement: Batch games follow the shared demo rules

The shared demo playback in `pentix-core` SHALL play every session of a run. In that playback, the engine plans once per spawned piece. The playback replays the log one action per beat, with a tick between actions. A hard drop restarts the beat for its post-drop code. Ticks continue after the log ends until the piece locks or the session ends. Sessions SHALL open with the demo's seeded mino and the run's demo starting level. The server SHALL NOT re-implement gameplay. `PentixServer` SHALL expose the demo starting level and the competing engine list as server-context options, so a test can pin them.

#### Scenario: A batch session starts like the browser demo

- **GIVEN** a batch game that just started
- **WHEN** one engine's opening session is inspected
- **THEN** its board holds exactly one settled cell on the row before last
- **AND** its level is the run's demo starting level
- **AND** it reports zero score, lines, and pieces for that cell

#### Scenario: The server does not re-implement gameplay

- **GIVEN** the demo-run service
- **WHEN** its source is reviewed
- **THEN** every movement, rotation, drop, tick, lock, clear, and game-over detection goes through the shared engine
- **AND** the session replay comes from the shared demo playback

### Requirement: Runs live in memory only

A demo run SHALL NOT use the user, game, or session repositories. It SHALL NOT create, update, or remove any retained user, game, or session, whatever storage the server was started with. Finished runs SHALL be retained in server memory, bounded to the `32` most recent completions, and a run SHALL be forgotten when the server process restarts. A run id that was evicted or forgotten SHALL answer `404`.

#### Scenario: Retained state is untouched

- **GIVEN** a server with SQLite storage holding users, games, and sessions
- **WHEN** a demo run completes
- **THEN** the stored users, games, and session logs are unchanged
- **AND** no new row was written

#### Scenario: A restart forgets runs

- **GIVEN** a completed run on a running server
- **WHEN** the server restarts and the run id is fetched
- **THEN** the response status is `404`

#### Scenario: Retention is bounded

- **GIVEN** more than `32` completed runs on one server instance
- **WHEN** the oldest run id is fetched
- **THEN** the response status is `404`
- **AND** the most recent completions are still readable

