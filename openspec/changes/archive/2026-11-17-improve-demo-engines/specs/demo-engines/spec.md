## MODIFIED Requirements

### Requirement: The shared core exposes a demo-engine contract

`pentix-core` SHALL define a demo engine as a named planning strategy with a stable `id`, a human-readable `name`, a non-empty one-sentence `description`, and exactly one operation, `plan(board, piece, position)`, returning a `DemoActionLog` for the active piece. `board` SHALL be the visible board as rows of `0` (free) and `1` (occupied); `piece` SHALL be the active piece's reachable orientations, each a list of cells relative to the rotation point (current orientation first, each `C` selecting the next); `position` SHALL be the rotation point on the board. A `DemoActionLog` SHALL be a string of demo action codes from the shared alphabet: `L` (move left), `R` (move right), `C` (rotate clockwise), `A` (rotate anticlockwise), and `H` (hard drop). The log SHALL NOT contain `T` (tick): ticks belong to the demo driver, which applies Action then Tick. The alphabet SHALL be the session action vocabulary without `T`, defined once in the shared core rather than declared again. An empty log SHALL mean the engine has no actions for that piece. A log SHALL be permitted to carry exactly one code after its `H`: that code SHALL be the piece's last-tick move, one lateral action (`L` or `R`) that the driver applies after the hard drop and before that interval's gravity tick, so the piece can side-step one column into a placement a straight drop cannot reach. A log SHALL NOT carry more than one last-tick move and SHALL NOT carry `C`, `A`, or a second `H` after the drop; an engine that plans no side-step SHALL end its log with `H`. The destination the classic planner returns SHALL carry the last-tick move (`L`, `R`, or none) and the shared toolkit SHALL let an engine emit it with one call, `actionsToward(orientation, position, column, lastTickMove)`. An engine SHALL plan only: it SHALL NOT mutate the board, piece, or position, advance gravity, move or rotate the active piece itself, lock a piece, side-step a piece itself, score, or detect game over, and the three inputs SHALL be unchanged when the call returns.

#### Scenario: An engine plans an action log for the active piece

- **GIVEN** a registered engine, a board, the active piece's orientations, and its rotation point, with a reachable placement
- **WHEN** the demo calls the engine's `plan` with those three values
- **THEN** it returns a string made only of `L`, `R`, `C`, `A`, and `H`
- **AND** the three inputs are unchanged

#### Scenario: An engine with nothing to plan returns an empty log

- **GIVEN** a registered engine and a board on which the active piece has no reachable placement, or a strategy with no action for this piece
- **WHEN** the demo calls the engine's `plan`
- **THEN** it returns an empty string
- **AND** the demo lets the piece fall under gravity

#### Scenario: Ticks never appear in an engine log

- **GIVEN** any registered engine and any valid board, piece, and position
- **WHEN** the engine's `plan` returns
- **THEN** the returned log contains no `T`
- **AND** the driver, not the engine, advances gravity

#### Scenario: A log plans its last-tick side-step after the drop

- **GIVEN** a board on which the best placement is reachable only by dropping in the neighbouring column and side-stepping one column on the last tick
- **WHEN** the engine's `plan` returns
- **THEN** the log ends with `H` followed by exactly one `L` or `R` code
- **AND** that code points from the drop column toward the settlement column
- **AND** the log carries no rotation or second drop after `H`

#### Scenario: A log without a side-step ends with the drop

- **GIVEN** a board on which the best placement is reachable by a straight drop
- **WHEN** the engine's `plan` returns
- **THEN** the last code of the log is `H`
- **AND** no code follows it

#### Scenario: The toolkit expresses the last-tick move in one call

- **GIVEN** an orientation index, a rotation point, a target column, and a last-tick move of `R`
- **WHEN** the engine builds its log with `actionsToward(orientation, position, column, 'R')`
- **THEN** the result is the rotations, the lateral moves, `H`, and a trailing `R`
- **AND** omitting the last-tick move produces the same log without the trailing code

#### Scenario: An engine identifies itself

- **GIVEN** a registered engine
- **WHEN** a consumer reads the engine
- **THEN** it exposes a stable `id`, a display `name`, and a non-empty `description`
- **AND** `plan(board, piece, position)` is the only operation it exposes for requesting actions

### Requirement: The `delphi5` engine preserves the classic heuristic

`pentix-core` SHALL register the existing Delphi `CalcDemoDest` planner as the demo engine with id `delphi5`, display name `Delphi 5`, and a non-empty description. Its `plan` operation SHALL return the action log that steers the piece to the destination the ported `CalcDemoDest` heuristic chooses for the same board, reachable orientations, and rotation point: rotations that reach the chosen orientation, lateral moves that reach the destination column, then `H`. Because that heuristic also scores the placements one column left and right of a resting placement and steers to the column the winning placement starts from, `plan` SHALL append the classic **last-tick move** — `L` or `R`, the direction from the drop column to the winning placement's column — when the winning placement is reached by such a side-step, and SHALL end at `H` when it is not. When the heuristic finds no placement, its `plan` SHALL return an empty log. `plan` SHALL run the heuristic on the `0`/`1` board it receives, without building another board representation, and SHALL NOT mutate its inputs.

#### Scenario: The engine steers toward the classic destination

- **GIVEN** a board with a placeable piece and a destination chosen by the classic heuristic
- **WHEN** the `delphi5` engine plans
- **THEN** its log's rotations and moves target that destination's orientation and column
- **AND** the log contains `H`
- **AND** the log contains no `T`

#### Scenario: The engine plans nothing when the classic planner finds no placement

- **GIVEN** a board on which the piece cannot be placed anywhere
- **WHEN** the `delphi5` engine plans
- **THEN** it returns an empty log

#### Scenario: A straight drop ends at the hard drop

- **GIVEN** a board on which the classic destination is reached by a straight drop
- **WHEN** the `delphi5` engine plans
- **THEN** its log ends with `H`
- **AND** it does not side-step after the drop

#### Scenario: The engine side-steps under a mino on the row before last

- **GIVEN** a board of `12` columns and `22` rows whose only settled cell is one mino at row `20` in column `c`
- **WHEN** the `delphi5` engine plans the single-cell piece from the top of the board
- **THEN** its log ends with `H` and then `L` or `R`, pointing from the neighbouring drop column toward column `c`
- **AND** replaying that log as Action then Tick settles the piece in column `c` on row `21`, directly under the settled mino
- **AND** the settled mino is still at row `20` in column `c` and the piece stays in that pocket
