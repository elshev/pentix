## Purpose

Describe the shared Pentix piece, rotation, catalog, and board primitives that both the browser application and `PentixServer` build on.
## Requirements
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

Each catalog entry SHALL preserve its stable numeric ID, rotation mode, color, and occupied offsets. Each entry SHALL expose the former legacy display name as its single string `key`; the redundant `name` field and `bi*` legacy key identifiers SHALL be removed. The shared key type SHALL be named `PieceKey`, and all catalog lookups, board cells, and session piece references SHALL use these keys.

| Numeric Id | Key | Rotation Mode | Occupied Offsets |
| --- | --- | --- | --- |
| `0` | `1Line` | `none` | `(0,0)` |
| `1` | `2Line` | `half` | `(0,0)`, `(0,1)` |
| `2` | `3Line` | `half` | `(0,0)`, `(-1,0)`, `(1,0)` |
| `3` | `3Corner` | `full` | `(0,0)`, `(0,-1)`, `(1,0)` |
| `4` | `4Line` | `half` | `(0,0)`, `(-2,0)`, `(-1,0)`, `(1,0)` |
| `5` | `4Square` | `none` | `(0,0)`, `(0,1)`, `(1,1)`, `(1,0)` |
| `6` | `4T` | `full` | `(0,0)`, `(-1,0)`, `(1,0)`, `(0,-1)` |
| `7` | `4L` | `full` | `(0,0)`, `(-1,0)`, `(1,0)`, `(1,-1)` |
| `8` | `4LMir` | `full` | `(0,0)`, `(-1,-1)`, `(-1,0)`, `(1,0)` |
| `9` | `4S` | `half` | `(0,0)`, `(-1,0)`, `(0,-1)`, `(1,-1)` |
| `10` | `4SMir` | `half` | `(0,0)`, `(-1,-1)`, `(0,-1)`, `(1,0)` |
| `11` | `5Line` | `half` | `(0,0)`, `(-2,0)`, `(-1,0)`, `(1,0)`, `(2,0)` |
| `12` | `5Corner` | `full` | `(-1,-1)`, `(-1,0)`, `(-1,1)`, `(0,1)`, `(1,1)` |
| `13` | `5Cross` | `none` | `(0,0)`, `(0,-1)`, `(-1,0)`, `(0,1)`, `(1,0)` |
| `14` | `5T` | `full` | `(0,0)`, `(1,-1)`, `(0,-1)`, `(-1,-1)`, `(0,1)` |
| `15` | `5W` | `full` | `(0,0)`, `(-1,1)`, `(0,1)`, `(1,0)`, `(1,-1)` |
| `16` | `5U` | `full` | `(0,0)`, `(-1,-1)`, `(-1,0)`, `(1,0)`, `(1,-1)` |
| `17` | `5L` | `full` | `(0,0)`, `(-2,0)`, `(-1,0)`, `(1,0)`, `(1,-1)` |
| `18` | `5LMir` | `full` | `(0,0)`, `(-1,-1)`, `(-1,0)`, `(1,0)`, `(2,0)` |
| `19` | `5S` | `full` | `(0,0)`, `(0,-1)`, `(-2,0)`, `(-1,0)`, `(1,-1)` |
| `20` | `5SMir` | `full` | `(0,0)`, `(0,-1)`, `(-1,-1)`, `(1,0)`, `(2,0)` |
| `21` | `5F` | `full` | `(0,0)`, `(0,-1)`, `(-1,1)`, `(0,1)`, `(1,0)` |
| `22` | `5FMir` | `full` | `(0,0)`, `(0,-1)`, `(-1,0)`, `(0,1)`, `(1,1)` |
| `23` | `5P` | `full` | `(0,0)`, `(1,0)`, `(1,-1)`, `(0,-1)`, `(0,1)` |
| `24` | `5PMir` | `full` | `(0,0)`, `(0,-1)`, `(-1,-1)`, `(-1,0)`, `(0,1)` |
| `25` | `5Z` | `half` | `(0,0)`, `(0,-1)`, `(-1,-1)`, `(0,1)`, `(1,1)` |
| `26` | `5ZMir` | `half` | `(0,0)`, `(1,-1)`, `(0,-1)`, `(-1,1)`, `(0,1)` |
| `27` | `5R` | `full` | `(0,0)`, `(2,0)`, `(1,0)`, `(0,-1)`, `(-1,0)` |
| `28` | `5RMir` | `full` | `(0,0)`, `(1,0)`, `(0,-1)`, `(-2,0)`, `(-1,0)` |

#### Scenario: The shared catalog contains the complete legacy piece set
- **GIVEN** the shared piece catalog
- **WHEN** a developer enumerates its entries
- **THEN** it contains exactly 29 pieces with unique numeric IDs and unique keys
- **AND** every piece matches the numeric ID, key, rotation mode, and occupied offsets listed in this requirement
- **AND** no entry exposes a duplicate `name` or a `bi*` legacy key

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

