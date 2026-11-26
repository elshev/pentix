# demo-playback Specification

## Purpose
TBD - created by archiving change add-server-play-demo. Update Purpose after archive.
## Requirements
### Requirement: `pentix-core` plays a demo session headlessly

`pentix-core` SHALL provide a demo driver that plays a `PentixGameSession` with a `DemoEngine` without timers, I/O, persistence, or DOM or Node.js APIs. It SHALL expose `createDemoPlayback(options)` returning a playback state, `advanceDemoPlayback(playback)` returning the state after exactly one operation, and `playDemoSession(options)` returning the final result. Options SHALL be the engine, the game, the session, an optional `selectPieceId`, and an optional `clock`. The playback SHALL plan only the current piece. It SHALL apply every movement, rotation, hard drop, lock, line clear, score, level, and game-over detection through the shared `GameSessionEngine`. It SHALL NOT mutate its arguments. It SHALL stop once the session's `status` is `game-over`. `playDemoSession` SHALL return `{ game, session, planTimeMs, plans }` for the finished session.

#### Scenario: A playback plays one session to game over

- **GIVEN** an active demo session, its game, and a registered engine
- **WHEN** `playDemoSession` runs that combination
- **THEN** it returns a session whose `status` is `game-over`
- **AND** every placement, lock, clear, score, and level change came from `GameSessionEngine`
- **AND** it created no timer, no file, and no stored record

#### Scenario: Playback leaves its arguments unchanged

- **GIVEN** a session, a game, and an engine passed to `createDemoPlayback`
- **WHEN** the playback advances to game over
- **THEN** the original session and game objects still hold their opening snapshots
- **AND** every change is returned in a new playback state

### Requirement: A demo session starts seeded and at the demo level

`pentix-core` SHALL provide `createDemoSession({ id, userId, game, level, seedColumn })` and `withSeededDemoMino(session, seedColumn)`. A created demo session SHALL be a `createPentixGameSession` result with `statistics.level` set to the supplied level. It SHALL carry exactly one settled cell at row `height - 2`, in a column chosen when the session starts, unless `seedColumn` is supplied. The seeded cell SHALL carry the `1Line` piece key, so it survives line-clear rebuilds. It SHALL NOT increment `statistics.blocks`, `statistics.score`, or `statistics.clearedLines`. It SHALL be an ordinary settled cell that stays until its row is cleared. A session with no board rows or no columns SHALL be returned unchanged.

#### Scenario: A demo session opens with one seed mino

- **GIVEN** a game with a `12` by `22` board and level `9`
- **WHEN** `createDemoSession` runs with that game and level
- **THEN** the session reports level `9`
- **AND** its board holds exactly one occupied cell, at row `20`
- **AND** that cell carries the `1Line` key
- **AND** the session reports zero score, zero cleared lines, and zero blocks

#### Scenario: A supplied seed column is used verbatim

- **GIVEN** a supplied `seedColumn` of `7`
- **WHEN** the demo session is created
- **THEN** the seeded cell sits in column `7` of the row before last

#### Scenario: Seeding is idempotent for statistics

- **GIVEN** a fresh session and its seeded copy
- **WHEN** their statistics are compared
- **THEN** only the board differs
- **AND** no piece count changed

### Requirement: Playback applies one action and one tick in the demo's order

A playback SHALL name the operation its next `advanceDemoPlayback` applies as either `action` or `tick`, and SHALL start on `action`. A tick operation SHALL apply exactly one `GameSessionEngine.tick` and switch the next operation to `action`. An action operation SHALL plan the current piece when no log is cached for the session and `nextPieceIndex`. It SHALL apply the next code of that log through `GameSessionEngine` (`move`, `rotate`, or `drop`), and it SHALL advance the log position by one. After a `H` code the next operation SHALL be `action` again. In this way a log's single post-drop `L` or `R` lands before the locking tick. After any other code, and after an exhausted or empty log, the next operation SHALL be `tick`. When the hard drop settled the piece and spawned a new one, the following code SHALL be dropped with the finished piece's log. That code SHALL NOT steer the spawned piece. An action the board blocks SHALL leave the placement unchanged, and the log SHALL still advance. The playback SHALL keep planning and ticking until the session ends, and SHALL apply no action codes once the log is exhausted.

#### Scenario: The action precedes the tick

- **GIVEN** a playback whose first log code is `L`
- **WHEN** the first advance is applied
- **THEN** the piece moved one column and its row is unchanged
- **AND** the next operation is a tick
- **AND** the tick that follows moves the piece one row down

#### Scenario: A hard drop is followed by a steering operation

- **GIVEN** a playback whose log is `HL`
- **WHEN** the `H` advance is applied
- **THEN** the piece is hard-dropped and not locked
- **AND** the next operation is an action, not a tick
- **AND** the following advance moves the piece one column left
- **AND** the tick after that locks it

#### Scenario: A settling drop drops the post-drop code

- **GIVEN** a playback whose piece cannot move down and whose log is `HR`
- **WHEN** the `H` advance settles the piece
- **THEN** the spawned piece is not moved by the following `R`
- **AND** the playback plans a fresh log for the spawned piece
- **AND** the next operation is an action for the new piece

#### Scenario: An exhausted log still ticks

- **GIVEN** a playback whose log has no unplayed code
- **WHEN** further advances are applied
- **THEN** action operations change no placement
- **AND** tick operations keep applying one gravity step each
- **AND** the piece locks and the playback continues with the next piece

#### Scenario: A blocked action does not stall the playback

- **GIVEN** a playback whose next code the board blocks
- **WHEN** that action operation and the following tick operation are applied
- **THEN** the blocked action leaves the placement unchanged
- **AND** the tick still applies
- **AND** the playback keeps making progress

### Requirement: Playback reports only the time spent planning

`createDemoPlayback` SHALL accept a `clock` returning fractional milliseconds and SHALL default it to `performance.now()` with a `Date.now()` fallback where `performance` is unavailable. The playback SHALL read that clock immediately before and after each `engine.plan` call, SHALL add only those differences to `planTimeMs`, and SHALL count each call in `plans`. It SHALL NOT time player-visible operations, ticks, planning-input construction, or log replay. `playDemoSession` SHALL return the accumulated `planTimeMs` unchanged, and the value SHALL never be negative.

#### Scenario: Only `plan` calls are timed

- **GIVEN** a clock returning `0`, `0.5`, `1`, and `1.5` for the two `plan` calls it sees and a playback that ran many ticks
- **WHEN** the playback finishes
- **THEN** `planTimeMs` is exactly `1`
- **AND** `plans` is `2`
- **AND** the tick count did not change the reported time

#### Scenario: An empty log is still a measured plan

- **GIVEN** an engine that returns the empty log and a clock that advances by `0.25` per reading pair
- **WHEN** one piece is planned
- **THEN** `plans` increased by one
- **AND** `planTimeMs` increased by `0.25`
- **AND** the piece fell under ticks only

### Requirement: Playback keeps the game's piece sequence

Every operation that returns an extended `PentixGame` SHALL make the playback keep the longer piece list. In this way the playback reads the next spawned piece from the returned game, not from a regenerated one. The returned result SHALL carry that merged game with the finished session. The session's `gameId` SHALL be unchanged.

#### Scenario: An extended sequence is returned

- **GIVEN** a game with two pieces at the start of a playback
- **WHEN** the playback locks pieces past the second index
- **THEN** its returned game holds a piece at every index the session consumed
- **AND** the returned session still reports the original `gameId`

