## MODIFIED Requirements

### Requirement: The demo imitates player actions within the shared engine

The demo SHALL plan the active piece's destination (rotation angle and column) with the demo engine selected from the shared demo engine registry, and SHALL use that same engine's last-tick operation to decide whether a resting piece side-steps instead of locking. The browser client SHALL keep the main board's selected engine in its game state as a demo engine id, SHALL resolve that engine from the registry by id, SHALL initialize it to `random` on the initial page load and on every fresh board set, and SHALL NOT keep a separate temporary or hard-coded engine override constant outside that state. The selected engine SHALL travel with the session it planned, so after the main board and a demo board exchange sessions each board plans with the engine that arrived with its session. The destination SHALL be planned once per spawned piece and reused across steering steps, and SHALL additionally be re-targeted when the selected engine returns a last-tick side-step. The demo SHALL then steer toward that destination by rotating, then moving left or right, then hard-dropping once aligned. All demo movement, rotation, locking, and game-over detection SHALL go through the shared `GameSessionEngine`; the demo SHALL NOT re-implement those operations. A steering step that the board blocks on a resting piece SHALL lock that piece through the same engine instead of waiting, so a destination the piece can no longer reach never freezes the demo.

#### Scenario: The demo plans with the selected engine

- **GIVEN** an active demo session and a demo engine selected from the registry
- **WHEN** the demo plans a destination for the active piece
- **THEN** it calls that engine's destination operation
- **AND** it does not consult another engine's planner for that piece

#### Scenario: The main board runs the Random engine

- **GIVEN** a freshly loaded page, a freshly started player game that has ended, or a freshly started attract demo
- **WHEN** the client selects the engine that plans the main board's destinations
- **THEN** it resolves the registry engine whose id is `random` and whose display name is `Random`
- **AND** it reads that id from the game state instead of a hard-coded selection outside it

#### Scenario: The demo plans a destination for the active piece

- **GIVEN** an active demo session with a placeable active piece and the `delphi5` engine selected
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

#### Scenario: An engine that declines a last-tick move lets the piece lock

- **GIVEN** an active demo session whose selected engine returns `null` from its last-tick operation
- **WHEN** the active piece can no longer move down
- **THEN** the demo locks the piece through the shared `GameSessionEngine`
- **AND** it does not move the piece sideways

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

#### Scenario: An unreachable destination locks the resting piece

- **GIVEN** a resting demo piece whose planned destination needs a lateral or rotational step that settled cells block
- **WHEN** the demo takes that step
- **THEN** it locks the piece through the shared `GameSessionEngine` and spawns the next piece
- **AND** the demo keeps advancing instead of waiting for a placement it can never reach
- **AND** a game over reached later is still detected through the shared engine, so the delayed restart follows
