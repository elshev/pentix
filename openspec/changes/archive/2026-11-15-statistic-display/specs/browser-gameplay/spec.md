# browser-gameplay Specification

## Purpose

Define the interactive browser gameplay client that renders the shared board, translates player input into shared `pentix-core` engine operations, runs the gravity loop, shows a one-line MainStatistics panel (next piece plus score/level/lines/pieces), collects per-piece and action statistics, and shows a collapsible secondary statistics panel on game-over.

## MODIFIED Requirements

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

## ADDED Requirements

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