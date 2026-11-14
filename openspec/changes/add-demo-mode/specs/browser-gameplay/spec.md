## MODIFIED Requirements

### Requirement: The lifecycle spans demo, playing, paused, and game-over

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