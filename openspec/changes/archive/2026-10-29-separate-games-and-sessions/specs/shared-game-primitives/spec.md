## MODIFIED Requirements

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
