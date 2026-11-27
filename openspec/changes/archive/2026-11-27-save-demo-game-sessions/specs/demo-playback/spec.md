## MODIFIED Requirements

### Requirement: `pentix-core` plays a demo session headlessly

`pentix-core` SHALL provide a demo driver that plays a `PentixGameSession` with a `DemoEngine` without timers, I/O, persistence, or DOM or Node.js APIs. It SHALL expose `createDemoPlayback(options)` returning a playback state, `advanceDemoPlayback(playback)` returning the state after exactly one operation, and `playDemoSession(options)` returning the final result. Options SHALL be the engine, the game, the session, an optional `selectPieceId`, and an optional `clock`. The playback SHALL plan only the current piece. It SHALL apply every movement, rotation, hard drop, lock, line clear, score, level, and game-over detection through the shared `GameSessionEngine`. It SHALL NOT mutate its arguments. It SHALL stop once the session's `status` is `game-over`. `playDemoSession` SHALL return `{ game, session, log, planTimeMs, plans }` for the finished session, where `log` is the `SessionActionLog` that the playback recorded.

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

#### Scenario: A finished playback returns its log

- **GIVEN** a playback that reached `game-over`
- **WHEN** `playDemoSession` returns its result
- **THEN** the result carries a `SessionActionLog`
- **AND** that log names the played session, its user, and its game

### Requirement: Playback applies one action and one tick in the demo's order

A playback SHALL name the operation its next `advanceDemoPlayback` applies as either `action` or `tick`, and SHALL start on `action`. A tick operation SHALL apply exactly one `GameSessionEngine.tick` and switch the next operation to `action`. An action operation SHALL plan the current piece when no log is cached for the session and `nextPieceIndex`. It SHALL apply the next code of that log through `GameSessionEngine` (`move`, `rotate`, or `drop`), and it SHALL advance the log position by one. After a `H` code the next operation SHALL be `action` again. In this way a log's single post-drop `L` or `R` lands before the locking tick. After any other code, and after an exhausted or empty log, the next operation SHALL be `tick`. When the hard drop settled the piece and spawned a new one, the following code SHALL be dropped with the finished piece's log. That code SHALL NOT steer the spawned piece. An action the board blocks SHALL leave the placement unchanged, and the log SHALL still advance. The playback SHALL keep planning and ticking until the session ends, and SHALL apply no action codes once the log is exhausted.

The playback SHALL also record the log that it applies. It SHALL append each applied code to a `SessionActionLog`, under the numeric id of the piece that was active when the operation arrived. A tick SHALL append `T`. A blocked action SHALL append its code, because the recorded log is the transcript of the plan. A code that the settling hard drop discards SHALL NOT be appended. The playback SHALL take `level` from the session's opening `statistics.level`. It SHALL take `seedColumn` from the single occupied cell on the row before last, and it SHALL omit `seedColumn` when the opening board holds any other occupancy.

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

#### Scenario: The recorded log matches the applied operations

- **GIVEN** a playback that applied a blocked action, a hard drop, a post-drop code, and ticks
- **WHEN** its recorded pieces are inspected
- **THEN** the blocked action appears under the piece that was active
- **AND** the hard drop and the post-drop code appear in that order
- **AND** every applied tick appears as `T`
- **AND** the settling code that was discarded does not appear

#### Scenario: The log records the opening state

- **GIVEN** a fresh demo session at level `9` with one seed mino in column `7`
- **WHEN** its playback records a log
- **THEN** the log reports `level` `9`
- **AND** the log reports `seedColumn` `7`

- **AND** the log replays to the returned session state
