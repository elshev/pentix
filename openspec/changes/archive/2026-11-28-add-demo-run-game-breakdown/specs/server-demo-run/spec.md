## MODIFIED Requirements

### Requirement: A batch plays one session per registered engine per game

Each game of a run SHALL create one `PentixGame` through the server's id and piece-selection seams. The service SHALL store that game through the game repository. The game SHALL create one demo session for every engine registered in the shared demo engine registry, in registration order. All sessions of one game SHALL belong to that one game. In this way the engines at the same `nextPieceIndex` hold the same pieces. A playback that extends the sequence SHALL extend it for the engines that follow. Each session SHALL be created through the shared demo-session factory, seeded with one settled mino and opened at the run's demo starting level. Each session SHALL use the AI user of its engine as `userId`. The run's engine set SHALL be fixed when the run starts and reported in the snapshot. In this way a registry change during a batch does not add or remove a competitor mid-run. When a session reaches `game-over`, the service SHALL store its action log through the session repository.

#### Scenario: Every registered engine competes

- **GIVEN** the built-in registry with its nine engines
- **WHEN** a run starts
- **THEN** the snapshot lists those nine engine ids
- **AND** every one of them receives a session in every game
- **AND** every session names its engine's AI user

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
- **AND** each session is stored under its own id when it ends

#### Scenario: A new engine joins the field without server code changes

- **GIVEN** a registry that lists an additional engine module
- **WHEN** a run starts
- **THEN** the snapshot lists the extra engine id
- **AND** it receives a session in every game
- **AND** no `apps/pentix-server` code names that engine

### Requirement: A run reports its status while it plays

`GET /demo-runs/{id}` SHALL return `200 OK` with the run's snapshot, `404 Not Found` for a run id that is unknown, and `400 Bad Request` for an id that is not a UUIDv7 value. The snapshot SHALL carry `id`, `status`, `gameCount`, `completedGameCount`, `engines`, and `games`, plus `error` only when the status is `failed`. `status` SHALL be `queued`, `running`, `completed`, or `failed`. `completedGameCount` SHALL count only fully played games, SHALL never decrease, and SHALL be `0` until the first game ends. `engines` SHALL hold one line per competing engine from the start, with zero values until the first game ends. `games` SHALL hold one entry per finished game, ordered by `index` ascending, and its length SHALL equal `completedGameCount`. A failed run SHALL carry a message naming the cause, SHALL publish no game entries, and SHALL report zero values for every engine.

#### Scenario: A fresh run is queued

- **GIVEN** a run that was just created
- **WHEN** its id is fetched immediately
- **THEN** the status is `queued` or `running`
- **AND** `games` is empty
- **AND** every engine line reports zero total points, total lines, total pieces, and playing time
- **AND** every engine line reports a `null` rate

#### Scenario: Progress is visible

- **GIVEN** a run of `2` games still playing
- **WHEN** its id is fetched after the first game ends
- **THEN** `completedGameCount` is `1`
- **AND** `games` holds one entry with `index` `0`
- **AND** the status is `running`

#### Scenario: A completed run publishes its results

- **GIVEN** a run whose last game ended
- **WHEN** its id is fetched
- **THEN** the status is `completed`
- **AND** `completedGameCount` equals `gameCount`
- **AND** `games` holds `gameCount` entries
- **AND** `engines` holds one line per engine

#### Scenario: A failed run publishes no game entries

- **GIVEN** a run that fails part-way
- **WHEN** its id is fetched
- **THEN** the status is `failed`
- **AND** `error` names the cause
- **AND** `games` is empty
- **AND** every engine line reports zero totals

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

`engines` SHALL list every engine that started the run exactly once, ordered by `totalPoints` descending, then `totalLines` descending, then `totalPieces` descending, then `playingTimeMs` ascending, then `engineId` ascending. Each line SHALL carry `engineId`, `name`, `totalPoints`, `totalLines`, `totalPieces`, `playingTimeMs`, and `playingTimePer1000PiecesMs`. `totalPoints`, `totalLines`, and `totalPieces` SHALL be the totals of `statistics.score`, `statistics.clearedLines`, and `statistics.blocks` over the run's finished games. `playingTimeMs` SHALL be the total planning time over those games. `name` SHALL be the registry display name of the engine. A line SHALL NOT carry the engine `description`.

`games` SHALL list one entry per finished game, ordered by `index` ascending. Each entry SHALL carry `index`, `id`, and `standings`. `index` SHALL be the zero-based position of the game in the run. `id` SHALL be the UUIDv7 id of the `PentixGame` that the game created. A game's `standings` SHALL list every engine of the run exactly once, ordered by that game's `points` descending, then `lines`, then `pieces`, then shorter `playingTimeMs`, then `engineId`. Each row SHALL carry `engineId`, `points`, `lines`, `pieces`, and `playingTimeMs`, and those fields SHALL describe that one game. A row SHALL NOT carry the engine `name` and SHALL NOT carry a rate. An engine line's `totalPoints`, `totalLines`, `totalPieces`, and `playingTimeMs` SHALL equal the sum of the same fields over its rows in `games`, up to the three-decimal rounding. Every order SHALL be stable across reads of the same run.

#### Scenario: The highest score wins the run

- **GIVEN** a completed run whose engines ended with different totals
- **WHEN** the `engines` list is read
- **THEN** the first line has the highest `totalPoints`
- **AND** the last line has the lowest
- **AND** every line names its engine's display name

#### Scenario: Totals are summed across games

- **GIVEN** an engine that scored `100` points in one game and `150` in the next
- **WHEN** the completed run's engine line is read
- **THEN** it reports `250` `totalPoints`
- **AND** its `totalLines` and `totalPieces` are summed the same way

#### Scenario: Each game keeps its own entry

- **GIVEN** a completed run of `2` games over `2` engines
- **WHEN** the `games` list is read
- **THEN** it holds two entries
- **AND** their `index` values are `0` and `1` in that order
- **AND** each entry names the UUIDv7 id of a stored game
- **AND** no two entries report the same `index`

#### Scenario: Each game orders its own standings

- **GIVEN** a completed run whose first game ended with `alpha` above `beta` and whose second game ended with `beta` above `alpha`
- **WHEN** the `games` list is read
- **THEN** `games[0].standings` lists `alpha` first
- **AND** `games[1].standings` lists `beta` first
- **AND** each row reports the score, lines, pieces, and time of that one game

#### Scenario: The game rows add up to the engine line

- **GIVEN** a completed run of `3` games
- **WHEN** one engine line is read
- **THEN** its `totalPoints`, `totalLines`, `totalPieces`, and `playingTimeMs` equal the sum of its rows in `games`
- **AND** the sums agree to three decimals
- **AND** its `playingTimePer1000PiecesMs` comes from those totals

#### Scenario: Equal points break on lines, pieces, and time

- **GIVEN** two engines with equal `points` in one game
- **WHEN** that game's `standings` is read
- **THEN** the engine with more `lines` comes first
- **AND** if those are equal, more `pieces` comes first
- **AND** if those are equal, the shorter `playingTimeMs` comes first
- **AND** if everything is equal, engine id order decides

#### Scenario: Every competitor is listed once

- **GIVEN** a completed run over the nine built-in engines
- **WHEN** the result is read
- **THEN** `engines` holds nine lines
- **AND** every game entry holds nine rows
- **AND** no `engineId` appears twice in either list

### Requirement: Playing time counts only plan executions

`playingTimeMs` SHALL be the sum of the durations measured around each engine `plan` call, in fractional milliseconds rounded to three decimals. It SHALL exclude playback overhead, engine operations, gravity ticks, and game creation, SHALL be non-negative, and SHALL grow only when an engine plans. A run whose engines return empty logs SHALL still report each engine's planning time. It SHALL appear on every engine line and on every game row.

`playingTimePer1000PiecesMs` SHALL appear on every engine line and SHALL NOT appear on a game row. It SHALL be `playingTimeMs` multiplied by `1000`, divided by `totalPieces`, and rounded to three decimals. It SHALL be `null` when `totalPieces` is `0`. The service SHALL round the `playingTimeMs` of every game row to three decimals. It SHALL sum those rounded values into the engine total and SHALL round the total again to three decimals. It SHALL compute the rate from the reported `playingTimeMs` and `totalPieces` of its own line.

#### Scenario: Ticks are not billed as playing time

- **GIVEN** two engines that return the same empty log, one facing a taller starting stack
- **WHEN** their game rows are compared
- **THEN** neither `playingTimeMs` includes the extra gravity ticks
- **AND** both values stay non-negative

#### Scenario: The reported value has millisecond precision

- **GIVEN** a completed run
- **WHEN** a `playingTimeMs` value is read
- **THEN** it is a number with no more than three decimals
- **AND** it is at least the sum of its plans' measured durations

#### Scenario: The rate reports the cost of 1000 pieces

- **GIVEN** an engine line whose `playingTimeMs` is `4.5` and whose `totalPieces` is `300`
- **WHEN** the line is read
- **THEN** `playingTimePer1000PiecesMs` is `15`
- **AND** the game rows carry no such field

#### Scenario: A piece-less line reports no rate

- **GIVEN** a completed run whose engine placed `0` pieces in every game
- **WHEN** its engine line is read
- **THEN** `playingTimeMs` is `0`
- **AND** `playingTimePer1000PiecesMs` is `null`

#### Scenario: Game times sum into the engine total

- **GIVEN** a completed run of `2` games whose rounded times are `1.25` and `2.5`
- **WHEN** the engine line is read
- **THEN** its `playingTimeMs` is `3.75`
- **AND** its rate comes from `3.75` and its `totalPieces`
