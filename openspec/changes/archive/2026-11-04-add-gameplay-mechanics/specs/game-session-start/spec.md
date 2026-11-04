## MODIFIED Requirements

### Requirement: Shared game-session snapshots define the opening session contract
The shared `pentix-core` package SHALL define a JSON-serializable `PentixGameSession` snapshot contract for a newly started single-player session associated with a `PentixGame`.

The shared snapshot SHALL include:

- a UUIDv7 session `id` and parent `gameId`,
- a nullable `userId`, initially `null`,
- a session status value that is `active` for a playable session and becomes `game-over` when a spawn is blocked,
- board dimensions and current board occupancy initialized independently from the game's board,
- opening statistics including score, level, cleared-line count, and locked-block count,
- an active piece state with piece key, rotation angle, and spawn origin,
- a next-piece preview derived from the parent game's piece sequence,
- and a zero-based `nextPieceIndex` identifying the preview's position in that sequence.

The legacy `sessionId` field SHALL NOT be exposed.

#### Scenario: A started session exposes the shared opening fields
- **GIVEN** a caller starts a new `PentixGameSession`
- **WHEN** the returned session snapshot is inspected
- **THEN** it includes `id`, `gameId`, `userId: null`, a status of `active`, independent board state, opening statistics, active piece state, next-piece preview, and `nextPieceIndex`
- **AND** the board and piece references use the shared Pentix domain vocabulary rather than server-local names
- **AND** the snapshot has no `sessionId` field

### Requirement: Starting a session initializes consistent gameplay defaults
Each new `PentixGameSession` SHALL start from a consistent server-owned opening state derived from its parent game.

The opening state SHALL use:

- an independent copy of the game's initial board,
- score `0`,
- level `1`,
- cleared-line count `0`,
- locked-block count `0`,
- the game piece at sequence index `0` as the active piece,
- an active piece at rotation angle `0`,
- an active-piece origin at row `1` and column `floor(width / 2)`,
- the game piece at sequence index `1` as one next-piece preview,
- and `nextPieceIndex` equal to `1`.

#### Scenario: A started session begins on an empty default board
- **GIVEN** a caller starts a new `PentixGameSession` using a default game
- **WHEN** the returned opening board and statistics are inspected
- **THEN** the board matches the shared default board size and every board cell is empty
- **AND** the score is `0`, the level is `1`, the cleared-line count is `0`, and the locked-block count is `0`

#### Scenario: A started session spawns valid opening pieces
- **GIVEN** a caller starts a new `PentixGameSession`
- **WHEN** the active and next pieces are inspected
- **THEN** their numeric IDs match the parent game sequence at indexes `0` and `1`
- **AND** their keys come from the shared piece catalog
- **AND** the active piece uses rotation angle `0` and origin row `1`, column `floor(width / 2)`
