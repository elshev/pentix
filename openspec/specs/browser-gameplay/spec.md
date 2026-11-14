# browser-gameplay Specification

## Purpose
Define the interactive browser gameplay client that renders the shared board, translates player input into shared `pentix-core` engine operations, runs the gravity loop, displays live score/level/lines plus an optional next-piece preview, and manages ready / playing / paused / game-over / restart states.
## Requirements
### Requirement: The browser renders the shared board and active piece

The browser gameplay UI SHALL render the current session's board at its stored `width`-by-`height` dimensions, color each occupied cell by its `pieceKey`, and SHALL overlay the active piece's minos at the cells derived from the active piece origin and its occupied offsets.

#### Scenario: The board and spawn piece render on an empty board

- **GIVEN** a session with an empty default board and an active piece at the spawn origin
- **WHEN** the UI renders the board
- **THEN** it draws a `12` x `22` grid with no occupied cells
- **AND** it draws the active piece's minos at the spawn-derived cells

#### Scenario: Occupied cells and the active piece render together

- **GIVEN** a session whose board has occupied cells and an active piece
- **WHEN** the UI renders the board
- **THEN** each occupied cell is colored by its `pieceKey`
- **AND** the active piece's minos are drawn at the cells derived from its origin and offsets

### Requirement: Player controls map to shared engine operations

The browser gameplay UI SHALL translate player input into the shared `GameSessionEngine` operations — `move`, `rotate`, and `drop` (hard drop). Manual soft drop is removed from the game process. Keyboard keys and on-screen buttons SHALL trigger the same operations, and the UI SHALL record each player action (`L`, `R`, `C`, `A`, or `H`) into the session action log defined by `session-replay`.

#### Scenario: Move controls shift the active piece

- **GIVEN** an active session
- **WHEN** the player presses left/right or taps the corresponding on-screen button
- **THEN** the UI invokes `engine.move` with `'left'` or `'right'`
- **AND** records the corresponding `L` or `R` action
- **AND** the returned session is rendered

#### Scenario: Rotate controls rotate the active piece

- **GIVEN** an active session
- **WHEN** the player presses the rotate key or taps the rotate button
- **THEN** the UI invokes `engine.rotate` with the mapped direction
- **AND** records the corresponding `C` or `A` action
- **AND** the returned session is rendered

#### Scenario: Hard drop drops the active piece

- **GIVEN** an active session
- **WHEN** the player triggers hard drop
- **THEN** the UI invokes `engine.drop`
- **AND** records an `H` action
- **AND** the returned session is rendered

### Requirement: Gravity advances the active piece on a level-based schedule

During active play, the UI SHALL invoke `engine.tick` on an interval whose duration decreases as the session's level increases. The loop SHALL stop while paused or game-over.

#### Scenario: A tick advances the active piece

- **GIVEN** a playing session
- **WHEN** the gravity interval elapses
- **THEN** the UI invokes `engine.tick` and renders the returned `{ game, session }`

#### Scenario: Higher levels tick faster

- **GIVEN** a session at a higher level than another
- **WHEN** the gravity intervals for both levels are compared
- **THEN** the higher-level interval is shorter than the lower-level interval

#### Scenario: No ticks while paused or game-over

- **GIVEN** a paused or game-over session
- **WHEN** time elapses
- **THEN** no tick is dispatched

### Requirement: The HUD shows live statistics and an optional next piece

The UI SHALL display the session's score, level, and cleared lines from the session snapshot, updating after every state change. The UI SHALL also provide a next-piece preview that renders the piece for `session.nextPieceKey` from the shared catalog; the preview SHALL be disabled on first load (the default is off) and SHALL be toggleable by the player at any phase.

#### Scenario: The HUD reflects the session snapshot

- **GIVEN** a session with known statistics and a `nextPieceKey`
- **WHEN** the game renders for the first time
- **THEN** the HUD shows `score`, `level`, and `clearedLines`
- **AND** the next-piece preview is not rendered while the preview setting is off

#### Scenario: The player enables the next-piece preview

- **GIVEN** a session whose next-piece preview is disabled
- **WHEN** the player toggles the preview on
- **THEN** the HUD renders the piece for `session.nextPieceKey` from the shared catalog

#### Scenario: The HUD updates after a state change

- **GIVEN** a move, drop, or tick that changes the session
- **WHEN** the returned session renders
- **THEN** the HUD reflects the updated statistics
- **AND** an enabled next-piece preview reflects the updated `nextPieceKey`

### Requirement: The lifecycle spans ready, playing, paused, and game-over

The UI SHALL present a ready/start state, transition to playing on start by creating a fresh `PentixGame` and `PentixGameSession`, support pause and resume, and enter a game-over state when `session.status` becomes `'game-over'`, with restart creating a fresh game and session.

#### Scenario: Starting a game creates fresh state

- **GIVEN** the ready state
- **WHEN** the player starts
- **THEN** the UI creates a new `PentixGame` and `PentixGameSession`
- **AND** the UI enters the playing state

#### Scenario: Pausing and resuming

- **GIVEN** a playing session
- **WHEN** the player pauses
- **THEN** gravity stops and the UI enters the paused state
- **AND** resuming returns to playing with gravity running

#### Scenario: Game over transitions and restart

- **GIVEN** a session whose `tick` result has `status` `'game-over'`
- **WHEN** the UI renders that result
- **THEN** the UI enters the game-over state and offers restart
- **AND** restarting creates a fresh `PentixGame` and `PentixGameSession` and resumes play

### Requirement: Gameplay delegates to the shared engine without local re-implementation

The browser UI SHALL NOT reimplement movement, rotation, locking, scoring, line clearing, or game-over. All gameplay mutation SHALL go through the shared `GameSessionEngine` and `pentix-core` factories so browser behavior matches the server.

#### Scenario: Browser behavior matches the shared engine

- **GIVEN** any gameplay action processed by the UI
- **WHEN** the resulting state is inspected
- **THEN** the state was produced by the shared engine and matches its output for the same input

