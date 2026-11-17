## MODIFIED Requirements

### Requirement: The demo imitates player actions within the shared engine

The demo SHALL plan the active piece's actions with the demo engine selected from the shared demo engine registry. That engine SHALL return one `DemoActionLog` per spawned piece, and the browser client SHALL replay the log one action per gravity interval: it SHALL apply exactly one gravity tick every interval and SHALL apply the next action code through the shared `GameSessionEngine` halfway between two consecutive ticks, so from the piece's spawn the cadence is half an interval, Action, the rest of the interval, Tick. A piece that spawns when a tick locks the previous piece SHALL NOT be steered in the instant it spawns; its first action SHALL land half an interval after that locking tick. When the applied code is `H`, the client SHALL treat the code after it — the piece's last-tick move (`L` or `R`) — as the next action step, applied half an interval after the drop, and SHALL restart the interval rhythm so the tick that locks the dropped piece and spawns the next one comes a full interval after the drop; the side-step SHALL therefore never share the drop's instant, and the dropped piece SHALL stay resting for a full interval before the next piece appears. When the drop settles the piece instead, the following code SHALL be dropped with the old piece's log and SHALL NOT steer the new piece. Once the log is exhausted the client SHALL apply ticks only until the piece locks. An action the board blocks SHALL leave the placement unchanged, and the interval's tick SHALL still apply. The browser client SHALL keep the main board's selected engine in its game state as a demo engine id, SHALL resolve that engine from the registry by id, SHALL initialize it to `random` on the initial page load, SHALL keep that engine when a player session starts and when a demo session restarts, and SHALL NOT keep a separate temporary or hard-coded engine override constant outside that state. The selected engine SHALL travel with the session it planned, so after the main board and a demo board exchange sessions each board plans with the engine that arrived with its session. The log SHALL be planned once per spawned piece and replayed across intervals; the demo SHALL NOT re-plan mid-piece, SHALL NOT ask the engine on the last tick, and SHALL drop any unplayed actions when the piece locks. All demo movement, rotation, hard drop, side-step, locking, and game-over detection SHALL go through the shared `GameSessionEngine`; the demo SHALL NOT re-implement those operations, SHALL NOT apply an action and a gravity tick in the same instant, and SHALL NOT let a second timer advance its gravity.

#### Scenario: The demo plans with the selected engine

- **GIVEN** an active demo session and a demo engine selected from the registry
- **WHEN** a piece spawns
- **THEN** the demo calls that engine's `plan` with the board, the piece's orientations, and its rotation point, and receives its action log
- **AND** it does not consult another engine's planner for that piece

#### Scenario: The demo replays the log between ticks

- **GIVEN** an active demo session whose engine returned the log `"LR"` for the current piece
- **WHEN** the first two gravity intervals elapse
- **THEN** the piece moves left at the midpoint of the first interval after it spawned
- **AND** the gravity tick that closes that interval comes half an interval later
- **AND** the piece moves right at the midpoint of the interval that tick opened
- **AND** the piece moves once and descends once per interval, at different instants

#### Scenario: The first action lands halfway through the first interval

- **GIVEN** a piece that has just spawned and a log that starts with `L`
- **WHEN** the first gravity interval elapses
- **THEN** the piece moves left after half of that interval has passed
- **AND** it does not descend before that action
- **AND** its first descent comes a full interval after it spawned

#### Scenario: The spawned piece waits before it is steered

- **GIVEN** a demo session whose steering step hard-drops the piece onto the floor
- **WHEN** that step is applied
- **THEN** the dropped piece stays where it landed, unlocked, for a full interval
- **AND** the step after the drop is another action — the log's last-tick move, when it carries one — not the locking tick
- **AND** the tick that locks it and spawns the next piece comes a full interval after the drop
- **AND** the spawned piece's first action comes half an interval after that tick


#### Scenario: The demo applies the last-tick move after the hard drop

- **GIVEN** an active demo session whose log reaches `H` and carries one `R` after it, with the piece resting on the floor beside a pocket on its right
- **WHEN** the drop's step and the step after it are applied
- **THEN** the drop's step only hard-drops the piece, which stays where it landed
- **AND** the next step moves it one column right, half an interval later
- **AND** the tick a full interval after the drop locks it in the pocket column rather than the column it was dropped in

#### Scenario: A drop that settles drops the last-tick move with the old log

- **GIVEN** a log whose next codes are `H` and `R` and a piece that cannot move down at the moment of the drop
- **WHEN** that steering step is applied
- **THEN** the hard drop settles the piece
- **AND** the following `R` belongs to the finished piece's log, so the spawned piece is never moved by it
- **AND** the next gravity step still applies to the spawned piece

#### Scenario: Gravity continues after the log ends

- **GIVEN** a piece whose log has been fully replayed and which has not locked
- **WHEN** further gravity intervals elapse
- **THEN** each interval applies one gravity tick and no action
- **AND** the piece locks when a tick settles it

#### Scenario: A blocked action does not stall the demo

- **GIVEN** a resting piece and a log whose next action the board blocks
- **WHEN** that steering step and the following tick are applied
- **THEN** the blocked action leaves the placement unchanged
- **AND** the interval's tick locks the piece and the next piece spawns
- **AND** the unplayed actions of the old piece are dropped

#### Scenario: The main board starts on the Random engine

- **GIVEN** a freshly loaded page whose attract demo still runs the engine it started with
- **WHEN** the client selects the engine that plans the main board's actions
- **THEN** it resolves the registry engine whose id is `random` and whose display name is `Random`
- **AND** it reads that id from the game state instead of a hard-coded selection outside it

#### Scenario: The log follows the classic placement preference

- **GIVEN** an active demo session with a placeable active piece and the `delphi5` engine selected
- **WHEN** the engine returns the piece's log
- **THEN** the log steers toward a placement that is lower, reduces the number of column holes, and completes more full rows
- **AND** among placements with equal score it steers toward the one the classic tie-breaks prefer
- **AND** when the preferred placement needs a last-tick side-step, the log carries that move after its `H`

#### Scenario: The log is held for the whole piece

- **GIVEN** an active demo session and a planned action log
- **WHEN** the demo replays it over several ticks
- **THEN** the log is not replaced until the piece locks or a new piece spawns

#### Scenario: An engine that returns an empty log lets the piece fall

- **GIVEN** an active demo session whose selected engine returns an empty log
- **WHEN** the gravity intervals elapse
- **THEN** the demo applies no actions
- **AND** the piece falls and locks through the shared `GameSessionEngine`

#### Scenario: The selected engine follows a swapped session

- **GIVEN** a main board running its attract demo with the `random` engine and a demo board running the `delphi5` engine
- **WHEN** the player double-clicks that demo board and its session moves to the main board
- **THEN** the main board plans its pieces with the `delphi5` engine
- **AND** the demo board that received the previous main session plans with the `random` engine

#### Scenario: A player game keeps the swapped engine

- **GIVEN** a main board running the `delphi5` engine after a swap
- **WHEN** the player starts or restarts a game and that game later gives way to the attract demo
- **THEN** the main board's attract demo is still planned by the `delphi5` engine
- **AND** the rail slots are assigned in registry order again

#### Scenario: The attract demo keeps its engine across an automatic restart

- **GIVEN** a main board running the `delphi5` engine after a swap, whose demo session and demo boards have all reached game over
- **WHEN** the `700` ms delay measured from the last board's end elapses and a fresh demo cycle starts
- **THEN** the fresh main demo session is planned by the `delphi5` engine
- **AND** the rail slots are assigned in registry order again

### Requirement: The demo advances one action and one gravity step per interval

The browser gameplay client SHALL advance the demo on one timer per board, running at half of that board's gravity interval, and SHALL alternate between two board-addressed steps: a gravity step that applies exactly one `GameSessionEngine.tick`, and a steering step that applies exactly one action from the selected engine's log when the log still has an unplayed action. The steering step SHALL NOT apply a gravity tick, and the client SHALL NOT advance demo gravity from any other timer or from the steering step. After a hard drop the client SHALL schedule the next step as a steering step again, so the log's last-tick move lands half an interval after the drop and the gravity step that locks the dropped piece comes a full interval after it, rather than at the next tick boundary. Once the log has no unplayed actions the steering step SHALL apply no action and the gravity step SHALL keep running once per interval. Each step SHALL name the board it belongs to; the steering step SHALL also name the session id and piece index it was planned for. The client SHALL ignore a steering step that no longer matches the addressed board, the current demo session, or the current piece, and SHALL ignore a gravity step addressed to a board that no longer exists or whose session is not `active`.

#### Scenario: The action and the tick never land together

- **GIVEN** an active demo session and a log with an unplayed action
- **WHEN** a gravity step is applied and half an interval later that steering step is applied
- **THEN** the gravity step moves the piece down one row, or locks it when it cannot
- **AND** the steering step applies that one action at the interval's midpoint
- **AND** no other timer advances the demo

#### Scenario: The steering step applies no gravity step

- **GIVEN** an active demo session with an unplayed lateral action
- **WHEN** that steering step is applied
- **THEN** the piece moves one column and keeps its row
- **AND** no gravity tick is applied by that step

#### Scenario: The last-tick move is the step after the drop

- **GIVEN** an active demo session at a log position whose code is `H` and whose following code is `R`
- **WHEN** the steering step is applied
- **THEN** that step applies only the hard drop
- **AND** the next step is a steering step that applies `R`, half an interval later
- **AND** the gravity step after it locks the piece, a full interval after the drop

#### Scenario: An exhausted log runs ticks only

- **GIVEN** an active demo session whose log has no unplayed actions
- **WHEN** the steering step and the gravity step are applied
- **THEN** the steering step applies no action
- **AND** the gravity step still applies one gravity tick

#### Scenario: A stale demo step is ignored

- **GIVEN** a steering step planned for a board, session id, or piece index that no longer matches the current demo state
- **WHEN** the client applies that step
- **THEN** the demo state is left unchanged

#### Scenario: A gravity step for a finished board is ignored

- **GIVEN** a demo board whose session has reached `status` `game-over`
- **WHEN** a gravity step addressed to that board is applied
- **THEN** the whole board set is left unchanged
- **AND** the finished board keeps its final cells and statistics
