## MODIFIED Requirements

### Requirement: The demo imitates player actions within the shared engine

The demo SHALL compute a destination (rotation angle and column) for the active piece using the shared destination planner — a port of the Delphi `CalcDemoDest` heuristic that scores each reachable placement as `row + (holesBefore − holesAfter) × 1.5 + fullLines²` with ties resolved by an explicit precedence — a lower bottom, a lower top, more orthogonal contacts with already-settled minos or the board walls, then a placement that does not touch a side wall, then a random choice. The destination SHALL be planned once per spawned piece and reused across steering steps (recomputed only when a new piece spawns or the demo session changes). The demo SHALL then steer toward that destination by rotating, then moving left or right, then hard-dropping once aligned. All demo movement, rotation, locking, and game-over detection SHALL go through the shared `GameSessionEngine`; the demo SHALL NOT re-implement those operations.

#### Scenario: The demo plans a destination for the active piece

- **GIVEN** an active demo session with a placeable active piece
- **WHEN** the demo computes the destination for that piece
- **THEN** the planner returns a rotation angle and column that are valid for the active piece
- **AND** prefers placements that are lower, that reduce the number of column holes, and that complete more full rows
- **AND** among placements with equal score, prefers a lower bottom, then a lower top, then more orthogonal contacts with settled minos or the board walls, then a placement that does not touch a side wall, with remaining ties chosen randomly

#### Scenario: The destination is held for the whole piece

- **GIVEN** an active demo session and a planned destination
- **WHEN** the demo steers the same piece over several ticks
- **THEN** the target angle and column stay the same until a new piece spawns

#### Scenario: The demo steers and hard-drops toward the destination

- **GIVEN** an active demo session and a computed destination
- **WHEN** the demo advances
- **THEN** it rotates the piece toward the destination angle, then moves it laterally toward the destination column, then hard-drops it once aligned
- **AND** the resulting state is produced by the shared `GameSessionEngine`