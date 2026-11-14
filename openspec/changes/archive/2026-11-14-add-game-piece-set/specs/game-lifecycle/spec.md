## MODIFIED Requirements

### Requirement: Games define reusable initial state and piece sequences
The system SHALL define a JSON-serializable `PentixGame` with a UUIDv7 string `id`, a `name` that can be empty, a board snapshot, an `availablePieceIds` set of numeric catalog IDs, and `pieceIds` referencing numeric IDs in `PIECE_CATALOG` that are drawn from `availablePieceIds`.

`POST /games` SHALL create and retain an independent Pentix game, returning `201 Created` and its JSON representation. Unless a valid optional name is supplied, the name SHALL be empty. Initialization SHALL use the default empty board, set the available piece set to the full catalog, and provide at least two valid piece IDs for active and preview pieces.

#### Scenario: A client initializes a game
- **GIVEN** `PentixServer` is running
- **WHEN** a client sends `POST /games` without a name
- **THEN** the server responds with `201 Created`
- **AND** the game has a UUIDv7 `id`, an empty `name`, an empty default board, an `availablePieceIds` set equal to the full catalog, and at least two catalog-valid numeric `pieceIds`

#### Scenario: Games have independent identities and boards
- **GIVEN** a client has created two games
- **WHEN** their identities and initial boards are compared
- **THEN** their UUIDv7 IDs are distinct
- **AND** their board snapshots do not share mutable session state