# browser-gameplay Specification

## Purpose

Define the interactive browser gameplay client that renders the shared board at a 20% larger mino size, translates player input into shared `pentix-core` engine operations, runs the gravity loop, shows a title-less statistics row above the board whose `Pieces` counter opens a pieces statistics popup that pauses the game, places every on-screen control and the level selector below the board, and manages the demo (including its post-game-over delay) / playing / paused / game-over / restart states.

## Requirements

### Requirement: The browser renders the shared board and active piece

The browser gameplay UI SHALL render the current session's board at its stored `width`-by-`height` dimensions, color each occupied cell by its `pieceKey`, and SHALL overlay the active piece's minos at the cells derived from the active piece origin and its occupied offsets. Each rendered mino SHALL use a display size 20% larger than the previous `22px` baseline — a cell size of `26.4px` (`calc(22px * 1.2)`) at desktop widths and `19.2px` (`calc(16px * 1.2)`) below the `900px` breakpoint — without changing the number of rendered rows or columns.

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

#### Scenario: Each mino renders 20% larger without changing the grid

- **GIVEN** a default `12` x `22` session board
- **WHEN** the UI renders the board
- **THEN** every cell is laid out at `26.4` by `26.4` pixels, or `19.2` by `19.2` pixels when the viewport is `900px` wide or narrower
- **AND** the grid still renders exactly `12` columns and `22` rows

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

The UI SHALL present an untitled statistics panel above the board that displays the session's score, cleared lines, and locked-piece count (presented as "Pieces" and read from `session.statistics.blocks`) on a single horizontal line, updating after every state change. The panel SHALL NOT render a "MainStatistics" title or any other panel heading, and SHALL NOT render a level line, level value, or secondary statistics panel beneath it. The locked-piece counter SHALL be a drop-down toggle that opens the pieces statistics popup described below. When the next-piece preview setting is enabled, the next piece SHALL be shown in the statistics line as the leftmost item, and SHALL render inside a fixed-size frame so its dimensions do not change between pieces and never resize the panel. The preview minos SHALL scale with the board minos by the same 20%. The preview SHALL be disabled on first load (the default is off) and SHALL be toggleable by the player at any phase.

#### Scenario: The HUD reflects the session snapshot

- **GIVEN** a session with known statistics and a `nextPieceKey`
- **WHEN** the game renders for the first time
- **THEN** the statistics line above the board shows `score`, `clearedLines`, and the locked-piece count ("Pieces")
- **AND** the line has no "MainStatistics" title above it
- **AND** no level line and no secondary statistics panel appear in the top area
- **AND** the next-piece preview is not rendered while the preview setting is off

#### Scenario: The next piece renders leftmost in the row

- **GIVEN** a session whose next-piece preview is enabled
- **WHEN** the statistics line renders
- **THEN** the next-piece preview is the leftmost item in the line
- **AND** the preview keeps a constant size as the next piece changes, so the line does not grow or shrink

#### Scenario: The pieces counter is a drop-down toggle

- **GIVEN** the gameplay screen with the pieces statistics popup closed
- **WHEN** the player looks at the statistics line
- **THEN** the "Pieces" counter is rendered as a button showing the locked-piece count and a collapsed chevron
- **AND** activating it expands the chevron and opens the pieces statistics popup
- **AND** activating it again collapses the chevron and closes the popup

#### Scenario: The HUD updates after a state change

- **GIVEN** a move, drop, or tick that changes the session
- **WHEN** the returned session renders
- **THEN** the statistics line reflects the updated score, lines, and locked-piece count
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

The browser UI SHALL render the engine-owned action counts and the per-piece lock counts in a pieces statistics popup that opens beneath the statistics line when the player activates the Pieces drop-down toggle and closes when it is activated again; the popup SHALL be closed on first render. While the popup is open the game SHALL be paused: gravity and attract-demo advancement stop, and the paused overlay SHALL NOT be shown for a player game that the popup itself paused; closing the popup SHALL resume a game it paused and SHALL leave an already-paused game paused. The popup SHALL show a combined move count read from `session.statistics.actions.moves` (left and right moves summed by the engine and shown without separate left/right values), a rotate count read from `session.statistics.actions.rotates`, and a drop count read from `session.statistics.actions.drops`, plus a counter for each of the 29 catalog pieces read from `session.statistics.pieceCounts`. Each per-piece counter SHALL draw a small version of the piece whose minos are 5×5 pixels with the count beside it, and the counters SHALL wrap onto as many centred rows as the popup width requires so that no counter overlaps another. The rendered values SHALL come from the current session snapshot, so the popup updates in every phase, including the demo.

#### Scenario: The popup opens from the Pieces toggle and is closed by default

- **GIVEN** the gameplay screen
- **WHEN** it first renders
- **THEN** the pieces statistics popup is not rendered
- **AND** activating the Pieces toggle renders the popup beneath the statistics line with a combined move count, a rotate count, and a drop count taken from the session statistics
- **AND** activating the toggle again hides it

#### Scenario: Opening the popup pauses a playing game

- **GIVEN** a playing session with gravity running
- **WHEN** the popup is opened
- **THEN** no further gravity ticks are applied while it stays open
- **AND** the paused overlay is not shown
- **AND** closing the popup resumes gravity

#### Scenario: Opening the popup suspends the demo

- **GIVEN** an active attract demo
- **WHEN** the popup is opened
- **THEN** demo advancement stops while it stays open
- **AND** closing the popup resumes the demo

#### Scenario: Closing does not resume a manually paused game

- **GIVEN** a player game paused with the Pause control
- **WHEN** the popup is opened and then closed
- **THEN** the game stays paused

#### Scenario: Per-piece counters use 5px minos and wrap to the popup width

- **GIVEN** the open pieces statistics popup
- **WHEN** the per-piece counters render
- **THEN** each catalog piece is drawn with 5×5-pixel minos and its count beside it
- **AND** the 29 counters wrap onto as many centred rows as fit the popup width without overlapping

### Requirement: The game-over overlay shows restart and demo hotkeys as tooltips

On game-over, the game-over overlay SHALL show a title and "Play again"/"Demo" buttons whose hotkeys are exposed as popup tooltips (hover tooltips) rather than inline text on the buttons. The overlay SHALL NOT include the statistics popup or a keyboard hint row; statistics are shown in the pieces statistics popup instead.

#### Scenario: The buttons expose hotkeys as tooltips

- **GIVEN** a game that reached game-over
- **WHEN** the overlay renders
- **THEN** "Play again" shows its `Enter` hotkey in a popup tooltip on hover
- **AND** "Demo" shows its `Space` hotkey in a popup tooltip on hover
- **AND** the statistics appear in the pieces statistics popup rather than in the overlay

### Requirement: Game-over actions wait for a short cooldown

After a player game reaches game-over, the browser gameplay UI SHALL immediately render the game-over overlay and keep the final locked board visible, but SHALL ignore requests to start a new player game (`start`/`restart`), to enter the demo, or to start a game from a level button until a fixed cooldown (`700` ms) has elapsed. The cooldown SHALL be enforced wherever the client leaves the game-over phase, so keyboard hotkeys, the overlay buttons, and the level buttons are blocked equally. The "Play again" and "Demo" buttons SHALL render disabled while the cooldown runs and SHALL enable once it elapses. The cooldown SHALL also delay the attract demo's automatic restart: a demo that reaches game-over keeps its final board for the same delay before the next demo starts.

#### Scenario: Stray input right after game over is ignored

- **GIVEN** a player session that just reached game-over and whose cooldown has not yet elapsed
- **WHEN** the player presses `Enter`, presses `Space`, activates the Restart control, or activates a level button
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

#### Scenario: The demo also waits out the delay

- **GIVEN** an active demo session whose next tick or drop produces `status` `'game-over'`
- **WHEN** that result is applied
- **THEN** the client keeps the demo's final board for the `700` ms delay
- **AND** starts a fresh demo session once the delay elapses
- **AND** no game-over overlay is presented meanwhile

### Requirement: The page header shows only the PENTIX wordmark

The browser UI page header SHALL render only the `PENTIX` wordmark and SHALL NOT render an eyebrow line, a tagline heading, or an explanatory paragraph. The wordmark SHALL be rendered larger than any other page text so it remains the single header element, and the header SHALL be no taller than half of its previous height (`~46px` at desktop widths instead of `~92px`).

#### Scenario: The header renders a single, compact wordmark

- **GIVEN** the gameplay page
- **WHEN** the header renders at a desktop width
- **THEN** it shows only the `PENTIX` wordmark
- **AND** it shows no tagline, eyebrow text, or explanatory paragraph
- **AND** the header block is approximately half its former height

### Requirement: The gameplay screen uses a single column with nothing beside the board

The browser gameplay UI SHALL arrange the statistics line, the (popup) pieces statistics, the board, the on-screen gameplay buttons, the level buttons, the settings controls, and the status line in one centered column whose width equals the board width, and SHALL NOT render a persistent right-hand panel column beside the board. The on-screen gameplay buttons (`◀`, `⟳ Rotate`, `▶`, `Hard drop`, `Pause`/`Resume`, `Restart`) and the settings controls (`Rotation: clockwise|anticlockwise`, `Next piece: on|off`) SHALL be rendered beneath the board, together with the level buttons directly beneath `Hard drop`.

#### Scenario: Statistics stack above the board

- **GIVEN** the gameplay screen
- **WHEN** it renders
- **THEN** the statistics line renders directly above the board
- **AND** it shares the board's width
- **AND** the pieces statistics popup opens from that line, over the top of the board

#### Scenario: All buttons render beneath the board

- **GIVEN** the gameplay screen
- **WHEN** it renders
- **THEN** `◀`, `⟳ Rotate`, `▶`, `Hard drop`, the ten level buttons, `Pause`/`Resume`, and `Restart` render below the board
- **AND** the rotation-direction and next-piece controls render below the board as well

#### Scenario: Nothing renders to the right of the board

- **GIVEN** any gameplay phase, including demo, the demo delay, and game-over
- **WHEN** the gameplay screen renders at a viewport wider than the board column
- **THEN** the space to the right of the board is empty
- **AND** no statistics, settings, or control panel occupies that space

### Requirement: The level buttons select the level, start a game, or retune the demo

The browser UI SHALL render a level selector of the ten levels `0`-`9` directly beneath the `Hard drop` control, highlighting the current session level (`session.statistics.level`) and rendering no `Start level:` label and no incremental `level` button. During a player game (playing or paused) only the levels **above** the current session level SHALL be enabled — choosing one raises the live session level and the configured starting level — while the current and lower levels SHALL be disabled, because the engine owns the level and lowering it would rewind its progression. Activating a level button during the attract demo, including the demo's post-game-over delay, SHALL set the configured starting level and apply it to the live demo session so its gravity speed changes immediately. Activating a level button in the game-over phase SHALL start a fresh player game at that level, and SHALL be ignored while the game-over cooldown is still running. The selected level SHALL be clamped to `0`-`9`.

#### Scenario: The current level is highlighted under Hard drop

- **GIVEN** a session whose `statistics.level` is `4`
- **WHEN** the bottom controls render
- **THEN** the level selector appears directly beneath the `Hard drop` button
- **AND** the `4` button is highlighted as the current level
- **AND** no `Start level:` label and no incremental level button are rendered

#### Scenario: A running game allows only raising the level

- **GIVEN** a playing (or paused) player game at level `3`
- **WHEN** the player looks at the level selector
- **THEN** levels `0`-`3` are disabled
- **AND** levels `4`-`9` are enabled
- **AND** activating level `6` sets the live session level and the configured level to `6`

#### Scenario: Lowering the level mid-game is refused

- **GIVEN** a playing game at level `6`
- **WHEN** a `setStartingLevel` action arrives for level `2` (a level button or the `2` key)
- **THEN** the session level stays `6`
- **AND** the session, phase, and settings are unchanged

#### Scenario: Choosing a level during the demo retunes the demo

- **GIVEN** an active attract demo at level `2`
- **WHEN** the player activates the `6` level button
- **THEN** the demo session's `statistics.level` becomes `6`
- **AND** the configured starting level becomes `6`
- **AND** the demo keeps running at the faster schedule

#### Scenario: Choosing a level after game over starts that level

- **GIVEN** a game-over screen whose cooldown has elapsed
- **WHEN** the player activates the `3` level button
- **THEN** a fresh player game starts in the playing phase
- **AND** its session level is `3`

#### Scenario: Stray level clicks during the cooldown are ignored

- **GIVEN** a game-over screen whose cooldown has not yet elapsed
- **WHEN** the player activates a level button
- **THEN** the client stays in the game-over phase
- **AND** the final board is unchanged

### Requirement: The attract demo restarts after the game-over delay

When a demo session reaches `status` `'game-over'`, the browser UI SHALL keep that demo's final board visible for the same game-over delay (`GAME_OVER_COOLDOWN_MS`, `700` ms) used after a player game, SHALL stop advancing the demo during that delay, SHALL NOT present the player-facing game-over overlay, and SHALL then start a fresh demo session automatically without any player action.

#### Scenario: The demo pauses on its final board

- **GIVEN** an active demo whose next step ends the demo game
- **WHEN** that result is applied
- **THEN** no fresh demo session is created yet
- **AND** the demo's final board and statistics stay rendered
- **AND** no game-over overlay appears

#### Scenario: A fresh demo starts after the delay

- **GIVEN** a demo that has reached its final board
- **WHEN** the `700` ms delay elapses
- **THEN** a fresh demo session starts with `status` `active`
- **AND** its session id differs from the finished demo's
- **AND** it uses the currently configured starting level

#### Scenario: The demo delay ignores the level of the finished session

- **GIVEN** a finished demo at level `8` and a configured starting level of `3`
- **WHEN** the delay elapses
- **THEN** the new demo session starts at level `3`
