## ADDED Requirements

### Requirement: Demo mode runs when no game is active

The browser gameplay client SHALL start demo mode when the page first loads with no player game in progress. A demo session SHALL be a purely local, non-persisted session that does not record any session-replay actions.

#### Scenario: Page load starts the demo

- **GIVEN** a freshly loaded page with no player game in progress
- **WHEN** the client initializes
- **THEN** the client enters the demo phase
- **AND** auto-plays a local session without any player input

### Requirement: The demo imitates player actions within the shared engine

The demo SHALL compute a destination (rotation angle and column) for the active piece using the shared destination planner — a port of the Delphi `CalcDemoDest` heuristic that scores each reachable placement as `row + (holesBefore − holesAfter) × 1.5 + fullLines²` with the Delphi tie-breaks — and SHALL then steer toward that destination by rotating, then moving left or right, then hard-dropping once aligned. All demo movement, rotation, locking, and game-over detection SHALL go through the shared `GameSessionEngine`; the demo SHALL NOT re-implement those operations.

#### Scenario: The demo plans a destination for the active piece

- **GIVEN** an active demo session with a placeable active piece
- **WHEN** the demo computes the destination for that piece
- **THEN** the planner returns a rotation angle and column that are valid for the active piece
- **AND** prefers placements that are lower, that reduce the number of column holes, and that complete more full rows

#### Scenario: The demo steers and hard-drops toward the destination

- **GIVEN** an active demo session and a computed destination
- **WHEN** the demo advances
- **THEN** it rotates the piece toward the destination angle, then moves it laterally toward the destination column, then hard-drops it once aligned
- **AND** the resulting state is produced by the shared `GameSessionEngine`

### Requirement: The demo restarts automatically on game over

When a demo session's `status` becomes `'game-over'`, the client SHALL immediately start a fresh demo session, clearing the board and resuming auto-play, so the demo loops continuously while no player game is active.

#### Scenario: A demo game over starts the next demo

- **GIVEN** a demo session whose next tick or drop produces `status` `'game-over'`
- **WHEN** that result is applied
- **THEN** the client starts a fresh demo session
- **AND** auto-play resumes without player input

### Requirement: Starting a player game exits the demo

From the demo phase, a start input SHALL create a fresh `PentixGame` and `PentixGameSession` at the configured starting level and transition the client into the playing phase.

#### Scenario: The player starts during the demo

- **GIVEN** the client is in the demo phase
- **WHEN** the player triggers a start input (Enter or Space)
- **THEN** the client creates a fresh player session at the configured starting level
- **AND** enters the playing phase

### Requirement: Space re-enters the demo after a player game over

After a player game over, the final board SHALL remain visible, and pressing Space SHALL start the demo, clearing the board and auto-playing, without immediately starting a player game.

#### Scenario: Space starts the demo after game over

- **GIVEN** a player session in the game-over phase with its final board visible
- **WHEN** the player presses Space
- **THEN** the client starts a fresh demo session
- **AND** auto-plays while the player's final board is replaced by the demo board