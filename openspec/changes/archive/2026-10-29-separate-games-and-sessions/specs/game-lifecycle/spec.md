## ADDED Requirements

### Requirement: Games define reusable initial state and piece sequences
The system SHALL define a JSON-serializable `PentixGame` with a UUIDv7 string `id`, a `name` that can be empty, a board snapshot, and `pieceIds` referencing numeric IDs in `PIECE_CATALOG`.

`POST /games` SHALL create and retain an independent game, returning `201 Created` and its JSON representation. Unless a valid optional name is supplied, the name SHALL be empty. Initialization SHALL use the default empty board and provide at least two valid piece IDs for active and preview pieces.

#### Scenario: A client initializes a game
- **GIVEN** `PentixServer` is running
- **WHEN** a client sends `POST /games` without a name
- **THEN** the server responds with `201 Created`
- **AND** the game has a UUIDv7 `id`, an empty `name`, an empty default board, and at least two catalog-valid numeric `pieceIds`

#### Scenario: Games have independent identities and boards
- **GIVEN** a client has created two games
- **WHEN** their identities and initial boards are compared
- **THEN** their UUIDv7 IDs are distinct
- **AND** their board snapshots do not share mutable session state

### Requirement: A game's piece sequence is extended with valid catalog IDs
The lifecycle service SHALL retain each game's piece sequence and SHALL append a catalog-valid numeric piece ID whenever a session needs a preview beyond the current sequence. Different sessions using one game SHALL observe the same sequence values while maintaining independent cursors.

#### Scenario: A session reaches the end of the initialized sequence
- **GIVEN** a game has exactly enough IDs for a session's active and preview pieces
- **WHEN** that session requests its next piece
- **THEN** the game sequence gains another valid catalog ID for the new preview
- **AND** existing sequence values do not change

### Requirement: Next-piece requests advance a retained session
`PentixServer` SHALL expose `POST /game-sessions/{id}/next-piece` as a state-changing operation. For a known session, it SHALL promote the previous preview to the active piece at rotation angle `0` and the default spawn origin, advance `nextPieceIndex` by one, provide the piece at the new index as the preview, and return `200 OK` with the complete updated `PentixGameSession` snapshot.

The server SHALL return `404 Not Found` for a well-formed session ID that does not exist and `400 Bad Request` for a malformed session ID. A successful request SHALL NOT alter the session's board, statistics, `userId`, or `gameId`.

#### Scenario: The next piece becomes active
- **GIVEN** a retained session has an active piece, a preview piece, and cursor `1`
- **WHEN** a client sends `POST /game-sessions/{id}/next-piece`
- **THEN** the server responds with `200 OK` and the updated session snapshot
- **AND** the previous preview is the active piece with default rotation and spawn origin
- **AND** the cursor is `2` and the preview references the game sequence at index `2`

#### Scenario: An unknown session cannot advance
- **GIVEN** no session exists for a well-formed UUIDv7 supplied by a client
- **WHEN** the client sends `POST /game-sessions/{id}/next-piece`
- **THEN** the server responds with `404 Not Found`
- **AND** no game piece sequence is changed
