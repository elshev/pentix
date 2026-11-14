## ADDED Requirements

### Requirement: A game exposes an available piece set

The engine SHALL associate every `PentixGame` with a set of available pieces, identified by their stable numeric catalog IDs, and SHALL draw the game's piece sequence only from that set.

#### Scenario: The sequence stays within the set
- **GIVEN** a game whose available set is a subset of the catalog
- **WHEN** its piece sequence is inspected, including any extension
- **THEN** every sequence entry belongs to the available set

### Requirement: Arbitrary game construction is private

The engine SHALL provide a private, non-exported factory that builds a game from an arbitrary board size and piece set. The public API SHALL NOT expose this arbitrary construction.

#### Scenario: Arbitrary construction is not public
- **GIVEN** a consumer of the shared `pentix-core` package
- **WHEN** they inspect the public API
- **THEN** there is no public function accepting an arbitrary piece set and board size
- **AND** the arbitrary builder is reachable only from within the engine

### Requirement: The engine exposes Pentix and Tetris presets

The engine SHALL expose public factories `createPentixGame` and `createTetrisGame`. `createPentixGame` SHALL use the full catalog and the Pentix board size; `createTetrisGame` SHALL use the 4-mino (tetromino) piece set and the Tetris board size. Both SHALL delegate to the private arbitrary builder.

#### Scenario: Starting a Pentix game uses the full catalog
- **GIVEN** a caller invokes `createPentixGame`
- **WHEN** its available piece set is inspected
- **THEN** it contains every piece in the shared catalog

#### Scenario: Starting a Tetris game uses the tetromino set
- **GIVEN** a caller invokes `createTetrisGame`
- **WHEN** its available piece set and board size are inspected
- **THEN** the set contains exactly the 4-mino pieces
- **AND** the board size is the Tetris board size

#### Scenario: The arbitrary builder is rejected by the factory
- **GIVEN** a private build request with fewer than two pieces
- **WHEN** the builder runs
- **THEN** it rejects the request without creating a game