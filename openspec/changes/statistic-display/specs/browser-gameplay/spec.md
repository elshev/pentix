# browser-gameplay Specification

## Purpose

Define the interactive browser gameplay client that renders the shared board, translates player input into shared `pentix-core` engine operations, runs the gravity loop, displays live score/level/lines/pieces on a single line plus an optional next-piece preview, collects per-piece and action statistics, surfaces a collapsible per-piece panel, and shows a last-game statistics recap on game-over.

## MODIFIED Requirements

### Requirement: The HUD shows live statistics and an optional next piece

The UI SHALL display the session's score, level, cleared lines, and locked-piece count from the session snapshot, updating after every state change. The four statistics SHALL be rendered on a single horizontal line, with the locked-piece count presented as "Pieces" and read from `session.statistics.blocks`. The UI SHALL also provide a next-piece preview that renders the piece for `session.nextPieceKey` from the shared catalog; the preview SHALL be disabled on first load (the default is off) and SHALL be toggleable by the player at any phase.

#### Scenario: The HUD reflects the session snapshot

- **GIVEN** a session with known statistics and a `nextPieceKey`
- **WHEN** the game renders for the first time
- **THEN** the HUD shows `score`, `level`, `clearedLines`, and the locked-piece count ("Pieces") on a single line
- **AND** the next-piece preview is not rendered while the preview setting is off

#### Scenario: The player enables the next-piece preview

- **GIVEN** a session whose next-piece preview is disabled
- **WHEN** the player toggles the preview on
- **THEN** the HUD renders the piece for `session.nextPieceKey` from the shared catalog

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

### Requirement: The game-over overlay shows last-game statistics

On game-over, the game-over overlay SHALL show a "Last game statistics" section containing the final score, level, lines, and pieces, the collected action/rotate/drop counts, and a collapsible per-piece panel listing all 29 catalog pieces in a compact layout.

#### Scenario: The overlay summarizes the finished game

- **GIVEN** a game that reached game-over
- **WHEN** the overlay renders
- **THEN** it shows the final score, level, lines, and pieces
- **AND** it shows the collected action, rotate, and drop counts

#### Scenario: The per-piece panel is collapsible and compact

- **GIVEN** the game-over overlay
- **WHEN** the player toggles the per-piece panel
- **THEN** the panel expands or collapses
- **AND** when expanded it presents the 29 piece counts in a compact layout