# gameplay-mechanics Specification

## MODIFIED Requirements

### Requirement: The active piece can move left and right
The shared `pentix-core` engine SHALL provide a move operation that shifts the active piece one column left or right. The move SHALL succeed only when every occupied cell of the shifted piece is within the board and unoccupied; otherwise the session SHALL be returned unchanged. A successful move SHALL increment `statistics.actions.moves` by one; a rejected move SHALL leave every statistic unchanged.

#### Scenario: A piece moves into empty space
- **GIVEN** a session whose active piece occupies only empty in-bounds cells one column to the right
- **WHEN** the engine moves the active piece right
- **THEN** the returned session's active piece origin column is one greater
- **AND** the board and the scoring statistics (score, level, cleared lines, and locked blocks) are unchanged
- **AND** `statistics.actions.moves` is one greater

#### Scenario: A piece cannot move through a wall
- **GIVEN** a session whose active piece already touches the left wall
- **WHEN** the engine moves the active piece left
- **THEN** the returned session equals the input session
- **AND** `statistics.actions.moves` is unchanged

#### Scenario: A piece cannot move into a buried cell
- **GIVEN** a session whose active piece would overlap a buried cell one column to the right
- **WHEN** the engine moves the active piece right
- **THEN** the returned session equals the input session
- **AND** `statistics.actions.moves` is unchanged

### Requirement: The active piece rotates with Delphi near-wall kicks
The shared engine SHALL provide a rotate operation that applies the next 90-degree step: clockwise subtracts `90` and counterclockwise adds `90`, normalized to the piece's rotation mode. If the rotated piece overlaps a wall, the engine SHALL apply a Delphi near-wall kick (right collision → column `width - maxX - 1`; left collision → column `-minX`; top collision → row `-minY`, where `minX`/`maxX`/`minY` are the rotated offsets' extremes). If the rotated piece still overlaps a wall or a buried cell, the session SHALL be returned unchanged. A rotation that changes the piece, including one that requires a kick, SHALL increment `statistics.actions.rotates` by one; a rejected rotation SHALL leave every statistic unchanged.

#### Scenario: A piece rotates in open space
- **GIVEN** a session whose active piece can rotate in place without collision
- **WHEN** the engine rotates the active piece clockwise
- **THEN** the returned session's active piece angle advances by one clockwise step
- **AND** the board and the scoring statistics (score, level, cleared lines, and locked blocks) are unchanged
- **AND** `statistics.actions.rotates` is one greater

#### Scenario: A piece kicks away from the right wall
- **GIVEN** a session whose active piece would extend past the right wall after rotation
- **WHEN** the engine rotates the active piece
- **THEN** the returned active piece angle is the rotated angle and its origin column is shifted left so the piece is in bounds
- **AND** `statistics.actions.rotates` is one greater

#### Scenario: A blocked rotation leaves the session unchanged
- **GIVEN** a session whose active piece cannot rotate without overlapping a buried cell
- **WHEN** the engine rotates the active piece
- **THEN** the returned session equals the input session
- **AND** `statistics.actions.rotates` is unchanged

## ADDED Requirements

### Requirement: The engine records action and per-piece statistics
The shared engine SHALL record gameplay statistics inside the session snapshot. `statistics.actions` SHALL contain `moves`, `rotates`, and `drops` counters: `moves` SHALL count successful left and right moves without distinguishing direction, `rotates` SHALL count successful rotations in either direction, and `drops` SHALL count hard-drop operations. A hard drop SHALL be counted whether it moves the active piece down or settles it immediately. `statistics.pieceCounts` SHALL hold a lock count for every `PIECE_CATALOG` piece key and SHALL increment only the count of the piece that locks during a settle. Gravity ticks SHALL NOT be counted as actions. Rejected operations and operations on a session whose status is `'game-over'` SHALL NOT change any counter. A newly created session SHALL start with all counters at zero and with a `0` entry for each of the 29 catalog piece keys.

#### Scenario: Successful moves accumulate a single move count
- **GIVEN** a session whose active piece can move both ways
- **WHEN** the engine moves the active piece left and then right
- **THEN** `statistics.actions.moves` is `2`
- **AND** no separate left or right counters exist in the statistics

#### Scenario: A hard drop is counted whether it moves or settles
- **GIVEN** one session whose active piece has empty cells below it and another whose active piece already rests on the floor
- **WHEN** the engine drops each active piece
- **THEN** both returned sessions have `statistics.actions.drops` one greater than their input session
- **AND** the resting session locks its piece in the same operation

#### Scenario: Gravity does not count as an action
- **GIVEN** a session whose active piece can move down
- **WHEN** the engine ticks the session
- **THEN** the active piece moves down one row
- **AND** `statistics.actions` is unchanged

#### Scenario: A locked piece increments only its own count
- **GIVEN** a session with an active piece of a known key at rest
- **WHEN** the engine locks that piece
- **THEN** `statistics.pieceCounts` for that key is one greater
- **AND** every other piece key keeps its previous count

#### Scenario: A fresh session starts with zeroed counters
- **GIVEN** a newly created session
- **WHEN** its statistics are inspected
- **THEN** `statistics.actions` is `{ moves: 0, rotates: 0, drops: 0 }`
- **AND** `statistics.pieceCounts` contains `0` for every catalog piece key
