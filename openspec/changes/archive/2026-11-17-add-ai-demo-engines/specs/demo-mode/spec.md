## RENAMED Requirements

- FROM: `### Requirement: The demo advances one gravity step and one steering step per interval`
- TO: `### Requirement: The demo advances one action and one gravity step per interval`

## MODIFIED Requirements

### Requirement: The demo imitates player actions within the shared engine

The demo SHALL plan the active piece's actions with the demo engine selected from the shared demo engine registry. That engine SHALL return one `DemoActionLog` per spawned piece, and the browser client SHALL replay the log one action per gravity interval: on each interval it SHALL apply the next action code through the shared `GameSessionEngine` and then apply exactly one gravity tick, so the cadence from the piece's spawn is Action, Tick, Action, Tick. Once the log is exhausted the client SHALL apply ticks only until the piece locks. An action the board blocks SHALL leave the placement unchanged while its paired tick still applies. The browser client SHALL keep the main board's selected engine in its game state as a demo engine id, SHALL resolve that engine from the registry by id, SHALL initialize it to `random` on the initial page load and on every fresh board set, and SHALL NOT keep a separate temporary or hard-coded engine override constant outside that state. The selected engine SHALL travel with the session it planned, so after the main board and a demo board exchange sessions each board plans with the engine that arrived with its session. The log SHALL be planned once per spawned piece and replayed across intervals; the demo SHALL NOT re-plan mid-piece, SHALL NOT ask the engine on the last tick, and SHALL drop any unplayed actions when the piece locks. All demo movement, rotation, locking, and game-over detection SHALL go through the shared `GameSessionEngine`; the demo SHALL NOT re-implement those operations.

#### Scenario: The demo plans with the selected engine

- **GIVEN** an active demo session and a demo engine selected from the registry
- **WHEN** a piece spawns
- **THEN** the demo calls that engine's `plan` with the board, the piece's orientations, and its rotation point, and receives its action log
- **AND** it does not consult another engine's planner for that piece

#### Scenario: The demo replays the log as Action then Tick

- **GIVEN** an active demo session whose engine returned the log `"LR"` for the current piece
- **WHEN** the first two gravity intervals elapse
- **THEN** the first interval moves the piece left and then steps gravity once
- **AND** the second interval moves the piece right and then steps gravity once
- **AND** the piece moves once and descends once per interval, in that order

#### Scenario: The first action lands before the first tick

- **GIVEN** a piece that has just spawned and a log that starts with `L`
- **WHEN** the first gravity interval elapses
- **THEN** the piece moves left before it descends
- **AND** it does not descend before the action

#### Scenario: Gravity continues after the log ends

- **GIVEN** a piece whose log has been fully replayed and which has not locked
- **WHEN** further gravity intervals elapse
- **THEN** each interval applies one gravity tick and no action
- **AND** the piece locks when a tick settles it

#### Scenario: A blocked action does not stall the demo

- **GIVEN** a resting piece and a log whose next action the board blocks
- **WHEN** the interval elapses
- **THEN** the blocked action leaves the placement unchanged
- **AND** the paired gravity tick locks the piece and the next piece spawns
- **AND** the unplayed actions of the old piece are dropped

#### Scenario: The main board runs the Random engine

- **GIVEN** a freshly loaded page, a freshly started player game that has ended, or a freshly started attract demo
- **WHEN** the client selects the engine that plans the main board's actions
- **THEN** it resolves the registry engine whose id is `random` and whose display name is `Random`
- **AND** it reads that id from the game state instead of a hard-coded selection outside it

#### Scenario: The log follows the classic placement preference

- **GIVEN** an active demo session with a placeable active piece and the `delphi5` engine selected
- **WHEN** the engine returns the piece's log
- **THEN** the log steers toward a placement that is lower, reduces the number of column holes, and completes more full rows
- **AND** among placements with equal score it steers toward the one the classic tie-breaks prefer

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

#### Scenario: A fresh board set restores the Random engine

- **GIVEN** a main board running the `delphi5` engine after a swap
- **WHEN** the player starts or restarts a game
- **THEN** the main board's attract demo is planned by the registry's `random` engine again

#### Scenario: The attract demo keeps its engine across an automatic restart

- **GIVEN** a main board running the `delphi5` engine after a swap whose demo session has reached game over
- **WHEN** the `700` ms delay elapses and a fresh demo session starts on the main board
- **THEN** the fresh main demo session is planned by the `delphi5` engine
- **AND** no demo board's session or engine changes

### Requirement: The demo advances one action and one gravity step per interval

The browser gameplay client SHALL advance the demo exactly once per gravity interval with a single step that applies one action from the selected engine's log (when the log still has an unplayed action) followed by exactly one gravity tick, and SHALL NOT advance demo gravity from a separate gravity loop. Once the log has no unplayed actions the step SHALL apply the gravity tick alone. The step SHALL carry the session id and piece index it was planned for, and the client SHALL ignore a step that no longer matches the current demo session or piece.

#### Scenario: The action and the tick share one interval

- **GIVEN** an active demo session and a log with an unplayed action
- **WHEN** the gravity interval elapses
- **THEN** the piece applies that one action and then moves down one row, or locks when it cannot
- **AND** no other timer advances the demo

#### Scenario: An exhausted log runs ticks only

- **GIVEN** an active demo session whose log has no unplayed actions
- **WHEN** the gravity interval elapses
- **THEN** the demo applies one gravity tick and no action

#### Scenario: A stale demo step is ignored

- **GIVEN** a demo step planned for a session id or piece index that no longer matches the current demo state
- **WHEN** the client applies that step
- **THEN** the demo state is left unchanged

## REMOVED Requirements

### Requirement: The demo plans each placement together with its side-steps

**Reason**: The engine contract is one action log per piece, so the demo cannot evaluate a side-step placement separately on the last tick. Side-step scoring stays inside `planDemoDestination`, which the `delphi5` engine still calls; the chosen destination therefore still accounts for shifted placements.

**Migration**: Engines that want a destination-based plan use `planDemoDestinationForOrientations` and convert the destination with `actionsToward`; no engine-level side-step call is required or available.

### Requirement: The demo side-steps on its last tick instead of locking

**Reason**: An engine is asked once per spawned piece and the demo replays that log; there is no mid-piece engine call, so no last-tick side-step exists. A piece locks when a gravity tick settles it.

**Migration**: An engine that wants a final lateral move encodes it in its log before `H`; `planDemoLastTickMove` remains a pure core helper for tests and custom planners but is no longer called by the demo.
