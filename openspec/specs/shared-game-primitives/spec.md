## ADDED Requirements

### Requirement: Shared piece primitives use clear Offset naming
The shared game-primitives package SHALL define the piece model with clear TypeScript/domain names instead of Delphi abbreviations.

The shared model SHALL include:

- a `Piece` contract or class,
- a mino-offset representation that uses the word `Offset` rather than `Ofs`,
- a rotation-mode representation equivalent to Delphi `brNoRotate`, `br90`, and `brFullRotate`,
- and a way to enumerate the occupied minos for a piece at a given orientation.

#### Scenario: Type names avoid Delphi abbreviations
- **GIVEN** a developer inspects the shared TypeScript API
- **WHEN** they read the piece-related contracts
- **THEN** the API uses `Offset` terminology instead of `Ofs`
- **AND** the piece model is understandable without reading Delphi-specific abbreviations

#### Scenario: Piece sizes stay within Pentix rules
- **GIVEN** the shared piece catalog
- **WHEN** a developer enumerates the minos of any piece
- **THEN** the piece contains between 1 and 5 occupied minos inclusive

### Requirement: Shared rotation behavior preserves the Delphi formulas
The shared piece model SHALL preserve the legacy Delphi rotation math from [Tetris.pas](/C:/ai/pentix/delphi/Tetris.pas).

For a mino offset `(x, y)` relative to the piece origin:

- angle `0` SHALL produce `(x, y)`,
- angle `90` SHALL produce `(y, -x)`,
- angle `180` SHALL produce `(-x, -y)`,
- and angle `270` SHALL produce `(-y, x)`.

The shared rotation mode behavior SHALL also preserve the Delphi constraints:

- the equivalent of `brNoRotate` allows only angle `0`,
- the equivalent of `br90` allows only `0` and `90`,
- and the equivalent of `brFullRotate` allows `0`, `90`, `180`, and `270`.

#### Scenario: A full-rotation piece can be evaluated at all four right angles
- **GIVEN** a piece with the full-rotation mode
- **WHEN** its occupied minos are evaluated at `0`, `90`, `180`, and `270`
- **THEN** the returned occupied offsets follow the Delphi rotation formulas exactly

#### Scenario: A half-rotation piece normalizes to two orientations
- **GIVEN** a piece with the Delphi-equivalent `br90` rotation mode
- **WHEN** a caller requests angle `180` or `270`
- **THEN** the shared model normalizes those requests to the same occupied offsets as `0` or `90` respectively

#### Scenario: A non-rotating piece stays fixed
- **GIVEN** a piece with the Delphi-equivalent `brNoRotate` rotation mode
- **WHEN** a caller requests any angle
- **THEN** the shared model returns the same occupied offsets as angle `0`

### Requirement: Shared piece catalog reproduces the Delphi piece set
The shared game-primitives package SHALL include a constant piece catalog derived from the legacy Delphi `TBlockDesc.SetDefaults` data and its associated offset constants.

Each catalog entry SHALL preserve:

- the legacy stable identity,
- the legacy display name,
- the legacy rotation mode,
- and the legacy occupied offsets listed below.

| Legacy Id | Legacy Name | Rotation Mode | Occupied Offsets |
| --- | --- | --- | --- |
| `bi1Line` | `1Line` | `brNoRotate` | `(0,0)` |
| `bi2Line` | `2Line` | `br90` | `(0,0)`, `(0,1)` |
| `bi3Line` | `3Line` | `br90` | `(0,0)`, `(-1,0)`, `(1,0)` |
| `bi3Corner` | `3Corner` | `brFullRotate` | `(0,0)`, `(0,-1)`, `(1,0)` |
| `bi4Line` | `4Line` | `br90` | `(0,0)`, `(-2,0)`, `(-1,0)`, `(1,0)` |
| `bi4Square` | `4Square` | `brNoRotate` | `(0,0)`, `(0,1)`, `(1,1)`, `(1,0)` |
| `bi4T` | `4T` | `brFullRotate` | `(0,0)`, `(-1,0)`, `(1,0)`, `(0,-1)` |
| `bi4L` | `4L` | `brFullRotate` | `(0,0)`, `(-1,0)`, `(1,0)`, `(1,-1)` |
| `bi4LMir` | `4LMir` | `brFullRotate` | `(0,0)`, `(-1,-1)`, `(-1,0)`, `(1,0)` |
| `bi4S` | `4S` | `br90` | `(0,0)`, `(-1,0)`, `(0,-1)`, `(1,-1)` |
| `bi4SMir` | `4SMir` | `br90` | `(0,0)`, `(-1,-1)`, `(0,-1)`, `(1,0)` |
| `bi5Line` | `5Line` | `br90` | `(0,0)`, `(-2,0)`, `(-1,0)`, `(1,0)`, `(2,0)` |
| `bi5Corner` | `5Corner` | `brFullRotate` | `(-1,-1)`, `(-1,0)`, `(-1,1)`, `(0,1)`, `(1,1)` |
| `bi5Cross` | `5Cross` | `brNoRotate` | `(0,0)`, `(0,-1)`, `(-1,0)`, `(0,1)`, `(1,0)` |
| `bi5T` | `5T` | `brFullRotate` | `(0,0)`, `(1,-1)`, `(0,-1)`, `(-1,-1)`, `(0,1)` |
| `bi5W` | `5W` | `brFullRotate` | `(0,0)`, `(-1,1)`, `(0,1)`, `(1,0)`, `(1,-1)` |
| `bi5U` | `5U` | `brFullRotate` | `(0,0)`, `(-1,-1)`, `(-1,0)`, `(1,0)`, `(1,-1)` |
| `bi5L` | `5L` | `brFullRotate` | `(0,0)`, `(-2,0)`, `(-1,0)`, `(1,0)`, `(1,-1)` |
| `bi5LMir` | `5LMir` | `brFullRotate` | `(0,0)`, `(-1,-1)`, `(-1,0)`, `(1,0)`, `(2,0)` |
| `bi5S` | `5S` | `brFullRotate` | `(0,0)`, `(0,-1)`, `(-2,0)`, `(-1,0)`, `(1,-1)` |
| `bi5SMir` | `5SMir` | `brFullRotate` | `(0,0)`, `(0,-1)`, `(-1,-1)`, `(1,0)`, `(2,0)` |
| `bi5F` | `5F` | `brFullRotate` | `(0,0)`, `(0,-1)`, `(-1,1)`, `(0,1)`, `(1,0)` |
| `bi5FMir` | `5FMir` | `brFullRotate` | `(0,0)`, `(0,-1)`, `(-1,0)`, `(0,1)`, `(1,1)` |
| `bi5P` | `5P` | `brFullRotate` | `(0,0)`, `(1,0)`, `(1,-1)`, `(0,-1)`, `(0,1)` |
| `bi5PMir` | `5PMir` | `brFullRotate` | `(0,0)`, `(0,-1)`, `(-1,-1)`, `(-1,0)`, `(0,1)` |
| `bi5Z` | `5Z` | `br90` | `(0,0)`, `(0,-1)`, `(-1,-1)`, `(0,1)`, `(1,1)` |
| `bi5ZMir` | `5ZMir` | `br90` | `(0,0)`, `(1,-1)`, `(0,-1)`, `(-1,1)`, `(0,1)` |
| `bi5R` | `5R` | `brFullRotate` | `(0,0)`, `(2,0)`, `(1,0)`, `(0,-1)`, `(-1,0)` |
| `bi5RMir` | `5RMir` | `brFullRotate` | `(0,0)`, `(1,0)`, `(0,-1)`, `(-2,0)`, `(-1,0)` |

#### Scenario: The shared catalog contains the complete legacy piece set
- **GIVEN** the shared piece catalog
- **WHEN** a developer enumerates its entries
- **THEN** it contains exactly 29 pieces
- **AND** every piece matches the legacy identity, name, rotation mode, and occupied offsets listed in this requirement

#### Scenario: The legacy 5Corner ambiguity is preserved explicitly
- **GIVEN** the shared catalog is derived from the Delphi source
- **WHEN** a developer inspects the `5Corner` entry
- **THEN** they can see that its legacy occupied offsets do not include `(0,0)`
- **AND** the implementation documents this mismatch rather than silently changing the geometry

### Requirement: Shared board primitives define a rectangular board contract
The shared game-primitives package SHALL define a `Board` contract or class for a rectangular playfield and a `BoardCell` concept for one addressable cell on that board.

The shared board model SHALL include:

- integer `width` and `height`,
- row and column addressing,
- a way to access a cell by row and column,
- and enough structure for both the browser application and PentixServer to reason about occupied versus empty cells.

#### Scenario: A board exposes its rectangular dimensions
- **GIVEN** a shared board instance
- **WHEN** a caller inspects its dimensions
- **THEN** the board exposes integer width and height values
- **AND** those values define the valid row and column coordinate range for its cells

#### Scenario: A board cell can be addressed consistently
- **GIVEN** a shared board instance
- **WHEN** a caller requests a cell by row and column
- **THEN** the same board cell can be retrieved consistently by both the server and browser code
