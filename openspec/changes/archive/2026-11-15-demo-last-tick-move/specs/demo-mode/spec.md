## ADDED Requirements

### Requirement: The demo plans each placement together with its side-steps

When planning a destination, the demo SHALL score every candidate settled placement together with the placements one column to its left and one column to its right at the same row, because the demo can side-step there on its last tick. A placement, including a side-stepped one, SHALL be scored after being allowed to fall as far as it can, so a side-step that keeps the piece falling is scored at its further landing and is preferred over a side-step that merely parks the piece. The destination returned SHALL be the column the piece must be dropped in to reach the winning placement, and the usual score and tie-break precedence SHALL decide the winner.

#### Scenario: A side-step into a deeper column drives the destination

- **GIVEN** a board where the placement under a settled mino on the floor is only reachable by dropping in the neighbouring column and side-stepping right on the last tick
- **WHEN** the demo plans the destination for a piece spawning on that board
- **THEN** the destination column is the neighbouring column the piece must be dropped in
- **AND** that placement is scored as the winning placement even though a straight drop into the mino's column cannot reach it

#### Scenario: A side-step that parks the piece can still win

- **GIVEN** a candidate placement whose side-step cannot fall any further but scores better than staying where the piece would lock
- **WHEN** the demo plans the destination
- **THEN** the side-stepped placement is compared with the other candidates on score and tie-breaks
- **AND** it wins when it is the best of them

#### Scenario: A placement that needs no side-step is preferred when everything ties

- **GIVEN** two placements that are equal on score and on every tie-break, one reachable by a straight drop and one only by a side-step
- **WHEN** the demo selects the winning placement
- **THEN** the placement reachable by the straight drop is chosen

### Requirement: The demo side-steps on its last tick instead of locking

When the demo's active piece can no longer move down, the demo SHALL compare its resting placement with the placements one column left and one column right at the same row and SHALL move the piece one column to a neighbour when that neighbour is strictly better on the demo's placement ordering (score, then the tie-break precedence). The demo SHALL NOT require the side-step to enable further descent: parking the piece in a better placement counts. The demo SHALL NOT take a side-step that is not a strict improvement, and SHALL re-target its destination to the side-step column. The comparison SHALL repeat on every later last tick of the same piece, and the piece SHALL lock when no neighbour is better.

#### Scenario: The demo side-steps into a better placement

- **GIVEN** a resting demo piece whose neighbour placement one column away scores better than where the piece rests
- **WHEN** the demo advances on that last tick
- **THEN** the demo moves the piece that one column through the shared engine
- **AND** it does not lock the piece and does not spawn the next piece
- **AND** the demo's destination becomes the side-step column

#### Scenario: The demo parks the piece under a settled mino

- **GIVEN** a resting demo piece on the floor beside a settled mino one row above the side wall, where stepping toward the wall cannot fall any further but scores better
- **WHEN** the demo advances on that last tick
- **THEN** the demo steps toward the wall instead of locking

#### Scenario: A side-step that scores worse is not taken

- **GIVEN** a resting demo piece with a legal side-step whose resulting placement scores worse than staying
- **WHEN** the demo advances on that last tick
- **THEN** the demo locks the piece through the shared engine

#### Scenario: An indistinguishable side-step is not taken

- **GIVEN** a resting demo piece whose legal side-step is equal to the resting placement on the score and on every tie-break
- **WHEN** the demo advances on that last tick
- **THEN** the demo locks the piece instead of shuffling sideways

#### Scenario: The last-tick check repeats as the piece descends

- **GIVEN** a demo piece that took a last-tick side-step and fell at least one row
- **WHEN** that piece comes to rest again
- **THEN** the demo compares its placement with its neighbours again
- **AND** repeats until no neighbour is better, at which point it locks the piece

### Requirement: The demo advances one gravity step and one steering step per interval

The browser gameplay client SHALL advance the demo exactly once per gravity interval with a single step that applies the gravity descent (when the piece can move down) followed by one steering step, and SHALL NOT advance demo gravity from a separate gravity loop. A demo step planned for a different session, piece, or piece placement SHALL be ignored.

#### Scenario: A falling piece descends and steers in the same step

- **GIVEN** an active demo session whose piece can move down and a planned steering step
- **WHEN** the gravity interval elapses
- **THEN** the piece moves down one row and applies the one steering step in that same interval
- **AND** no other timer advances the demo

#### Scenario: The last-tick check cannot be pre-empted

- **GIVEN** a demo piece that cannot move down and a better side-step available
- **WHEN** the gravity interval elapses
- **THEN** the demo applies the side-step instead of locking the piece

#### Scenario: A stale demo step is ignored

- **GIVEN** a demo step planned for a session, piece index, and placement that no longer match the current demo state
- **WHEN** the client applies that step
- **THEN** the demo state is left unchanged

## MODIFIED Requirements

### Requirement: The demo imitates player actions within the shared engine

The demo SHALL compute a destination (rotation angle and column) for the active piece using the shared destination planner — a port of the Delphi `CalcDemoDest` heuristic that scores each reachable placement as `row + (holesBefore − holesAfter) × 1.5 + fullLines²`, compares every placement with its one-column side-steps, and resolves ties by an explicit precedence — a lower bottom, a lower top, more orthogonal contacts with already-settled minos or the board walls, then a placement that does not touch a side wall, then a random choice. The destination SHALL be planned once per spawned piece and reused across steering steps, and SHALL additionally be re-targeted when the piece takes a last-tick side-step. The demo SHALL then steer toward that destination by rotating, then moving left or right, then hard-dropping once aligned. All demo movement, rotation, locking, and game-over detection SHALL go through the shared `GameSessionEngine`; the demo SHALL NOT re-implement those operations.

#### Scenario: The demo plans a destination for the active piece

- **GIVEN** an active demo session with a placeable active piece
- **WHEN** the demo computes the destination for that piece
- **THEN** the planner returns a rotation angle and column that are valid for the active piece
- **AND** prefers placements that are lower, that reduce the number of column holes, and that complete more full rows
- **AND** among placements with equal score, prefers a lower bottom, then a lower top, then more orthogonal contacts with settled minos or the board walls, then a placement that does not touch a side wall, with remaining ties chosen randomly

#### Scenario: The destination is held for the whole piece

- **GIVEN** an active demo session and a planned destination
- **WHEN** the demo steers the same piece over several ticks
- **THEN** the target angle and column stay the same until a last-tick side-step re-targets them or a new piece spawns

#### Scenario: The demo steers and hard-drops toward the destination

- **GIVEN** an active demo session and a computed destination
- **WHEN** the demo advances
- **THEN** it rotates the piece toward the destination angle, then moves it laterally toward the destination column, then hard-drops it once aligned
- **AND** the first step toward a re-targeted destination is the single side-step
- **AND** the resulting state is produced by the shared `GameSessionEngine`
