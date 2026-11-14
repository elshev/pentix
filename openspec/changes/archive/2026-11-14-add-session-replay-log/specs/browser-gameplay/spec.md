## MODIFIED Requirements

### Requirement: Player controls map to shared engine operations

The browser gameplay UI SHALL translate player input into the shared `GameSessionEngine` operations — `move`, `rotate`, and `drop` (hard drop). Manual soft drop is removed from the game process. Keyboard keys and on-screen buttons SHALL trigger the same operations, and the UI SHALL record each player action (`L`, `R`, `C`, `A`, or `H`) into the session action log defined by `session-replay`.

#### Scenario: Move controls shift the active piece

- **GIVEN** an active session
- **WHEN** the player presses left/right or taps the corresponding on-screen button
- **THEN** the UI invokes `engine.move` with `'left'` or `'right'`
- **AND** records the corresponding `L` or `R` action
- **AND** the returned session is rendered

#### Scenario: Rotate controls rotate the active piece

- **GIVEN** an active session
- **WHEN** the player presses the rotate key or taps the rotate button
- **THEN** the UI invokes `engine.rotate` with the mapped direction
- **AND** records the corresponding `C` or `A` action
- **AND** the returned session is rendered

#### Scenario: Hard drop drops the active piece

- **GIVEN** an active session
- **WHEN** the player triggers hard drop
- **THEN** the UI invokes `engine.drop`
- **AND** records an `H` action
- **AND** the returned session is rendered