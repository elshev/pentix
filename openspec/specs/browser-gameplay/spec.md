# browser-gameplay Specification

## Purpose
Define the interactive browser gameplay client that renders the shared board, translates player input into shared `pentix-core` engine operations, runs the gravity loop, displays live score/level/lines plus an optional next-piece preview, and manages demo / playing / paused / game-over / restart states.
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

### Requirement: The client collects action, rotate, and drop counts

The browser gameplay UI SHALL maintain, for the current player game, a per-action count of the player's left, right, rotate, and drop inputs, keyed by the pressed action, and SHALL expose aggregate rotate and drop counts derived from them. The counts SHALL reset when a new player game starts and SHALL NOT accumulate while the attract demo is running.

#### Scenario: Player actions are counted as they are pressed

- **GIVEN** a playing game
- **WHEN** the player presses left, right, rotate, or drop
- **THEN** the corresponding per-action count increments
- **AND** the aggregate rotate count reflects each rotate and the aggregate drop count reflects each drop

#### Scenario: Counts reset per player game

- **GIVEN** a game that accumulated action counts
- **WHEN** the player starts a new game
- **THEN** the per-action, rotate, and drop counts reset to zero

### Requirement: The client tracks per-piece lock counts for all catalog pieces

The browser gameplay UI SHALL maintain a lock count for each of the 29 catalog pieces (enumerated from `PIECE_CATALOG`), incrementing the count for the piece that locks on each settle. A fresh game SHALL represent all 29 pieces with an initial count of zero.

#### Scenario: Each locked piece increments its own count

- **GIVEN** a playing game
- **WHEN** a piece locks
- **THEN** the count for that piece's key increments by one
- **AND** the counts for the other pieces are unchanged

#### Scenario: All 29 pieces are represented

- **GIVEN** a fresh game
- **WHEN** the per-piece panel renders
- **THEN** it includes an entry for every catalog piece

### Requirement: The client shows a secondary statistics panel below the main statistics

The browser UI SHALL render a collapsible "Statistics" panel in the right-hand column directly below the MainStatistics panel, open by default and using a smaller font. The panel SHALL show a combined key count (left and right inputs summed and shown without separate left/right values), a rotate count, and a drop count, plus a counter for each of the 29 catalog pieces. Each per-piece counter SHALL draw a small version of the piece whose minos are 5×5 pixels with the count beside it, and the counters SHALL be laid out in a fixed three-row grid with ten counters per row.

#### Scenario: The panel lives below the main statistics

- **GIVEN** the gameplay screen
- **WHEN** it renders
- **THEN** the secondary "Statistics" panel appears in the right column below the MainStatistics panel
- **AND** it shows a combined key count, a rotate count, and a drop count

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

