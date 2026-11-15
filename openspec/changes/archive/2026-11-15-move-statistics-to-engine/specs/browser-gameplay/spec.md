# browser-gameplay Specification

## Purpose

Define the interactive browser gameplay client that renders the shared board, translates player input into shared `pentix-core` engine operations, runs the gravity loop, displays live score/level/lines plus an optional next-piece preview, displays the engine-owned action and per-piece statistics for every phase including the demo, and manages demo / playing / paused / game-over / restart states.

## MODIFIED Requirements

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

## ADDED Requirements

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

## REMOVED Requirements

### Requirement: The client collects action, rotate, and drop counts
**Reason**: Action counting moved into the shared `pentix-core` engine so every session, including the attract demo, records its own statistics and the browser no longer needs phase-scoped counters.
**Migration**: Read `moves`, `rotates`, and `drops` from `session.statistics.actions` instead of client state. No client-side reset is needed because a new session starts with zeroed counters.

### Requirement: The client tracks per-piece lock counts for all catalog pieces
**Reason**: Per-piece lock counts are now incremented by the engine when a piece settles, removing the fragile client-side attribution based on the `statistics.blocks` delta.
**Migration**: Read each piece's count from `session.statistics.pieceCounts`, which contains an entry for every catalog piece key.
