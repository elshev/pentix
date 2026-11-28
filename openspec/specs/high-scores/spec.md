# high-scores Specification

## Purpose
TBD - created by archiving change add-highscore-api. Update Purpose after archive.
## Requirements
### Requirement: A finished session enters the high-score table

`HighScoreService` SHALL submit one high-score row when a session changes to
`game-over`. The row SHALL carry the session id, the user id, the user name,
the user type, the session's `statistics.score`, and one achievement date. The
user type SHALL be `ai` or `human`. The achievement date SHALL be the server
clock value at submission, written as an ISO 8601 UTC string.
`HighScoreRepository.submit` SHALL insert or update the row by `session_id`, so
a repeated submission SHALL NOT create a second row. A session that is still
`active` SHALL NOT enter the table. The score SHALL be a non-negative integer.

#### Scenario: A finished human game enters the human table

- **GIVEN** a human session that reaches `game-over` with a score of `1200`
- **WHEN** the lifecycle submits the session
- **THEN** the table holds one row for that session
- **AND** the row carries the user name, type `human`, score `1200`, and the
  clock value as `achievedAt`

#### Scenario: An unfinished game waits

- **GIVEN** an `active` session with a score above every stored row
- **WHEN** the session saves an action
- **THEN** the table holds no row for that session

#### Scenario: A repeated submission updates one row

- **GIVEN** a stored row for session `S`
- **WHEN** the service submits session `S` again
- **THEN** the table still holds exactly one row for `S`
- **AND** the row carries the latest score and achievement date

### Requirement: The table keeps 1000 rows per user type

The high-score table SHALL hold at most 1000 rows of type `ai` and at most
1000 rows of type `human`. `HIGH_SCORE_TABLE_SIZE` SHALL be `1000`, and both
repository implementations SHALL enforce that limit on every `submit` and
`replace`. Rows SHALL be ordered by `score` descending, then `achievedAt`
ascending, then `sessionId` ascending. A submission SHALL delete every row of
its type beyond the first 1000 rows in that order. The stored rows SHALL
survive a close and a reopen of the store.

#### Scenario: A row enters while the table has room

- **GIVEN** a human table with fewer than 1000 rows
- **WHEN** a finished session submits a score of `0`
- **THEN** the row is stored
- **AND** it ranks last while every other row has a higher score

#### Scenario: A better row pushes out the last row

- **GIVEN** a human table with 1000 rows and a lowest score of `10`
- **WHEN** a finished session submits a score of `50`
- **THEN** the table holds 1000 rows
- **AND** the new row is present
- **AND** the row with score `10` is gone

#### Scenario: A weak row does not enter a full table

- **GIVEN** a human table with 1000 rows and a lowest score of `10`
- **WHEN** a finished session submits a score of `5`
- **THEN** the table holds the same 1000 rows
- **AND** the submitted session has no row

#### Scenario: Equal scores order by date and then session id

- **GIVEN** three rows with score `100` and achievement dates `D1`, `D2`, and
  `D3` in that order
- **WHEN** the human table is read
- **THEN** the row with `D1` comes first
- **AND** a row with the same date orders by its session id

#### Scenario: The limit survives a restart

- **GIVEN** a SQLite store with 1500 submitted human rows
- **WHEN** the store closes and a new store opens the same file
- **THEN** the human table holds the best 1000 rows
- **AND** their order matches the order before the close

### Requirement: The endpoint answers from memory

`HighScoreService` SHALL read every stored row once during startup and SHALL
keep the two ordered lists in memory. `GET /v1/high-scores` SHALL answer from
those lists. A request SHALL NOT read the `high_scores` table or the
`game_sessions` table. A successful submission SHALL write through the
repository first and SHALL update the lists after that write succeeds. A
failed repository write SHALL leave both lists unchanged.

#### Scenario: A read does not touch the store

- **GIVEN** a running server whose service loaded its rows at startup
- **WHEN** a repository spy records calls and a client fetches
  `GET /v1/high-scores?type=human`
- **THEN** the response holds the loaded rows
- **AND** the spy records no `load`, `submit`, or `replace` call during the
  request

#### Scenario: A submission updates the next read

- **GIVEN** a loaded human table
- **WHEN** a finished session submits a score above every stored row
- **THEN** the next `GET /v1/high-scores?type=human` lists that row first

#### Scenario: A failed write leaves the cache intact

- **GIVEN** a repository whose `submit` rejects
- **WHEN** a finished session submits a score
- **THEN** the request or run reports the failure
- **AND** the next read returns the rows from before the submission

### Requirement: An empty table is rebuilt from stored sessions

When the loaded table holds no rows, `PentixGameLifecycle.load()` SHALL pass
every replayed session to `HighScoreService.backfill`. Backfill SHALL keep the
sessions with status `game-over` and SHALL skip every other session. It SHALL
derive `achievedAt` from the UUIDv7 timestamp of the session id and SHALL skip
a session whose id is not a UUIDv7 value. It SHALL write the best 1000 rows
per type through one `HighScoreRepository.replace` call. Backfill SHALL NOT
run when the loaded table holds at least one row. A repeated start SHALL keep
the rows and SHALL NOT rewrite them.

#### Scenario: An upgraded store gains its scores

- **GIVEN** a SQLite file with finished human and AI session logs and no
  `high_scores` table
- **WHEN** the server starts on that file
- **THEN** the table holds a row for each finished session
- **AND** every `achievedAt` equals the UUIDv7 timestamp of its session id
- **AND** each type is ordered by score, date, then session id

#### Scenario: A finished session without a UUIDv7 id is skipped

- **GIVEN** an empty table and one finished session whose id is `session-demo`
- **WHEN** the server starts
- **THEN** the table holds no row for that session

#### Scenario: An unfinished session is skipped

- **GIVEN** an empty table and an `active` session with a score
- **WHEN** the server starts
- **THEN** the table holds no row for that session

#### Scenario: A non-empty table is not rewritten

- **GIVEN** a table with one stored row and a finished session with a higher
  score
- **WHEN** the server starts
- **THEN** the table holds only the stored row
- **AND** the repository records no `replace` call

### Requirement: PentixServer serves the high-score endpoint

`GET /v1/high-scores` SHALL require a `type` query parameter with the value
`ai` or `human`. It SHALL return `200 OK` with an object that carries `type`
and `scores`. `scores` SHALL be an array in table order, and each entry SHALL
carry `name`, `score`, and `achievedAt`. The array SHALL be empty when the
table holds no row for that type. A missing `type` value, a repeated `type`
value, or another value SHALL return `400 Bad Request` with the message
`High score type must be one of: ai, human.` The response content type SHALL
be `application/json`. The endpoint SHALL be read-only.

#### Scenario: A client reads the human table

- **GIVEN** a human table with rows of `1200` and `800`
- **WHEN** a client sends `GET /v1/high-scores?type=human`
- **THEN** the response status is `200`
- **AND** the body carries `type` `human`
- **AND** its `scores` array lists `1200` before `800`
- **AND** every entry carries `name`, `score`, and `achievedAt`

#### Scenario: A client reads the AI table

- **GIVEN** AI rows from demo sessions
- **WHEN** a client sends `GET /v1/high-scores?type=ai`
- **THEN** the body carries `type` `ai`
- **AND** every entry names an AI user
- **AND** no human row appears

#### Scenario: An empty table returns an empty list

- **GIVEN** a server with no finished session
- **WHEN** a client sends `GET /v1/high-scores?type=ai`
- **THEN** the response status is `200`
- **AND** its `scores` array is empty

#### Scenario: A bad filter is rejected

- **GIVEN** a running server
- **WHEN** a client sends `GET /v1/high-scores`, `GET /v1/high-scores?type=bot`,
  or `GET /v1/high-scores?type=ai&type=human`
- **THEN** the response status is `400`
- **AND** the message is `High score type must be one of: ai, human.`
- **AND** the response content type is `application/json`

#### Scenario: A read changes nothing

- **GIVEN** a server that holds users, games, sessions, and high-score rows
- **WHEN** a client sends both valid high-score requests
- **THEN** no user, game, session, demo run, or high-score row changes

### Requirement: Every completion path submits a score

`PentixGameLifecycle` SHALL submit the score after it stores the final session
log and after a next-piece request ends a session. `DemoRunService` SHALL
submit the score after it stores each finished engine session. The session log
write SHALL happen before the score submission. A repository failure in the
lifecycle SHALL fail the request with `500`. A repository failure in a demo
run SHALL report the run as `failed` with the storage message.

#### Scenario: The last gameplay action fills the table

- **GIVEN** a human session whose next tick ends the game
- **WHEN** the client sends `POST /v1/game-sessions/{id}/tick`
- **THEN** the response status is `200`
- **AND** the session's score appears in the human table
- **AND** the session log was stored before the score row

#### Scenario: A demo run fills the AI table

- **GIVEN** a completed demo run over two engines
- **WHEN** the run finishes
- **THEN** the AI table holds one row per finished engine session
- **AND** each row names that engine's AI user

#### Scenario: A storage failure fails the request

- **GIVEN** a high-score repository whose `submit` rejects
- **WHEN** a gameplay action ends a session
- **THEN** the response status is `500`
- **AND** the session log is still stored

#### Scenario: A storage failure fails the run

- **GIVEN** a high-score repository whose `submit` rejects
- **WHEN** a demo session reaches `game-over`
- **THEN** the run reports `failed`
- **AND** the snapshot carries the storage error message

