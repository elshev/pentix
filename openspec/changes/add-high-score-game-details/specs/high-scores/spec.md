## ADDED Requirements

### Requirement: One high-score row expands to its game and its best sessions

`GET /v1/high-scores/{sessionId}` SHALL return `200 OK` with one row's values,
that session's `statistics`, its stored game in compact form, and
`bestSessions`. The response SHALL carry `sessionId`, `name`, `score`,
`achievedAt`, `type`, `gameId`, `statistics`, `game`, and `bestSessions`.

`statistics` SHALL carry `score`, `level`, `clearedLines`, `blocks`, and
`actions`. It SHALL NOT carry `pieceCounts`.

`game` SHALL carry `id`, `name`, `width`, `height`, `board`, and `pieceIds`.
`board` SHALL be one row-major line of `width * height` characters. The
character `1` marks an occupied cell, and `0` marks a free cell. `pieceIds`
SHALL be a base64 string with one byte per piece id in stored order. The piece
catalog keeps every id below `255`, so one byte holds each id. `game` SHALL NOT
carry a nested board snapshot and SHALL NOT carry `availablePieceIds`.

`bestSessions` SHALL hold only sessions with status `game-over` whose `gameId`
matches the row's session. Each entry SHALL carry `sessionId`, `userId`, `name`,
`engineId` when the user has one, `type`, `level` when the log has one,
`seedColumn` when the log has one, `score`, `clearedLines`, `blocks`,
`achievedAt`, and `actions`. `name` SHALL be the retained user name, or the user
id when the user is no longer retained. `type` SHALL be the retained user type,
or `human` when the user is no longer retained.

`actions` SHALL be an array of action strings. Entry `i` SHALL hold the actions
of the piece at index `i` of `game.pieceIds`, so an entry SHALL NOT repeat a
piece id. An entry of type `ai` SHALL omit every `T` code, because demo playback
adds one tick after each action and after the log ends. An entry of type `human`
SHALL keep every recorded `T` code.

The list SHALL order by `score` descending, then `achievedAt` ascending, then
`sessionId` ascending. `achievedAt` SHALL be the stored high-score row value
when that row exists, and the UUIDv7 timestamp of the session id otherwise. The
list SHALL hold at most `bestSessionCount` entries. The optional
`bestSessionCount` query parameter SHALL default to `9` and SHALL accept an
integer from `1` to `32`.

A missing high-score row and a row without a stored session log SHALL answer
`404 Not Found` with a message that names the session id. A session id that is
not a UUIDv7 value and a `bestSessionCount` outside `1` to `32` SHALL answer
`400 Bad Request` with a message that names the accepted value. A request SHALL
NOT create, update, or delete a high-score row, session log, game, or user.

#### Scenario: A client expands one row

- **GIVEN** a human high-score row for session `S` with score `1200` on game `G`
- **WHEN** a client sends `GET /v1/high-scores/S`
- **THEN** the response status is `200`
- **AND** it carries `sessionId` `S`, score `1200`, and `gameId` `G`
- **AND** its `statistics` reports score `1200`
- **AND** its `statistics` carries no `pieceCounts` field
- **AND** `game` reports the stored width and height
- **AND** `game.board` holds `width * height` characters of `0` and `1`
- **AND** decoding `game.pieceIds` yields the stored piece id sequence

#### Scenario: Best sessions come from the same game

- **GIVEN** finished sessions `S1`, `S2`, and `S3` on game `G` and finished
  session `S4` on another game
- **WHEN** a client reads the detail of `S1`
- **THEN** `bestSessions` holds `S1`, `S2`, and `S3`
- **AND** no entry names `S4`

#### Scenario: The best sessions rank like the table

- **GIVEN** three finished sessions on one game with scores `800`, `1200`, and
  `1200`, where the two `1200` rows carry dates `D2` and `D1`
- **WHEN** a client reads the detail with the default count
- **THEN** the entry with date `D1` comes first
- **AND** the entry with date `D2` comes second
- **AND** the entry with score `800` comes last

#### Scenario: The count bounds the list

- **GIVEN** nine finished sessions on one game
- **WHEN** a client sends `GET /v1/high-scores/S?bestSessionCount=3`
- **THEN** `bestSessions` holds three entries
- **AND** they are the three highest scores in table order

#### Scenario: The default count covers one session per engine

- **GIVEN** nine finished engine sessions on one game
- **WHEN** a client sends `GET /v1/high-scores/S`
- **THEN** `bestSessions` holds nine entries

#### Scenario: An AI entry drops its tick codes

- **GIVEN** a demo log with `level` `9`, `seedColumn` `7`, and actions `LCT` on
  its first piece
- **WHEN** a client reads its high-score detail
- **THEN** its entry reports `type` `ai`, `level` `9`, and `seedColumn` `7`
- **AND** its `actions` array holds `LC` at that piece index

#### Scenario: A human entry keeps its tick codes

- **GIVEN** a human log whose first piece holds actions `LTT`
- **WHEN** a client reads its high-score detail
- **THEN** its entry reports `type` `human`
- **AND** it carries no `level` and no `seedColumn`
- **AND** its `actions` array holds `LTT` at that piece index

#### Scenario: A missing row or log answers 404

- **GIVEN** a server whose table holds no row for session `X`, and a row `Y`
  whose stored log is absent
- **WHEN** a client reads the detail of `X` or `Y`
- **THEN** each response status is `404`
- **AND** the message names the requested session id

#### Scenario: A malformed request answers 400

- **GIVEN** a running server
- **WHEN** a client reads a detail with a non-UUIDv7 id, or with
  `bestSessionCount` of `0`, `33`, or `1.5`
- **THEN** the response status is `400`
- **AND** the message names the accepted value


## MODIFIED Requirements

### Requirement: PentixServer serves the high-score endpoint

`GET /v1/high-scores` SHALL require a `type` query parameter with the value
`ai` or `human`. It SHALL return `200 OK` with an object that carries `type`
and `scores`. `scores` SHALL be an array in table order, and each entry SHALL
carry `sessionId`, `name`, `score`, and `achievedAt`. The array SHALL be empty
when the table holds no row for that type. A missing `type` value, a repeated
`type` value, or another value SHALL return `400 Bad Request` with the message
`High score type must be one of: ai, human.` The response content type SHALL
be `application/json`. The endpoint SHALL be read-only.

#### Scenario: A client reads the human table

- **GIVEN** a human table with rows of `1200` and `800`
- **WHEN** a client sends `GET /v1/high-scores?type=human`
- **THEN** the response status is `200`
- **AND** the body carries `type` `human`
- **AND** its `scores` array lists `1200` before `800`
- **AND** every entry carries `sessionId`, `name`, `score`, and `achievedAt`

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

#### Scenario: The server rejects a bad filter

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
