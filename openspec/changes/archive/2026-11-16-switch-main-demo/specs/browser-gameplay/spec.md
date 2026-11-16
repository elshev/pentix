## MODIFIED Requirements

### Requirement: The HUD shows live statistics and an optional next piece

The UI SHALL present an untitled statistics panel above the board that displays the session's score, cleared lines, and locked-piece count (presented as "Pieces" and read from `session.statistics.blocks`) on a single horizontal line, updating after every state change. Above that statistics line the panel SHALL render one name line naming the current occupant of the main board: `Player01` while a player game is in progress (`playing`, `paused`, or `game-over`) and the display name of the demo engine currently assigned to the main board (`Random` for `random`, `Delphi 5` for `delphi5`) while the main board runs its attract demo (`demo` or `demo-over`), including during the post-game-over demo delay. The name line SHALL be read from the same game state as the phase and the session and SHALL NOT be editable. The panel SHALL NOT render a "MainStatistics" title or any other panel heading, and SHALL NOT render a level line, level value, or secondary statistics panel beneath it. The locked-piece counter SHALL be a drop-down toggle that opens the pieces statistics popup described below. When the next-piece preview setting is enabled, the next piece SHALL be shown in the statistics line as the leftmost item, and SHALL render inside a fixed-size frame so its dimensions do not change between pieces and never resize the panel. The preview minos SHALL scale with the board minos by the same 20%. The preview SHALL be disabled on first load (the default is off) and SHALL be toggleable by the player at any phase.

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

#### Scenario: The main board names the player

- **GIVEN** a page whose main board runs a player game with no name entry in progress
- **WHEN** the gameplay screen renders in the `playing`, `paused`, or `game-over` phase
- **THEN** the name line above the statistics reads `Player01`

#### Scenario: The main board names the demo engine

- **GIVEN** a main board whose attract demo is planned by the `random` engine
- **WHEN** the gameplay screen renders in the `demo` or `demo-over` phase
- **THEN** the name line above the statistics reads `Random`

#### Scenario: The name follows a swapped demo board

- **GIVEN** an attract demo on the main board planned by `random`
- **WHEN** the player double-clicks a demo board playing `delphi5`
- **THEN** the name line above the statistics reads `Delphi 5`
- **AND** the demo-board slot that received the previous main session names `Random`

#### Scenario: The name returns to the player after the demo

- **GIVEN** an attract demo whose name line reads `Random`
- **WHEN** the player starts a game
- **THEN** the name line reads `Player01`

## ADDED Requirements

### Requirement: The gameplay area aligns with the PENTIX header

The browser gameplay UI SHALL place the gameplay area so that its left edge sits exactly `4` px to the left of the PENTIX header's left edge and its right edge exactly `4` px to the right of the header's right edge. The main column — the statistics panel, the board, and the controls beneath it — SHALL start at that left edge, so the board sits as far left as the header allows, and the demo-board rail SHALL fill the remaining width up to that right edge. Where the viewport leaves no room for the overhang, it SHALL be clipped rather than scrolled, so the page never gains a horizontal scrollbar. At the stacking breakpoint the rail SHALL move beneath the main column while the same left and right boundaries apply.

#### Scenario: The board starts 4px left of the header

- **GIVEN** a viewport wide enough for the shell to stay narrower than the screen
- **WHEN** the gameplay screen renders
- **THEN** the main column's left edge is `4` px left of the PENTIX header's left edge
- **AND** the board's left edge equals the main column's left edge

#### Scenario: The rail may reach 4px past the header

- **GIVEN** the gameplay screen
- **WHEN** the demo-board rail is measured
- **THEN** the gameplay area's right edge is `4` px right of the header's right edge
- **AND** the rail occupies the width between the main column and that right edge

#### Scenario: A narrow viewport does not scroll sideways

- **GIVEN** a viewport `800` px wide whose shell nearly fills the screen
- **WHEN** the gameplay screen renders
- **THEN** the document's scroll width equals its client width
- **AND** the main column keeps the same `4` px overhang, clipped where the viewport ends

#### Scenario: The stacked layout keeps the boundaries

- **GIVEN** a viewport at or below the stacking breakpoint
- **WHEN** the gameplay screen renders
- **THEN** the rail renders beneath the main column
- **AND** the gameplay area keeps the same `4` px overhang on both sides
