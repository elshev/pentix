## ADDED Requirements

### Requirement: Shared game-session snapshots define the opening session contract
The shared `pentix-core` package SHALL define a JSON-serializable `PentixGameSession` snapshot contract for a newly started single-player session.

The shared snapshot SHALL include:

- an opaque session identifier,
- a session status value,
- board dimensions and current board occupancy,
- opening statistics including score, level, and cleared-line count,
- an active piece state with piece key, rotation angle, and spawn origin,
- and a next-piece preview derived from the shared piece catalog.

#### Scenario: A started session exposes the shared opening fields
- **GIVEN** a caller starts a new `PentixGameSession`
- **WHEN** the returned session snapshot is inspected
- **THEN** it includes a session identifier, status, board state, opening statistics, active piece state, and next-piece preview
- **AND** the board and piece references use the shared Pentix domain vocabulary rather than server-local names

### Requirement: Starting a session initializes consistent gameplay defaults
Each new `PentixGameSession` SHALL start from a consistent server-owned opening state.

The opening state SHALL use:

- the shared default board size,
- an empty board with no occupied cells,
- score `0`,
- level `1`,
- cleared-line count `0`,
- an active piece at rotation angle `0`,
- an active-piece origin at row `1` and column `floor(width / 2)`,
- and one next-piece preview.

#### Scenario: A started session begins on an empty default board
- **GIVEN** a caller starts a new `PentixGameSession`
- **WHEN** the returned opening board and statistics are inspected
- **THEN** the board matches the shared default board size
- **AND** every board cell is empty
- **AND** the score is `0`, the level is `1`, and the cleared-line count is `0`

#### Scenario: A started session spawns valid opening pieces
- **GIVEN** a caller starts a new `PentixGameSession`
- **WHEN** the active and next pieces are inspected
- **THEN** both piece identities come from the shared piece catalog
- **AND** the active piece uses rotation angle `0`
- **AND** the active piece origin is row `1` and the centered column `floor(width / 2)`

### Requirement: PentixServer can start a game session through REST
`PentixServer` SHALL expose `POST /game-sessions` as the supported endpoint for creating a new `PentixGameSession`.

The endpoint SHALL:

- return `201 Created` on success,
- return a JSON body that matches the shared `PentixGameSession` snapshot contract,
- and create a fresh independent session for each successful request.

#### Scenario: The server returns a new session snapshot
- **GIVEN** `PentixServer` is running
- **WHEN** a client sends `POST /game-sessions`
- **THEN** the server responds with `201 Created`
- **AND** the response body is a JSON `PentixGameSession` snapshot with opening board, statistics, active piece, and next-piece preview

#### Scenario: Repeated start requests produce distinct sessions
- **GIVEN** `PentixServer` is running
- **WHEN** a client sends `POST /game-sessions` twice
- **THEN** each response contains a different session identifier
- **AND** each returned session starts from its own empty opening state rather than reusing prior session data
