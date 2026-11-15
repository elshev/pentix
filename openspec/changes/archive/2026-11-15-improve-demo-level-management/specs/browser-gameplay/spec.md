## ADDED Requirements

### Requirement: Level controls adjust the configured starting level

The browser gameplay UI SHALL provide level controls that increase and decrease the configured starting level, clamped to the inclusive range `0` to `9`, and SHALL default the starting level to `9` on first load.

#### Scenario: The starting level defaults to nine

- **GIVEN** a freshly initialized gameplay client
- **WHEN** the client reads its default settings
- **THEN** the configured starting level is `9`

#### Scenario: The plus key raises the starting level

- **GIVEN** an initialized gameplay client with a starting level below `9`
- **WHEN** the player presses `+` (or `=`)
- **THEN** the configured starting level increases by one
- **AND** is clamped to no more than `9`

#### Scenario: The minus key lowers the starting level

- **GIVEN** an initialized gameplay client with a starting level above `0`
- **WHEN** the player presses `-` (or `_`)
- **THEN** the configured starting level decreases by one
- **AND** is clamped to no less than `0`

## MODIFIED Requirements

### Requirement: Gravity advances the active piece on a level-based schedule

During active play, the UI SHALL invoke `engine.tick` on an interval that matches the Delphi schedule `1000 − 100 × level` milliseconds — `1000` ms at level `0` down to `100` ms at level `9` — so the duration decreases as the session's level increases. The loop SHALL stop while paused or game-over.

#### Scenario: A tick advances the active piece

- **GIVEN** a playing session
- **WHEN** the gravity interval elapses
- **THEN** the UI invokes `engine.tick` and renders the returned `{ game, session }`

#### Scenario: Higher levels tick faster

- **GIVEN** a session at a higher level than another
- **WHEN** the gravity intervals for both levels are compared
- **THEN** the higher-level interval is shorter than the lower-level interval
- **AND** the interval is `1000` ms at level `0`, `500` ms at level `5`, and `100` ms at level `9`

#### Scenario: No ticks while paused or game-over

- **GIVEN** a paused or game-over session
- **WHEN** time elapses
- **THEN** no tick is dispatched