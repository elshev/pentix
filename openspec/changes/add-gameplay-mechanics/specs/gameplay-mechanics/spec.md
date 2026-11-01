## ADDED Requirements

### Requirement: The active piece can move left and right
The shared `pentix-core` engine SHALL provide a move operation that shifts the active piece one column left or right. The move SHALL succeed only when every occupied cell of the shifted piece is within the board and unoccupied; otherwise the session SHALL be returned unchanged.

#### Scenario: A piece moves into empty space
- **GIVEN** a session whose active piece occupies only empty in-bounds cells one column to the right
- **WHEN** the engine moves the active piece right
- **THEN** the returned session's active piece origin column is one greater
- **AND** the board and statistics are unchanged

#### Scenario: A piece cannot move through a wall
- **GIVEN** a session whose active piece already touches the left wall
- **WHEN** the engine moves the active piece left
- **THEN** the returned session equals the input session

#### Scenario: A piece cannot move into a buried cell
- **GIVEN** a session whose active piece would overlap a buried cell one column to the right
- **WHEN** the engine moves the active piece right
- **THEN** the returned session equals the input session

### Requirement: The active piece rotates with Delphi near-wall kicks
The shared engine SHALL provide a rotate operation that applies the next 90-degree step: clockwise subtracts `90` and counterclockwise adds `90`, normalized to the piece's rotation mode. If the rotated piece overlaps a wall, the engine SHALL apply a Delphi near-wall kick (right collision → column `width - maxX - 1`; left collision → column `-minX`; top collision → row `-minY`, where `minX`/`maxX`/`minY` are the rotated offsets' extremes). If the rotated piece still overlaps a wall or a buried cell, the session SHALL be returned unchanged.

#### Scenario: A piece rotates in open space
- **GIVEN** a session whose active piece can rotate in place without collision
- **WHEN** the engine rotates the active piece clockwise
- **THEN** the returned session's active piece angle advances by one clockwise step
- **AND** the board and statistics are unchanged

#### Scenario: A piece kicks away from the right wall
- **GIVEN** a session whose active piece would extend past the right wall after rotation
- **WHEN** the engine rotates the active piece
- **THEN** the returned active piece angle is the rotated angle and its origin column is shifted left so the piece is in bounds

#### Scenario: A blocked rotation leaves the session unchanged
- **GIVEN** a session whose active piece cannot rotate without overlapping a buried cell
- **WHEN** the engine rotates the active piece
- **THEN** the returned session equals the input session

### Requirement: A tick steps gravity and settles a resting piece
The shared engine SHALL provide a tick that moves the active piece down one row when the cells below are empty and in bounds. When the piece cannot move down, the engine SHALL lock it into the board, award the lock score, clear full lines, update score and level, and spawn the next piece.

#### Scenario: A tick moves the piece down
- **GIVEN** a session whose active piece has empty cells below it
- **WHEN** the engine ticks the session
- **THEN** the returned session's active piece origin row is one greater
- **AND** the board and statistics are unchanged

#### Scenario: A tick locks a resting piece and spawns the next piece
- **GIVEN** a session whose active piece is resting on a buried cell or the bottom
- **WHEN** the engine ticks the session
- **THEN** the returned session's board contains the locked piece's cells
- **AND** the returned session's active piece equals the previous next piece at the default spawn origin
- **AND** the preview cursor advances

### Requirement: A drop moves to the lowest position and defers locking
The shared engine SHALL provide a drop that awards the drop score and moves the active piece to its lowest in-bounds resting position WITHOUT locking it. Move and rotate SHALL remain available after a drop, and the piece SHALL lock on a subsequent tick when it can no longer move down.

#### Scenario: A drop settles the piece without locking it
- **GIVEN** a session whose active piece can fall several rows
- **WHEN** the engine drops the active piece
- **THEN** the returned session's active piece origin is at its lowest valid position
- **AND** the board is unchanged and `status` is still `active`

#### Scenario: A piece locks on the tick after a drop
- **GIVEN** a session whose active piece was dropped and cannot move down
- **WHEN** the engine ticks the session
- **THEN** the returned session's board contains the locked piece's cells
- **AND** the returned session's active piece equals the previous next piece at the default spawn origin

### Requirement: Locking buries the piece and scores by piece points
When a piece locks, the shared engine SHALL bury its cells into the board and add `points × level` to the score, where `points` is the piece's mino count and `level` is the session's level.

#### Scenario: A lock adds the bury score
- **GIVEN** a session at level `1` whose active piece has `points` `4`
- **WHEN** the engine locks the piece
- **THEN** `statistics.score` increases by `4`

### Requirement: Full lines are cleared and rows shift down
When locking completes one or more rows, the shared engine SHALL remove those rows and shift every row above them down, preserving each surviving cell's column.

#### Scenario: A completed line is removed
- **GIVEN** a session whose board has every column of a row occupied except the active piece's final cell
- **WHEN** the engine locks the active piece into that row
- **THEN** the returned session's board no longer has that row
- **AND** the rows above it shift down by one
- **AND** `statistics.clearedLines` increases by one

### Requirement: Clearing lines scores by row distance with an empty-field bonus
For each cleared line in a single settle, the shared engine SHALL add `lineIndex × (10 + (height − row)) × level` to the score, where `lineIndex` is the 1-based position of the line within the settle, `row` is the cleared row's index, and `height` is the board height. If clearing lines leaves the board empty, the engine SHALL add an additional `1000` points.

#### Scenario: Clearing a line scores by its row
- **GIVEN** a session at level `1` whose settle clears one line at row `21` of a `22`-row board
- **WHEN** the engine settles the piece
- **THEN** `statistics.score` increases by `1 × (10 + (22 − 21)) × 1 = 11` plus the lock score
- **AND** `statistics.clearedLines` increases by `1`

#### Scenario: Emptying the field awards a bonus
- **GIVEN** a session whose settle clears the last occupied row, leaving the board empty
- **WHEN** the engine settles the piece
- **THEN** `statistics.score` increases by an additional `1000`

### Requirement: Dropping scores by fall distance
The shared engine SHALL add `points × (height − originRow) × level ÷ 10` (integer division) to the score when a drop is performed, where `originRow` is the active piece's origin row at the moment of the drop.

#### Scenario: A drop awards fall-distance score
- **GIVEN** a session at level `1` whose active piece has `points` `3` and origin row `1` on a `22`-row board
- **WHEN** the engine drops the active piece
- **THEN** `statistics.score` increases by `3 × (22 − 1) × 1 ÷ 10 = 6`

### Requirement: Level increases after every 30 locked pieces
The shared engine SHALL track the number of locked pieces as `blocks` and SHALL increase `level` by `1` after every `30` locked pieces, up to a maximum level of `9`.

#### Scenario: Level advances after 30 pieces
- **GIVEN** a session at level `1` that has locked `29` pieces
- **WHEN** the engine locks the next piece
- **THEN** `statistics.level` becomes `2`
- **AND** `statistics.blocks` becomes `30`

### Requirement: Spawn uses the default origin and detects game over
On spawn, the shared engine SHALL set the active piece to the previous next piece at rotation angle `0` and origin row `1`, column `floor(width / 2)`, SHALL advance the preview cursor, and SHALL extend the game sequence when needed. If the spawned piece overlaps a buried cell or is out of bounds, the engine SHALL set `status` to `'game-over'`.

#### Scenario: A new piece spawns at the default origin
- **GIVEN** a session that has just settled a piece
- **WHEN** the engine spawns the next piece
- **THEN** the returned session's active piece key equals the previous next piece key
- **AND** its angle is `0` and its origin is row `1`, column `floor(width / 2)`

#### Scenario: A blocked spawn ends the game
- **GIVEN** a session whose spawn cells are already occupied
- **WHEN** the engine tries to spawn the next piece
- **THEN** the returned session's `status` is `'game-over'`

### Requirement: Finished sessions ignore gameplay commands
The shared engine SHALL return a `'game-over'` session unchanged for move, rotate, tick, and drop operations.

#### Scenario: A finished session ignores a tick
- **GIVEN** a session with `status` `'game-over'`
- **WHEN** the engine ticks the session
- **THEN** the returned session equals the input session

