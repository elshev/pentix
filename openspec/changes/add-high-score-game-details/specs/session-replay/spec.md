## ADDED Requirements

### Requirement: A stored session log is readable for replay

`GET /v1/high-scores/{sessionId}` SHALL return every session log in
`bestSessions` as per-piece action strings without changing it. Entry `i` of
`actions` SHALL hold the actions of the piece at index `i` of `game.pieceIds`.
A demo log SHALL omit every `T` code, because demo playback adds the tick after
each action and after the log ends. A human log SHALL keep every recorded `T`
code. The response SHALL carry the stored game as a compact board line and a
base64 piece sequence. A client can then replay every returned action list
against that game.

A human game on the same piece sequence SHALL use `POST /v1/game-sessions` with
the returned `gameId`. The new session SHALL start from the stored game board
and piece sequence, and it SHALL carry a new session id. A detail read SHALL
NOT append an action, rewrite a log, or change a game.

#### Scenario: The returned actions match the store

- **GIVEN** a stored demo log whose pieces hold `pieceId` `3` with actions `LCT`
  and `pieceId` `7` with actions `HR`
- **WHEN** a client reads its high-score detail
- **THEN** `game.pieceIds` decodes to `3` and `7` in that order
- **AND** its `actions` array holds `LC` and `HR` in that order
- **AND** those strings are the stored actions without their `T` codes

#### Scenario: A demo log keeps its opening fields

- **GIVEN** a stored demo log with `level` `9` and `seedColumn` `7`
- **WHEN** a client reads its high-score detail
- **THEN** its entry carries `level` `9` and `seedColumn` `7`

#### Scenario: A human log keeps its ticks

- **GIVEN** a stored human log whose first piece holds actions `LTT`
- **WHEN** a client reads its high-score detail
- **THEN** its entry carries no `level` and no `seedColumn`
- **AND** its first action string is `LTT`

#### Scenario: A human replay opens on the stored game

- **GIVEN** a detail response that carries game `G`
- **WHEN** a human user starts a session with `POST /v1/game-sessions` and
  `gameId` `G`
- **THEN** the new session reports `gameId` `G`
- **AND** its board equals the board that `game.board` encodes
- **AND** its session id differs from the row's session id

#### Scenario: A detail read appends nothing

- **GIVEN** a stored log with `pieces` of length `12`
- **WHEN** a client reads its high-score detail
- **THEN** the stored log still holds `12` entries
- **AND** every action string stays unchanged
