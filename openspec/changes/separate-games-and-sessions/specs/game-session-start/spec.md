## MODIFIED Requirements

### Requirement: Shared game-session snapshots define the opening session contract
The shared `pentix-core` package SHALL define a JSON-serializable `PentixGameSession` snapshot contract for a newly started single-player session associated with a `PentixGame`.

The shared snapshot SHALL include:

- a UUIDv7 session `id` and parent `gameId`,
- a nullable `userId`, initially `null`,
- a session status value,
- board dimensions and current board occupancy initialized independently from the game's board,
- opening statistics including score, level, and cleared-line count,
- an active piece state with piece key, rotation angle, and spawn origin,
- a next-piece preview derived from the parent game's piece sequence,
- and a zero-based `nextPieceIndex` identifying the preview's position in that sequence.

The legacy `sessionId` field SHALL NOT be exposed.

#### Scenario: A started session exposes the shared opening fields
- **GIVEN** a caller starts a new `PentixGameSession`
- **WHEN** the returned session snapshot is inspected
- **THEN** it includes `id`, `gameId`, `userId: null`, status, independent board state, opening statistics, active piece state, next-piece preview, and `nextPieceIndex`
- **AND** the board and piece references use the shared Pentix domain vocabulary rather than server-local names
- **AND** the snapshot has no `sessionId` field

### Requirement: Starting a session initializes consistent gameplay defaults
Each new `PentixGameSession` SHALL start from a consistent server-owned opening state derived from its parent game.

The opening state SHALL use:

- an independent copy of the game's initial board,
- score `0`,
- level `1`,
- cleared-line count `0`,
- the game piece at sequence index `0` as the active piece,
- an active piece at rotation angle `0`,
- an active-piece origin at row `1` and column `floor(width / 2)`,
- the game piece at sequence index `1` as one next-piece preview,
- and `nextPieceIndex` equal to `1`.

#### Scenario: A started session begins on an empty default board
- **GIVEN** a caller starts a new `PentixGameSession` using a default game
- **WHEN** the returned opening board and statistics are inspected
- **THEN** the board matches the shared default board size and every board cell is empty
- **AND** the score is `0`, the level is `1`, and the cleared-line count is `0`

#### Scenario: A started session spawns valid opening pieces
- **GIVEN** a caller starts a new `PentixGameSession`
- **WHEN** the active and next pieces are inspected
- **THEN** their numeric IDs match the parent game sequence at indexes `0` and `1`
- **AND** their keys come from the shared piece catalog
- **AND** the active piece uses rotation angle `0` and origin row `1`, column `floor(width / 2)`

### Requirement: PentixServer can start a game session through REST
`PentixServer` SHALL expose `POST /game-sessions` as the supported endpoint for creating and retaining a new `PentixGameSession`. The optional JSON `gameId` field SHALL select the parent game. No body, an omitted or null `gameId`, or an empty/whitespace-only `gameId` SHALL cause a new game to be initialized; a supplied valid ID SHALL reuse the existing game.

The endpoint SHALL:

- return `201 Created` on success,
- return a JSON body that matches the shared `PentixGameSession` snapshot contract,
- create a fresh independent session with a UUIDv7 `id` for each successful request,
- return `400 Bad Request` for invalid JSON, invalid field types, or a malformed nonempty `gameId`,
- and return `404 Not Found` for a well-formed `gameId` that does not identify a retained game.

#### Scenario: The server returns a session with a newly initialized game
- **GIVEN** `PentixServer` is running
- **WHEN** a client sends `POST /game-sessions` without a body
- **THEN** the server responds with `201 Created`
- **AND** the response is an opening `PentixGameSession` whose UUIDv7 `gameId` identifies a newly retained game

#### Scenario: The server reuses a requested game
- **GIVEN** a client has created a game
- **WHEN** the client sends `POST /game-sessions` with that game's ID in JSON
- **THEN** the server responds with `201 Created`
- **AND** the session's `gameId` equals the supplied ID and its pieces come from that game's sequence

#### Scenario: Repeated start requests produce distinct sessions
- **GIVEN** `PentixServer` is running
- **WHEN** a client sends `POST /game-sessions` twice
- **THEN** each response contains a different UUIDv7 session `id`
- **AND** each returned session starts from its own empty opening state rather than sharing mutable session data

#### Scenario: An unknown game is rejected
- **GIVEN** no retained game has the well-formed UUIDv7 supplied by a client
- **WHEN** the client sends `POST /game-sessions` with that `gameId`
- **THEN** the server responds with `404 Not Found`
- **AND** no session is created
