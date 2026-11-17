## MODIFIED Requirements

### Requirement: A demo board auto-plays through its own engine and the shared session engine

Each demo board SHALL plan once per spawned piece with the engine assigned to it: that engine returns a `DemoActionLog` for the board's active piece, and the board SHALL replay the log one action per gravity interval, applying the next action through the shared `GameSessionEngine` and then exactly one gravity tick, so the cadence from the piece's spawn is Action, Tick, Action, Tick. Each demo board's session SHALL start with the demo's seeded mino — one settled cell on the row before last, in a column chosen when that board's session starts — and SHALL keep it until its row is cleared. When the applied code is `H` and the log carries one code after it, the board SHALL also apply that last-tick move (`L` or `R`) in the same interval, after the drop and before that interval's gravity tick; when that drop settles the board's piece instead, the board SHALL discard the last-tick move and SHALL NOT apply it to the spawned piece. Once the log is exhausted the board SHALL apply ticks only until its piece locks. An action the board blocks SHALL leave the placement unchanged while its paired tick still applies, and any unplayed actions SHALL be dropped when the piece locks. Every movement, rotation, hard drop, side-step, lock, and game-over detection SHALL go through the shared `GameSessionEngine`; the demo boards SHALL NOT re-implement those operations, and a demo board SHALL plan only with its own engine. The interval SHALL follow that board's own `session.statistics.level`.

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

#### Scenario: A demo board replays its log as Action then Tick

- **GIVEN** a demo board whose engine returned the log `"LH"` for its current piece
- **WHEN** its next two gravity intervals elapse
- **THEN** the first interval moves the piece left and then steps gravity once
- **AND** the second interval hard-drops the piece and then steps gravity once

#### Scenario: A demo board takes its last-tick move after the drop

- **GIVEN** a demo board whose log reaches `H` followed by one `R`, and a piece that can still be placed one row lower
- **WHEN** that interval elapses
- **THEN** the board hard-drops the piece, moves it one column right, and then applies one gravity tick
- **AND** only the addressed board advances

#### Scenario: A settling drop drops the last-tick move

- **GIVEN** a demo board whose piece cannot move down and whose log's next codes are `H` and `R`
- **WHEN** that interval elapses
- **THEN** the hard drop settles the piece through the shared engine
- **AND** the following `R` is discarded instead of moving the spawned piece

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
- **AND** the paired gravity tick still applies

#### Scenario: A new piece drops the old log

- **GIVEN** a demo board whose piece locked with unplayed actions still in its log
- **WHEN** the next piece spawns
- **THEN** the board plans a fresh log for the new piece

### Requirement: A board set pairs the main session with one demo board per registered engine

Alongside the main board's session, the browser gameplay client SHALL keep one demo board per engine registered in the shared demo engine registry, in registration order, addressed by the stable rail-slot ids `demo-slot-1`, `demo-slot-2`, and so on. The number of demo boards SHALL NOT exceed the rail's capacity of `12` boards; engines registered beyond that capacity SHALL NOT add boards. Every demo board's engine SHALL be resolved from the registry, so with the built-in engines slot 1 plays `delphi5` and slot 2 plays `random`. Every board SHALL own its own `PentixGameSession`, and all sessions created for one board set SHALL be created from one and the same `PentixGame`. The client SHALL identify a demo board by its slot id — never by its engine id — and SHALL address auto-play and engine operations to one board at a time, so a demo board keeps its slot id when the engine assigned to it changes. The main board's attract-demo engine SHALL be part of the board set: it SHALL start as `random` on the initial board set, and every later board set the client creates SHALL keep the engine the game state already holds, so the demo engine a double-click brought to the main board survives the player's next game, a restart, and the demo that follows. The rail SHALL always be reassigned in registration order and SHALL NOT be derived from the main board's engine, so the main board and a rail slot can end up playing the same engine.

#### Scenario: The page load starts the main session and every demo board

- **GIVEN** a freshly loaded page with no player game in progress
- **WHEN** the client initializes
- **THEN** the main board enters the attract demo with its own session
- **AND** one demo board exists per registered engine with a distinct session each
- **AND** every demo-board session has `status` `active`

#### Scenario: The engine assignment follows the registry order

- **GIVEN** a freshly created board set and the registry's built-in engines
- **WHEN** the client resolves the engine of each demo board
- **THEN** `demo-slot-1` uses the registry engine with id `delphi5` and display name `Delphi 5`
- **AND** `demo-slot-2` uses the registry engine with id `random` and display name `Random`
- **AND** the main board uses the registry engine with id `random`

#### Scenario: A later board set keeps the main board's engine

- **GIVEN** a main board running the `delphi5` engine after a double-click
- **WHEN** the player starts a game and later returns to the attract demo
- **THEN** the main board's attract demo is planned by `delphi5`
- **AND** `demo-slot-1` and `demo-slot-2` are assigned in registration order again
- **AND** the main board may play the same engine as one of the rail slots

#### Scenario: Registering another engine adds another rail board

- **GIVEN** a registry that lists `delphi5`, `random`, and a third engine
- **WHEN** a board set is created
- **THEN** the rail contains `demo-slot-1`, `demo-slot-2`, and `demo-slot-3`
- **AND** `demo-slot-3` plays the third engine
- **AND** no browser-client code names that engine

#### Scenario: The rail capacity bounds the board count

- **GIVEN** a registry with more engines than the rail's capacity of `12`
- **WHEN** a board set is created
- **THEN** the rail contains exactly `12` boards
- **AND** they play the first `12` registered engines in registration order

#### Scenario: A board id names its rail slot, not its engine

- **GIVEN** a board set whose demo boards run `delphi5` and `random`
- **WHEN** the client enumerates the demo boards
- **THEN** their ids are `demo-slot-1` and `demo-slot-2`
- **AND** each id stays the same whatever engine that slot currently plays

#### Scenario: Every board has its own session

- **GIVEN** a board set
- **WHEN** the client compares the main session with the demo-board sessions
- **THEN** every session has a different session id
- **AND** each demo board has its own board snapshot and its own statistics

- **AND** no action from the old log is replayed
