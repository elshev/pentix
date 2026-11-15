## ADDED Requirements

### Requirement: The demo follows manual level changes

When the player increases or decreases the game level during the demo, the running demo session SHALL adopt the new level immediately — changing its gravity speed at once — and the new level SHALL become the starting level for the next session.

#### Scenario: Raising the level speeds up the running demo

- **GIVEN** an active demo session and a configured starting level below `9`
- **WHEN** the player increases the level during the demo
- **THEN** the running demo session's level matches the new level
- **AND** the demo's gravity interval shortens immediately

#### Scenario: Lowering the level slows down the running demo

- **GIVEN** an active demo session and a configured starting level above `0`
- **WHEN** the player decreases the level during the demo
- **THEN** the running demo session's level matches the new level
- **AND** the demo's gravity interval lengthens immediately

#### Scenario: The changed level carries into the next session

- **GIVEN** an active demo session whose level the player changed
- **WHEN** the player starts a player game, or the demo auto-restarts on game over
- **THEN** the new session begins at the changed starting level