# demo-mode Specification

## Purpose
Define the attract/demo mode: auto-play that starts when no player game is active, imitates player actions through the shared engine, restarts itself after the same post-game-over delay a player game uses, and yields to / re-enters from player play.
## Requirements
### Requirement: Demo mode runs when no game is active

The browser gameplay client SHALL start demo mode when the page first loads with no player game in progress. A demo session SHALL be a purely local, non-persisted session that does not record any session-replay actions.

#### Scenario: Page load starts the demo

- **GIVEN** a freshly loaded page with no player game in progress
- **WHEN** the client initializes
- **THEN** the client enters the demo phase
- **AND** auto-plays a local session without any player input

### Requirement: The demo imitates player actions within the shared engine

The demo SHALL plan the active piece's actions with the demo engine selected from the shared demo engine registry. That engine SHALL return one `DemoActionLog` per spawned piece, and the browser client SHALL replay the log one action per gravity interval: on each interval it SHALL apply the next action code through the shared `GameSessionEngine` and then apply exactly one gravity tick, so the cadence from the piece's spawn is Action, Tick, Action, Tick. When the applied code is `H` and the log carries one code after it, the client SHALL also apply that last-tick move (`L` or `R`) in the same interval, after the drop and before that interval's gravity tick, so the piece can side-step one column into a placement a straight drop cannot reach; when the drop settles the piece instead, the client SHALL discard the last-tick move and the new piece SHALL NOT receive it. Once the log is exhausted the client SHALL apply ticks only until the piece locks. An action the board blocks SHALL leave the placement unchanged while its paired tick still applies. The browser client SHALL keep the main board's selected engine in its game state as a demo engine id, SHALL resolve that engine from the registry by id, SHALL initialize it to `random` on the initial page load, SHALL keep that engine when a player session starts and when a demo session restarts, and SHALL NOT keep a separate temporary or hard-coded engine override constant outside that state. The selected engine SHALL travel with the session it planned, so after the main board and a demo board exchange sessions each board plans with the engine that arrived with its session. The log SHALL be planned once per spawned piece and replayed across intervals; the demo SHALL NOT re-plan mid-piece, SHALL NOT ask the engine on the last tick, and SHALL drop any unplayed actions when the piece locks. All demo movement, rotation, hard drop, side-step, locking, and game-over detection SHALL go through the shared `GameSessionEngine`; the demo SHALL NOT re-implement those operations.

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

#### Scenario: The demo applies the last-tick move after the hard drop

- **GIVEN** an active demo session whose log reaches `H` and carries one `R` after it, with the piece resting on the floor beside a pocket on its right
- **WHEN** that interval elapses
- **THEN** the piece is hard-dropped, then moves one column right, and then the interval's gravity tick locks it
- **AND** the piece settles in the pocket column rather than the column it was dropped in

#### Scenario: A drop that settles discards the last-tick move

- **GIVEN** a log whose next codes are `H` and `R` and a piece that cannot move down at the moment of the drop
- **WHEN** that interval elapses
- **THEN** the hard drop settles the piece
- **AND** the following `R` is discarded, so the spawned piece is not moved by it
- **AND** exactly one gravity tick still applies


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

- **GIVEN** a main board running the `delphi5` engine after a swap whose demo session has reached game over
- **WHEN** the `700` ms delay elapses and a fresh demo session starts on the main board
- **THEN** the fresh main demo session is planned by the `delphi5` engine
- **AND** no demo board's session or engine changes

### Requirement: Starting a player game exits the demo

From the demo phase, a start input SHALL create a fresh `PentixGame` and `PentixGameSession` at the configured starting level and transition the client into the playing phase.

#### Scenario: The player starts during the demo

- **GIVEN** the client is in the demo phase
- **WHEN** the player triggers a start input (Enter or Space)
- **THEN** the client creates a fresh player session at the configured starting level
- **AND** enters the playing phase

### Requirement: Space re-enters the demo after a player game over

After a player game over, the final board SHALL remain visible, and pressing Space SHALL start the demo, clearing the board and auto-playing, without immediately starting a player game.

#### Scenario: Space starts the demo after game over

- **GIVEN** a player session in the game-over phase with its final board visible
- **WHEN** the player presses Space
- **THEN** the client starts a fresh demo session
- **AND** auto-plays while the player's final board is replaced by the demo board

### Requirement: The demo advances one action and one gravity step per interval

The browser gameplay client SHALL advance the demo exactly once per gravity interval with a single step that applies one action from the selected engine's log (when the log still has an unplayed action), then that action's last-tick move when the action is `H` and the log carries one, and then exactly one gravity tick, and SHALL NOT advance demo gravity from a separate gravity loop. Once the log has no unplayed actions the step SHALL apply the gravity tick alone. The step SHALL name the board it belongs to as well as the session id and piece index it was planned for, and the client SHALL ignore a step that no longer matches the addressed board, the current demo session, or the current piece.

#### Scenario: The action and the tick share one interval

- **GIVEN** an active demo session and a log with an unplayed action
- **WHEN** the gravity interval elapses
- **THEN** the piece applies that one action and then moves down one row, or locks when it cannot
- **AND** no other timer advances the demo

#### Scenario: The last-tick move rides the drop's interval

- **GIVEN** an active demo session at a log position whose code is `H` and whose following code is `R`
- **WHEN** the gravity interval elapses
- **THEN** that one step applies the hard drop, then the last-tick `R`, then one gravity tick
- **AND** the client does not wait for a second interval to apply the side-step
- **AND** no other timer advances the demo

#### Scenario: An exhausted log runs ticks only

- **GIVEN** an active demo session whose log has no unplayed actions
- **WHEN** the gravity interval elapses
- **THEN** the demo applies one gravity tick and no action

#### Scenario: A stale demo step is ignored

- **GIVEN** a demo step planned for a board, session id, or piece index that no longer matches the current demo state
- **WHEN** the client applies that step

---

### Requirement: Every demo session starts with a seeded mino

Each demo session the browser client creates SHALL begin with exactly one settled mino on the row before last (`height - 2`), in a column chosen at random when that session starts. The seeded mino SHALL be an ordinary settled cell: it SHALL carry a piece key like any locked piece so it survives line-clear rebuilds, it SHALL NOT count as a locked piece in the session statistics, and it SHALL add no score, cleared lines, or level progress. It SHALL stay part of the board until its row is completed and cleared, rather than being dropped when the demo starts or removed after a fixed delay, so the demo plays on around it. The seeding SHALL apply to the main board's attract demo — on the initial page load, when a player game gives way to the demo, and on every automatic demo restart — and to every rail demo board, and SHALL NOT apply to a player session.

#### Scenario: A demo starts with the seeded mino

- **GIVEN** a freshly loaded page
- **WHEN** the attract demo session starts
- **THEN** its board holds exactly one settled cell, on the row before last
- **AND** that cell sits in a column of the board
- **AND** the session reports no locked pieces and no score for it

#### Scenario: The seed stays while the demo plays around it

- **GIVEN** a demo session with its seeded mino
- **WHEN** the demo locks several pieces without completing the seeded row
- **THEN** the seeded cell is still settled where it was
- **AND** the demo keeps planning around that overhang

#### Scenario: Every demo start re-seeds the board

- **GIVEN** a player game that has ended, or a demo that reached game over
- **WHEN** the attract demo starts again, by the player pressing Space or by the automatic restart
- **THEN** the fresh demo session starts with one seeded mino on the row before last
- **AND** its column is chosen when that session starts

#### Scenario: A player session starts empty

- **GIVEN** a player who starts or restarts a game
- **WHEN** the client creates the player's session
- **THEN** the main board's session has no settled cells
- **AND** the rail demo boards created with it still get their seeded mino

- **THEN** the demo state is left unchanged

