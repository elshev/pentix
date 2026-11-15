# browser-gameplay Specification

## Purpose
Define the interactive browser gameplay client that renders the shared board, translates player input into shared `pentix-core` engine operations, runs the gravity loop, displays live score/level/lines plus an optional next-piece preview, displays the engine-owned action and per-piece statistics for every phase including the demo, and manages demo / playing / paused / game-over / restart states.
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

During active play, the UI SHALL invoke `engine.tick` on an interval that matches the Delphi schedule `1000 − 100 × level` milliseconds — `1000` ms at level `0` down to `100` ms at level `9` — so the duration decreases as the session's level increases. The loop SHALL stop while paused or game-over.

#### Scenario: A tick advances the active piece

- **GIVEN** a playing session
- **WHEN** the gravity interval elapses
- **THEN** the UI invokes `engine.tick` and renders the returned `{ game, session }`

#### Scenario: Higher levels tick faster

- **GIVEN** a session at a higher level than another
- **WHEN** the gravity intervals for both levels are compared
- **THEN** the higher-level interval is shorter than the lower-level interval
- **AND** the interval is `1000` ms at level `0`, `500` ms at level `5`, and `100` ms at level `9`

#### Scenario: No ticks while paused or game-over

- **GIVEN** a paused or game-over session
- **WHEN** time elapses
- **THEN** no tick is dispatched

### Requirement: The HUD shows live statistics and an optional next piece

The UI SHALL present a "MainStatistics" panel that displays the session's score, level, cleared lines, and locked-piece count (presented as "Pieces" and read from `session.statistics.blocks`) on a single horizontal line, updating after every state change. When the next-piece preview setting is enabled, the next piece SHALL be shown in the same line as the leftmost item, and SHALL render inside a fixed-size frame so its dimensions do not change between pieces and never resize the panel. The preview SHALL be disabled on first load (the default is off) and SHALL be toggleable by the player at any phase.

#### Scenario: The HUD reflects the session snapshot

- **GIVEN** a session with known statistics and a `nextPieceKey`
- **WHEN** the game renders for the first time
- **THEN** the HUD shows `score`, `level`, `clearedLines`, and the locked-piece count ("Pieces") on a single line
- **AND** the next-piece preview is not rendered while the preview setting is off

#### Scenario: The next piece renders leftmost in the row

- **GIVEN** a session whose next-piece preview is enabled
- **WHEN** the MainStatistics panel renders
- **THEN** the next-piece preview is the leftmost item in the single statistics line
- **AND** the preview keeps a constant size as the next piece changes, so the panel does not grow or shrink

#### Scenario: The HUD updates after a state change

- **GIVEN** a move, drop, or tick that changes the session
- **WHEN** the returned session renders
- **THEN** the HUD reflects the updated statistics, including the locked-piece count
- **AND** an enabled next-piece preview reflects the updated `nextPieceKey`

### Requirement: The lifecycle spans ready, playing, paused, and game-over

The UI SHALL present a demo state on first load, transition to playing when the player starts by creating a fresh `PentixGame` and `PentixGameSession`, support pause and resume, and enter a game-over state when `session.status` becomes `'game-over'`. On game-over the UI SHALL preserve the final locked board (drawing no active, failed spawn piece) and SHALL offer both a fresh player game and re-entry to the demo.

#### Scenario: The client starts in demo mode on first load

- **GIVEN** no player game is in progress
- **WHEN** the page first loads
- **THEN** the UI enters the demo state
- **AND** auto-plays a local session

#### Scenario: Starting a game creates fresh state

- **GIVEN** the demo or game-over state
- **WHEN** the player starts
- **THEN** the UI creates a new `PentixGame` and `PentixGameSession`
- **AND** the UI enters the playing state

#### Scenario: Pausing and resuming

- **GIVEN** a playing session
- **WHEN** the player pauses
- **THEN** gravity stops and the UI enters the paused state
- **AND** resuming returns to playing with gravity running

#### Scenario: Game over preserves the final board and offers restart or demo

- **GIVEN** a session whose `tick` result has `status` `'game-over'`
- **WHEN** the UI renders that result
- **THEN** the UI enters the game-over state with the final locked board still visible and no failed spawn piece drawn
- **AND** the UI offers a fresh player game and re-entry to the demo

### Requirement: Gameplay delegates to the shared engine without local re-implementation

The browser UI SHALL NOT reimplement movement, rotation, locking, scoring, line clearing, or game-over. All gameplay mutation SHALL go through the shared `GameSessionEngine` and `pentix-core` factories so browser behavior matches the server.

#### Scenario: Browser behavior matches the shared engine

- **GIVEN** any gameplay action processed by the UI
- **WHEN** the resulting state is inspected
- **THEN** the state was produced by the shared engine and matches its output for the same input

### Requirement: Level controls adjust the configured starting level

The browser gameplay UI SHALL provide level controls that increase and decrease the configured starting level, clamped to the inclusive range `0` to `9`, and SHALL default the starting level to `9` on first load.

#### Scenario: The starting level defaults to nine

- **GIVEN** a freshly initialized gameplay client
- **WHEN** the client reads its default settings
- **THEN** the configured starting level is `9`

#### Scenario: The plus key raises the starting level

- **GIVEN** an initialized gameplay client with a starting level below `9`
- **WHEN** the player presses `+` (or `=`)
- **THEN** the configured starting level increases by one
- **AND** is clamped to no more than `9`

#### Scenario: The minus key lowers the starting level

- **GIVEN** an initialized gameplay client with a starting level above `0`
- **WHEN** the player presses `-` (or `_`)
- **THEN** the configured starting level decreases by one
- **AND** is clamped to no less than `0`

### Requirement: The client displays the engine-owned action and per-piece statistics

The browser gameplay UI SHALL display the action counters and per-piece lock counts stored on the current `PentixGameSession` and SHALL NOT maintain its own copies of those counters. The combined move count SHALL be labelled "Moves", the rotation count "Rotates", and the hard-drop count "Drops". Per-piece counts SHALL be rendered for every `PIECE_CATALOG` key from `session.statistics.pieceCounts`. Because the values belong to the session, the panel SHALL show statistics for whichever session is active, including attract-demo sessions, and SHALL show zeroed values on a freshly started session without any client-side reset step.

#### Scenario: Player actions are reflected through the session snapshot

- **GIVEN** a playing game whose session has recorded move, rotate, and drop counts
- **WHEN** the player presses left, right, rotate, or drop
- **THEN** the panel shows the updated `moves`, `rotates`, and `drops` values returned by the engine
- **AND** the client does not increment any counter of its own

#### Scenario: The demo also shows statistics

- **GIVEN** an active demo session whose engine recorded actions
- **WHEN** the demo panel renders
- **THEN** it shows that demo session's move, rotate, drop, and per-piece counts
- **AND** the same counters are cleared when the demo session restarts after game over

#### Scenario: A freshly started session shows zeroed statistics

- **GIVEN** a newly started player or demo session
- **WHEN** the statistics panel renders
- **THEN** it shows `0` moves, `0` rotates, and `0` drops
- **AND** it shows `0` for every catalog piece

### Requirement: The client shows a secondary statistics panel below the main statistics

The browser UI SHALL render a collapsible "Statistics" panel in the right-hand column directly below the MainStatistics panel, open by default and using a smaller font. The panel SHALL show a combined move count read from `session.statistics.actions.moves` (left and right moves summed by the engine and shown without separate left/right values), a rotate count read from `session.statistics.actions.rotates`, and a drop count read from `session.statistics.actions.drops`, plus a counter for each of the 29 catalog pieces read from `session.statistics.pieceCounts`. Each per-piece counter SHALL draw a small version of the piece whose minos are 5×5 pixels with the count beside it, and the counters SHALL be laid out in a fixed three-row grid with ten counters per row. The rendered values SHALL come from the current session snapshot, so the panel updates in every phase, including the demo.

#### Scenario: The panel lives below the main statistics

- **GIVEN** the gameplay screen
- **WHEN** it renders
- **THEN** the secondary "Statistics" panel appears in the right column below the MainStatistics panel
- **AND** it shows a combined move count, a rotate count, and a drop count taken from the session statistics

#### Scenario: Per-piece counters use 5px minos in a ten-per-row grid

- **GIVEN** the secondary statistics panel
- **WHEN** the per-piece counters render
- **THEN** each catalog piece is drawn with 5×5-pixel minos and its count beside it
- **AND** the counters are arranged in three rows of up to ten per row

#### Scenario: The statistics panel is collapsible and open by default

- **GIVEN** the gameplay screen
- **WHEN** it first renders
- **THEN** the "Statistics" panel is expanded
- **AND** the player can collapse or expand it

### Requirement: The game-over overlay shows restart and demo hotkeys as tooltips

On game-over, the game-over overlay SHALL show a title and "Play again"/"Demo" buttons whose hotkeys are exposed as popup tooltips (hover tooltips) rather than inline text on the buttons. The overlay SHALL NOT include the statistics panel or a keyboard hint row; statistics are shown in the sidebar panel instead.

#### Scenario: The buttons expose hotkeys as tooltips

- **GIVEN** a game that reached game-over
- **WHEN** the overlay renders
- **THEN** "Play again" shows its `Enter` hotkey in a popup tooltip on hover
- **AND** "Demo" shows its `Space` hotkey in a popup tooltip on hover
- **AND** the statistics appear in the sidebar panel rather than the overlay

### Requirement: Game-over actions wait for a short cooldown

After a player game reaches game-over, the browser gameplay UI SHALL immediately render the game-over overlay and keep the final locked board visible, but SHALL ignore requests to start a new player game (`start`/`restart`) or to enter the demo until a fixed cooldown of at most one second (`700` ms) has elapsed. The cooldown SHALL be enforced wherever the client leaves the game-over phase, so keyboard hotkeys and on-screen buttons are blocked equally. The "Play again" and "Demo" buttons SHALL render disabled while the cooldown runs and SHALL enable once it elapses. The cooldown SHALL NOT apply to the attract demo's automatic restart.

#### Scenario: Stray input right after game over is ignored

- **GIVEN** a player session that just reached game-over and whose cooldown has not yet elapsed
- **WHEN** the player presses `Enter`, presses `Space`, or activates the Restart control
- **THEN** the client stays in the game-over phase
- **AND** the final board and collected statistics are unchanged

#### Scenario: Overlay actions are disabled during the cooldown

- **GIVEN** a player game in the game-over phase before the cooldown elapses
- **WHEN** the overlay renders
- **THEN** "Play again" and "Demo" render as disabled buttons
- **AND** they still expose their `Enter` and `Space` hotkeys as popup tooltips

#### Scenario: Actions work once the cooldown elapses

- **GIVEN** a player game in the game-over phase after the cooldown has elapsed
- **WHEN** the player presses `Enter`, presses `Space`, or activates the corresponding overlay button
- **THEN** `Enter`/"Play again" starts a fresh player game in the playing phase
- **AND** `Space`/"Demo" starts a fresh demo session

#### Scenario: The demo still restarts without delay

- **GIVEN** an active demo session whose next tick or drop produces `status` `'game-over'`
- **WHEN** that result is applied
- **THEN** the client starts a fresh demo session immediately
- **AND** no game-over overlay or cooldown is presented

