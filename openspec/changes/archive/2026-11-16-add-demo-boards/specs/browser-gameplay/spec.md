## MODIFIED Requirements

### Requirement: The pieces statistics popup shows the session's action and per-piece counts

The browser UI SHALL render the engine-owned action counts and the per-piece lock counts in a pieces statistics popup that opens beneath the statistics line when the player activates the Pieces drop-down toggle and closes when it is activated again; the popup SHALL be closed on first render. While the popup is open the main board SHALL be paused: its gravity and the attract demo stop advancing, the demo boards keep advancing, and the paused overlay SHALL NOT be shown for a player game that the popup itself paused; closing the popup SHALL resume a game it paused and SHALL leave an already-paused game paused.

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

#### Scenario: Opening the popup leaves the demo boards running

- **GIVEN** an open pieces statistics popup over a running player game and two active demo boards
- **WHEN** the demo boards' gravity intervals elapse
- **THEN** each demo board applies its next step
- **AND** the main board applies no gravity tick

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

## REMOVED Requirements

### Requirement: The gameplay screen uses a single column with nothing beside the board

**Reason**: The gameplay screen now carries the two parallel demo boards in a rail beside the main column, so the space to the right of the board is no longer empty and the layout is no longer a single column.

**Migration**: Replaced by `The gameplay screen pairs the board-width main column with a demo-board rail`, which keeps every main-column placement rule and defines the rail's position and reserved capacity.

## ADDED Requirements

### Requirement: The gameplay screen pairs the board-width main column with a demo-board rail

The browser gameplay UI SHALL arrange the statistics line, the (popup) pieces statistics, the board, the on-screen gameplay buttons, the level buttons, the settings controls, and the status line in one main column whose width equals the board width, and SHALL render the demo boards in a rail to the right of that column, starting at the same top edge as the main column so the rail's first row is level with the statistics line. The rail SHALL lay the demo boards out in a grid of four slots per row and up to three rows — twelve slots — filling from its top-left corner, and SHALL reserve that space even while fewer boards are rendered, so the planned twelve-board wall needs no layout change. The on-screen gameplay buttons (`◀`, `⟳ Rotate`, `▶`, `Hard drop`, `Pause`/`Resume`, `Restart`) and the settings controls (`Rotation: clockwise|anticlockwise`, `Next piece: on|off`) SHALL be rendered beneath the board, together with the level buttons directly beneath `Hard drop`.

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

#### Scenario: The demo boards render to the right, starting level with the statistics

- **GIVEN** a viewport wider than the main column
- **WHEN** the gameplay screen renders
- **THEN** the demo boards render in a rail to the right of the main column
- **AND** the rail's top edge is level with the statistics line
- **AND** the boards fill the rail from its top-left corner
- **AND** the main column keeps the board's width and its stacked order

#### Scenario: The rail reserves room for twelve boards

- **GIVEN** the demo-board rail rendering the two current boards
- **WHEN** it lays out
- **THEN** it reserves four slots per row and three rows
- **AND** the rendered boards fill slots without reflowing or widening the main column

#### Scenario: Only the demo boards render beside the board

- **GIVEN** any gameplay phase, including demo, the demo delay, and game-over
- **WHEN** the gameplay screen renders at a viewport wider than the board column
- **THEN** no statistics, settings, or control panel occupies the space to the right of the main column
- **AND** the only content beside the main column is the demo-board rail

#### Scenario: Narrow viewports stack the rail

- **GIVEN** a viewport narrower than `760px`
- **WHEN** the gameplay screen renders
- **THEN** the demo-board rail stacks below the main column
- **AND** the main board keeps its cell size and its stored column and row count
