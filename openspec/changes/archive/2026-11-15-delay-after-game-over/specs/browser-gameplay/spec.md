## ADDED Requirements

### Requirement: Game-over actions wait for a short cooldown

After a player game reaches game-over, the browser gameplay UI SHALL immediately render the game-over overlay and keep the final locked board visible, but SHALL ignore requests to start a new player game (`start`/`restart`) or to enter the demo until a fixed cooldown of at most one second (`700` ms) has elapsed. The cooldown SHALL be enforced wherever the client leaves the game-over phase, so keyboard hotkeys and on-screen buttons are blocked equally. The "Play again" and "Demo" buttons SHALL render disabled while the cooldown runs and SHALL enable once it elapses. The cooldown SHALL NOT apply to the attract demo's automatic restart.

#### Scenario: Stray input right after game over is ignored

- **GIVEN** a player session that just reached game-over and whose cooldown has not yet elapsed
- **WHEN** the player presses `Enter`, presses `Space`, or activates the Restart control
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

#### Scenario: The demo still restarts without delay

- **GIVEN** an active demo session whose next tick or drop produces `status` `'game-over'`
- **WHEN** that result is applied
- **THEN** the client starts a fresh demo session immediately
- **AND** no game-over overlay or cooldown is presented
