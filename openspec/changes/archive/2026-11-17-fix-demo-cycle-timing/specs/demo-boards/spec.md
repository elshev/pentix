## REMOVED Requirements

### Requirement: The attract demo's automatic restart keeps the demo boards running

**Reason**: The main board's finished demo no longer restarts after its own delay; the attract cycle restarts only once every board has ended, so a restart replaces the whole board set instead of leaving the rail mid-game.

**Migration**: Use `The attract demo restarts only after every board has ended` in this capability and `The attract demo restarts after the game-over delay` in `browser-gameplay` for the new trigger, the whole-board-set gate, and the Space restart.

## ADDED Requirements

### Requirement: The attract demo restarts only after every board has ended

When the main board's demo session reaches `status` `'game-over'`, the client SHALL keep that finished session on the main board while any demo board's session is still `active`, SHALL keep advancing those demo boards on their own timers, and SHALL NOT create a fresh main demo session. Once every demo board's session has also reached `game-over`, the client SHALL wait out the same `700` ms game-over delay, measured from the last board's end, and SHALL then start a fresh demo cycle: one new `PentixGame`, a fresh main demo session seeded with the demo's mino, and a fresh session for every demo board, with the rail reassigned in registry order. The fresh main session SHALL be planned by the engine the main board was playing; the client SHALL carry nothing else over from the ended board set except the settings. A manual restart SHALL be possible before that gate: pressing Space while the main board holds a finished demo SHALL start the same fresh demo cycle at once.

#### Scenario: A finished main demo leaves the rail alone

- **GIVEN** a main demo that has reached its final board and a demo board whose session is still `active`
- **WHEN** the demo board's gravity steps elapse
- **THEN** that demo board keeps advancing the session it already had
- **AND** the main board keeps the finished session's id, board, and statistics
- **AND** no fresh main session exists yet

#### Scenario: The whole board set restarts together

- **GIVEN** a board set whose main demo and demo boards have all reached their final boards
- **WHEN** the `700` ms delay measured from the last board's end elapses
- **THEN** the main board and every demo board receive a new session
- **AND** each board's new session id differs from the one it replaced
- **AND** the rail is assigned in registry order again
- **AND** every new session is `active`

#### Scenario: The restart revives dead rail boards

- **GIVEN** a demos-only board set whose `demo-slot-1` session has been `game-over` for a while
- **WHEN** the whole board set ends and the delay elapses
- **THEN** `demo-slot-1` plays a fresh `active` session seeded with the demo's mino
- **AND** its engine is the registry engine for that slot again

#### Scenario: Space restarts the cycle before the gate

- **GIVEN** a finished main demo while a demo board still plays
- **WHEN** the player presses Space
- **THEN** a fresh board set starts immediately, on the main board and on the rail
- **AND** the demo boards that were still playing are replaced rather than kept

## MODIFIED Requirements

### Requirement: A demo board auto-plays through its own engine and the shared session engine

Each demo board SHALL plan once per spawned piece with the engine assigned to it: that engine returns a `DemoActionLog` for the board's active piece, and the board SHALL replay the log one action per gravity interval, applying exactly one gravity tick at each interval boundary and exactly one action through the shared `GameSessionEngine` halfway between two consecutive ticks, so from the piece's spawn the cadence is half an interval, Action, the rest of the interval, Tick. Each demo board's session SHALL start with the demo's seeded mino — one settled cell on the row before last, in a column chosen when that board's session starts — and SHALL keep it until its row is cleared. When the applied code is `H`, the board SHALL treat the code after it — the piece's last-tick move (`L` or `R`) — as the next action step, half an interval after the drop, and SHALL restart its interval rhythm so the tick that locks the dropped piece and spawns the next one comes a full interval after the drop; when that drop settles the board's piece instead, the following code SHALL be dropped with the finished piece's log and SHALL NOT steer the spawned piece. Once the log is exhausted the board SHALL apply ticks only until its piece locks. An action the board blocks SHALL leave the placement unchanged while that interval's tick still applies, and any unplayed actions SHALL be dropped when the piece locks. Every movement, rotation, hard drop, side-step, lock, and game-over detection SHALL go through the shared `GameSessionEngine`; the demo boards SHALL NOT re-implement those operations, and a demo board SHALL plan only with its own engine. The interval SHALL follow that board's own `session.statistics.level`, and the board's tick and action SHALL run on one timer at half of that interval, so a demo-board action never lands in the same instant as its gravity tick.

#### Scenario: Each demo board plans with its own engine

- **GIVEN** a demo board and the engine assigned to it
- **WHEN** a piece spawns on that board
- **THEN** the board calls that engine's `plan` with the board, the piece's orientations, and its rotation point, and receives the piece's action log
- **AND** it does not consult another engine's planner for that piece

#### Scenario: A demo board starts with its seeded mino

- **GIVEN** a freshly created demo board
- **WHEN** its session starts
- **THEN** its board holds exactly one settled cell, on the row before last
- **AND** that cell stays until its row is cleared
- **AND** the board reports no locked pieces for it

#### Scenario: A demo board replays its log between ticks

- **GIVEN** a demo board whose engine returned the log `"LH"` for its current piece
- **WHEN** its next two gravity intervals elapse
- **THEN** the board moves the piece left at the midpoint of the first interval after it spawned
- **AND** the gravity tick that closes that interval comes half an interval later
- **AND** the board hard-drops the piece at the midpoint of the interval that tick opened
- **AND** the dropped piece stays in place until the next tick locks it

#### Scenario: A demo board takes its last-tick move after the drop

- **GIVEN** a demo board whose log reaches `H` followed by one `R`, and a piece that can still be placed one row lower
- **WHEN** the drop's step and the step after it are applied
- **THEN** the drop's step only hard-drops the piece, which stays where it landed
- **AND** the next step moves it one column right, half an interval later
- **AND** the tick a full interval after the drop locks it, and only the addressed board advances

#### Scenario: A settling drop drops the last-tick move

- **GIVEN** a demo board whose piece cannot move down and whose log's next codes are `H` and `R`
- **WHEN** that steering step is applied
- **THEN** the hard drop settles the piece through the shared engine
- **AND** the following `R` is dropped with the finished piece's log, so it never moves the spawned piece
- **AND** the next gravity step still applies to the spawned piece

#### Scenario: The random board lets gravity finish the piece

- **GIVEN** the `random` demo board whose log has been fully replayed and whose piece has not locked
- **WHEN** further intervals elapse
- **THEN** each interval applies one gravity tick and no action
- **AND** the piece locks through the shared engine

#### Scenario: The Delphi 5 board steers with its log

- **GIVEN** the `delphi5` demo board and a placed active piece
- **WHEN** the board replays the engine's log
- **THEN** the log rotates and moves the piece toward the engine's chosen destination
- **AND** it contains a hard drop, followed by the engine's last-tick move when the destination needs one
- **AND** every step goes through the shared `GameSessionEngine`

#### Scenario: A blocked action still ticks

- **GIVEN** a demo board whose next action the board blocks
- **WHEN** its interval elapses
- **THEN** the placement stays unchanged for the action
- **AND** that interval's gravity tick still applies

#### Scenario: A new piece drops the old log

- **GIVEN** a demo board whose piece locked with unplayed actions still in its log
- **WHEN** the next piece spawns
- **THEN** the board plans a fresh log for the new piece
- **AND** the previous piece's unplayed actions are never applied to it


### Requirement: The demo boards keep running while the main board does not

The demo boards SHALL advance independently of the main board's phase and of any player action on it. When the main board is game over, paused, holding its finished attract demo until the whole board set has ended, or running its attract demo, each demo board whose session is still `active` SHALL keep advancing on its own timer. Opening the pieces statistics popup SHALL pause the main board only.

#### Scenario: The main game over does not stop the demo boards

- **GIVEN** a board set whose main session has reached game over and whose demo boards are mid-game
- **WHEN** the demo boards' gravity intervals elapse
- **THEN** each demo board applies its next step to its own session
- **AND** the main board's final board is unchanged

#### Scenario: The main pause does not stop the demo boards

- **GIVEN** a player game paused with the Pause control
- **WHEN** the demo boards' gravity intervals elapse
- **THEN** each demo board applies its next step
- **AND** the main session stays paused

#### Scenario: The pieces popup pauses only the main board

- **GIVEN** an open pieces statistics popup over a running player game
- **WHEN** the demo boards' gravity intervals elapse
- **THEN** the main board applies no gravity tick
- **AND** each demo board applies its next step

#### Scenario: The finished attract demo leaves the demo boards running

- **GIVEN** the main board holding its finished attract demo while the demo boards still play
- **WHEN** the demo boards' gravity intervals elapse
- **THEN** each active demo board applies its next step
- **AND** the main board keeps its finished session

### Requirement: A demo-board step applies to one board and stale steps are ignored

Every auto-play step SHALL name its board by slot id, and a steering step SHALL also name the session id and piece index it was planned for. The client SHALL apply a gravity step only to a board whose session is `active`, and a steering step only to a board whose session matches those values and whose status is `active`; otherwise it SHALL leave the whole board set unchanged. A demo board whose session has reached `status` `game-over` SHALL ignore further steps and keep its final board. Steps planned for one slot SHALL NOT be applied to another slot, whatever engines the slots play.

#### Scenario: Only the addressed board advances

- **GIVEN** a board set with several active demo boards
- **WHEN** a step addressed to `demo-slot-2` is applied
- **THEN** only the `demo-slot-2` session advances
- **AND** the `demo-slot-1` session and the main session are unchanged

#### Scenario: A stale step is ignored

- **GIVEN** a steering step planned for a session id or piece index that no longer matches the addressed demo board
- **WHEN** that step is applied
- **THEN** the addressed board's session is unchanged
- **AND** no other board changes

#### Scenario: A step planned before a swap is ignored

- **GIVEN** a step planned for the session that a double-click moved from a demo board to the main board
- **WHEN** that step is applied to its original demo-board slot
- **THEN** the slot's session is unchanged
- **AND** the main board is unchanged

#### Scenario: A finished demo board holds its final board

- **GIVEN** a demo board whose session has reached game over while the main board keeps playing
- **WHEN** further steps addressed to that board are applied
- **THEN** its final locked board and statistics stay rendered
- **AND** no fresh session is created for it until the whole board set restarts
