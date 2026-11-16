## MODIFIED Requirements

### Requirement: The browser renders the shared board and active piece

The browser gameplay UI SHALL render the current session's board at its stored `width`-by-`height` dimensions, color each occupied cell by its `pieceKey`, and SHALL overlay the active piece's minos at the cells derived from the active piece origin and its occupied offsets. Each rendered mino SHALL measure `26.4` by `26.4` pixels at desktop widths and `19.2` by `19.2` pixels when the viewport is `900px` wide or narrower, without changing the number of rendered rows or columns.

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

#### Scenario: Each mino renders at the desktop cell size

- **GIVEN** a default `12` x `22` session board
- **WHEN** the UI renders the board at a desktop width
- **THEN** every cell is laid out at `26.4` by `26.4` pixels
- **AND** the grid still renders exactly `12` columns and `22` rows

#### Scenario: Each mino shrinks at the small breakpoint

- **GIVEN** a default `12` x `22` session board
- **WHEN** the UI renders the board at a viewport `900px` wide or narrower
- **THEN** every cell is laid out at `19.2` by `19.2` pixels
- **AND** the grid still renders exactly `12` columns and `22` rows

### Requirement: Player controls map to shared engine operations

The browser gameplay UI SHALL translate player input into the shared `GameSessionEngine` operations — `move`, `rotate`, and `drop` (hard drop). The client has no manual soft drop: a piece descends only through gravity ticks and hard drops. Keyboard keys and on-screen buttons SHALL trigger the same operations. The client plays its session locally and SHALL NOT call `PentixServer`, so it records no session action log; the log defined by `session-replay` covers sessions played through the REST gameplay endpoints.

#### Scenario: Move controls shift the active piece

- **GIVEN** an active session
- **WHEN** the player presses left/right or taps the corresponding on-screen button
- **THEN** the UI invokes `engine.move` with `'left'` or `'right'`
- **AND** the returned session is rendered

#### Scenario: Rotate controls rotate the active piece

- **GIVEN** an active session
- **WHEN** the player presses the rotate key or taps the rotate button
- **THEN** the UI invokes `engine.rotate` with the mapped direction
- **AND** the returned session is rendered

#### Scenario: Hard drop drops the active piece

- **GIVEN** an active session
- **WHEN** the player triggers hard drop
- **THEN** the UI invokes `engine.drop`
- **AND** the returned session is rendered

#### Scenario: There is no soft drop

- **GIVEN** an active session whose piece can still fall
- **WHEN** the player presses the down arrow, which is bound to no control
- **THEN** the piece does not move down and no `engine.tick` is invoked
- **AND** the piece descends only when the gravity interval elapses or through a hard drop

### Requirement: The page header shows only the PENTIX wordmark

The browser UI page header SHALL render only the `PENTIX` wordmark and SHALL NOT render an eyebrow line, a tagline heading, or an explanatory paragraph. The wordmark SHALL be rendered larger than any other page text so it remains the single header element, and the header SHALL stay compact — roughly `46px` tall at desktop widths — so it never pushes the board out of view.

#### Scenario: The header renders a single, compact wordmark

- **GIVEN** the gameplay page
- **WHEN** the header renders at a desktop width
- **THEN** it shows only the `PENTIX` wordmark
- **AND** it shows no tagline, eyebrow text, or explanatory paragraph
- **AND** the header block is roughly `46px` tall

### Requirement: The level buttons select the level, start a game, or retune the demo

The browser UI SHALL render a level selector of the ten levels `0`-`9` directly beneath the `Hard drop` control, highlighting the current session level (`session.statistics.level` while a player game is playing or paused, otherwise the configured starting level) and rendering nothing else in that selector — no label and no incremental level control. The configured starting level SHALL default to `9` and SHALL always be clamped to `0`-`9`.

Level selection SHALL behave as follows:

- A session created by the shared engine opens at level `1`; the client applies the configured starting level to the session it creates, so a first game starts at the configured level.
- While a player game is playing or paused, only the levels **above** the current session level SHALL be enabled. Choosing one raises the live session level through the client's session snapshot and becomes the configured starting level; the current and lower levels SHALL be disabled, because the engine raises the level every `30` locked pieces and lowering it would rewind that progression.
- During the attract demo, activating a level SHALL set the configured starting level and apply it to the live demo session so its gravity speed changes immediately; during the demo's post-game-over delay it SHALL set the configured starting level used by the next demo.
- In the game-over phase, activating a level SHALL start a fresh player game at that level, and SHALL be ignored while the game-over cooldown is still running.
- The `+` (or `=`) and `-` (or `_`) keys SHALL step the level by one under exactly the same rules as the buttons, so `+` raises a running game while `-` is refused there. The `0`-`9` keys SHALL select the matching level while the client is not in the playing phase; while a player game is playing those digits drive gameplay instead (`5`/`8` rotate, `7`/`9` move).

The engine owns level progression: it raises the level every `30` locked pieces up to `9` and never lowers it. The client only sets the level of the session it creates and may raise a live level; it SHALL NOT lower a level the engine has already raised.

#### Scenario: The current level is highlighted under Hard drop

- **GIVEN** a session whose `statistics.level` is `4`
- **WHEN** the bottom controls render
- **THEN** the level selector appears directly beneath the `Hard drop` button
- **AND** the `4` button is highlighted as the current level
- **AND** the selector contains only the ten level buttons

#### Scenario: The starting level defaults to nine

- **GIVEN** a freshly initialized gameplay client
- **WHEN** the client reads its default settings
- **THEN** the configured starting level is `9`
- **AND** the first player game it starts opens at level `9`

#### Scenario: A running game allows only raising the level

- **GIVEN** a playing (or paused) player game at level `3`
- **WHEN** the player looks at the level selector
- **THEN** levels `0`-`3` are disabled
- **AND** levels `4`-`9` are enabled
- **AND** activating level `6` sets the live session level and the configured level to `6`

#### Scenario: Lowering the level mid-game is refused

- **GIVEN** a playing game at level `6`
- **WHEN** a level selection for `2` arrives, from a level button or a level key
- **THEN** the session level stays `6`
- **AND** the session, phase, and settings are unchanged

#### Scenario: The plus key raises the level

- **GIVEN** a gameplay client whose configured starting level is below `9`
- **WHEN** the player presses `+` (or `=`)
- **THEN** the configured starting level increases by one
- **AND** is clamped to no more than `9`

#### Scenario: The minus key lowers the level outside a player game

- **GIVEN** a demo session, or a game-over screen, with a configured starting level above `0`
- **WHEN** the player presses `-` (or `_`)
- **THEN** the configured starting level decreases by one
- **AND** is clamped to no less than `0`

#### Scenario: Choosing a level during the demo retunes the demo

- **GIVEN** an active attract demo at level `2`
- **WHEN** the player activates the `6` level button or presses `6`
- **THEN** the demo session's `statistics.level` becomes `6`
- **AND** the configured starting level becomes `6`
- **AND** the demo keeps running at the faster schedule

#### Scenario: The chosen demo level carries into the next session

- **GIVEN** an active demo session whose level the player changed
- **WHEN** the player starts a player game, or the demo auto-restarts after its delay
- **THEN** the new session begins at the changed starting level

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

## ADDED Requirements

### Requirement: The pieces statistics popup shows the session's action and per-piece counts

The browser UI SHALL render the engine-owned action counts and the per-piece lock counts in a pieces statistics popup that opens beneath the statistics line when the player activates the Pieces drop-down toggle and closes when it is activated again; the popup SHALL be closed on first render. While the popup is open the game SHALL be paused: gravity and attract-demo advancement stop, and the paused overlay SHALL NOT be shown for a player game that the popup itself paused; closing the popup SHALL resume a game it paused and SHALL leave an already-paused game paused.

The popup SHALL show a combined move count read from `session.statistics.actions.moves` (left and right moves summed by the engine and shown without separate left/right values), a rotate count read from `session.statistics.actions.rotates`, and a drop count read from `session.statistics.actions.drops`, plus a counter for each of the 29 catalog pieces read from `session.statistics.pieceCounts`. Each per-piece counter SHALL draw a small version of the piece whose minos are 5×5 pixels with the count beside it, and the counters SHALL wrap onto as many centred rows as the popup width requires so that no counter overlaps another.

Every rendered value SHALL come from the current `PentixGameSession` snapshot — the client SHALL NOT keep its own copies of the counters — so the popup updates in every phase, including the attract demo, and a freshly started session shows zeroed values without any client-side reset step.

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

#### Scenario: Closing does not resume a manually paused game

- **GIVEN** a player game paused with the Pause control
- **WHEN** the popup is opened and then closed
- **THEN** the game stays paused

#### Scenario: Opening the popup suspends the demo

- **GIVEN** an active attract demo
- **WHEN** the popup is opened
- **THEN** demo advancement stops while it stays open
- **AND** closing the popup resumes the demo

#### Scenario: Per-piece counters use 5px minos and wrap to the popup width

- **GIVEN** the open pieces statistics popup
- **WHEN** the per-piece counters render
- **THEN** each catalog piece is drawn with 5×5-pixel minos and its count beside it
- **AND** the 29 counters wrap onto as many centred rows as fit the popup width without overlapping

#### Scenario: Player actions are reflected through the session snapshot

- **GIVEN** a playing game whose session has recorded move, rotate, and drop counts
- **WHEN** the player presses left, right, rotate, or drop
- **THEN** the popup shows the updated `moves`, `rotates`, and `drops` values returned by the engine
- **AND** the client does not increment any counter of its own

#### Scenario: The demo also shows statistics

- **GIVEN** an active demo session whose engine recorded actions
- **WHEN** the popup renders
- **THEN** it shows that demo session's move, rotate, drop, and per-piece counts
- **AND** the same counters are cleared when the demo session restarts after game over

#### Scenario: A freshly started session shows zeroed statistics

- **GIVEN** a newly started player or demo session
- **WHEN** the popup renders
- **THEN** it shows `0` moves, `0` rotates, and `0` drops
- **AND** it shows `0` for every catalog piece
### Requirement: The lifecycle spans demo, demo-over, playing, paused, and game-over

The UI SHALL present a demo state on first load, transition to playing when the player starts by creating a fresh `PentixGame` and `PentixGameSession`, support pause and resume, hold a finished attract demo in a `demo-over` state while its restart delay runs, and enter a game-over state when `session.status` becomes `'game-over'`. On game-over the UI SHALL preserve the final locked board (drawing no active, failed spawn piece) and SHALL offer both a fresh player game and re-entry to the demo.

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

#### Scenario: A finished demo holds its final board

- **GIVEN** an active demo whose next step ends its game
- **WHEN** that result is applied
- **THEN** the client enters the `demo-over` state with the finished demo's session still rendered
- **AND** no game-over overlay is presented

#### Scenario: Game over preserves the final board and offers restart or demo

- **GIVEN** a session whose `tick` result has `status` `'game-over'`
- **WHEN** the UI renders that result
- **THEN** the UI enters the game-over state with the final locked board still visible and no failed spawn piece drawn
- **AND** the UI offers a fresh player game and re-entry to the demo

## REMOVED Requirements

### Requirement: Level controls adjust the configured starting level

**Reason**: Superseded by "The level buttons select the level, start a game, or retune the demo", which now carries the `+`/`-` key bindings, the `9` default, the `0`-`9` clamp, and the level keys. Two requirements for one behaviour invited contradictory edits, because the removed one was a strict subset of the other.

**Migration**: Read the merged requirement; nothing else references the removed one.

### Requirement: The client shows a secondary statistics panel below the main statistics

**Reason**: The panel became a popup in `reorganize-ui`, so the title contradicted both its own body and the HUD requirement that forbids a second panel beneath the statistics line. The body is carried forward, together with the contents of "The client displays the engine-owned action and per-piece statistics", as "The pieces statistics popup shows the session's action and per-piece counts".

**Migration**: Use the popup requirement; it keeps every scenario of both removed requirements, with the counter sources and the pause-on-open behaviour unchanged.

### Requirement: The client displays the engine-owned action and per-piece statistics

**Reason**: Duplicated the counter sources and the "no client copies" rule already stated by the pieces statistics popup requirement, which renders those counters. Keeping both meant two places to edit for any change to the statistics contract.

**Migration**: Use "The pieces statistics popup shows the session's action and per-piece counts"; its scenarios now include the "player actions are reflected through the session snapshot", "the demo also shows statistics", and "a freshly started session shows zeroed statistics" cases.

### Requirement: The lifecycle spans ready, playing, paused, and game-over

**Reason**: There is no "ready" phase, and the demo states were missing from the title. The lifecycle now has `demo`, `demo-over`, `playing`, `paused`, and `game-over` (`apps/pentix-web/src/engine/gameReducer.ts`), so the title described a state machine that does not exist.

**Migration**: Use "The lifecycle spans demo, demo-over, playing, paused, and game-over"; its scenarios keep the demo start, the fresh-game start, pause/resume, the finished-demo hold, and the game-over preservation.


