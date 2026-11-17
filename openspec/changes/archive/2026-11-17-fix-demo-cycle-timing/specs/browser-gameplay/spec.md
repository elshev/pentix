## MODIFIED Requirements

### Requirement: The attract demo restarts after the game-over delay

When the main board's demo session reaches `status` `'game-over'`, the browser UI SHALL keep that demo's final board visible, SHALL stop advancing it, SHALL NOT present the player-facing game-over overlay, and SHALL hold it until every demo board's session has also reached `'game-over'` or a swap brings an `active` session to the main board. Once the whole board set is over, the UI SHALL keep the finished boards visible for the same game-over delay (`GAME_OVER_COOLDOWN_MS`, `700` ms) used after a player game, measured from the last board's end, SHALL stop advancing the demo during that delay, and SHALL then start a fresh demo cycle — a fresh main demo session and a fresh session for every demo board, all from one new `PentixGame` — without any player action. The finished demo SHALL also accept a manual restart: pressing Space while the main board holds a finished demo SHALL start that fresh demo cycle at once, without waiting for the other boards or the delay, while Enter SHALL still start a player game. Every demo restart SHALL use the currently configured starting level, and the main board SHALL keep the demo engine it was playing.

#### Scenario: The demo pauses on its final board

- **GIVEN** an active demo whose next step ends the demo game
- **WHEN** that result is applied
- **THEN** no fresh demo session is created yet
- **AND** the demo's final board and statistics stay rendered
- **AND** no game-over overlay appears

#### Scenario: The finished demo waits while another board still plays

- **GIVEN** a main demo that has reached its final board and a demo board whose session is still `active`
- **WHEN** the `700` ms delay elapses
- **THEN** no fresh demo session is created
- **AND** the main board keeps the finished demo's session and id
- **AND** the demo board keeps playing

#### Scenario: A fresh cycle starts after the last board ends

- **GIVEN** a board set whose main demo and every demo board have reached their final boards
- **WHEN** the `700` ms delay measured from the last board's end elapses
- **THEN** a fresh demo session starts on the main board with `status` `active`
- **AND** every demo board starts a fresh session too
- **AND** every new session id differs from the session it replaced
- **AND** they use the currently configured starting level

#### Scenario: Space starts the next demo at once

- **GIVEN** a finished main demo while a demo board still plays
- **WHEN** the player presses Space
- **THEN** a fresh demo cycle starts immediately, without waiting for that board or the delay
- **AND** the client stays in the demo phase
- **AND** Enter still starts a player game from the finished demo

#### Scenario: The demo delay ignores the level of the finished session

- **GIVEN** a finished demo at level `8` and a configured starting level of `3`
- **WHEN** the delay elapses
- **THEN** the new demo session starts at level `3`

### Requirement: The lifecycle spans demo, demo-over, playing, paused, and game-over

The UI SHALL present a demo state on first load, transition to playing when the player starts by creating a fresh `PentixGame` and `PentixGameSession`, support pause and resume, hold a finished attract demo in a `demo-over` state until the whole board set has finished and its restart delay has run, and enter a game-over state when `session.status` becomes `'game-over'`. On game-over the UI SHALL preserve the final locked board (drawing no active, failed spawn piece) and SHALL offer both a fresh player game and re-entry to the demo.

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
- **AND** the state lasts until every demo board has ended and the restart delay has run, or the player asks for the next demo

#### Scenario: Game over preserves the final board and offers restart or demo

- **GIVEN** a session whose `tick` result has `status` `'game-over'`
- **WHEN** the UI renders that result
- **THEN** the UI enters the game-over state with the final locked board still visible and no failed spawn piece drawn
- **AND** the UI offers a fresh player game and re-entry to the demo
