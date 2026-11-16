## MODIFIED Requirements

### Requirement: The demo imitates player actions within the shared engine

The demo SHALL plan the active piece's destination (rotation angle and column) with the demo engine selected from the shared demo engine registry, and SHALL use that same engine's last-tick operation to decide whether a resting piece side-steps instead of locking. The client SHALL select the registry's default engine (`delphi5`) and SHALL NOT override it with a hardcoded engine id. The destination SHALL be planned once per spawned piece and reused across steering steps, and SHALL additionally be re-targeted when the selected engine returns a last-tick side-step. The demo SHALL then steer toward that destination by rotating, then moving left or right, then hard-dropping once aligned. All demo movement, rotation, locking, and game-over detection SHALL go through the shared `GameSessionEngine`; the demo SHALL NOT re-implement those operations.

#### Scenario: The demo plans with the selected engine

- **GIVEN** an active demo session and a demo engine selected from the registry
- **WHEN** the demo plans a destination for the active piece
- **THEN** it calls that engine's destination operation
- **AND** it does not consult another engine's planner for that piece

#### Scenario: The client uses the registry default engine

- **GIVEN** a freshly started attract demo
- **WHEN** the client selects the engine that plans its destinations
- **THEN** it resolves the registry's default engine, whose id is `delphi5`
- **AND** it does not select `random` or any other registered engine by a hardcoded id

#### Scenario: The demo plans a destination for the active piece

- **GIVEN** an active demo session with a placeable active piece and the `delphi5` engine selected
- **WHEN** the demo computes the destination for that piece
- **THEN** the planner returns a rotation angle and column that are valid for the active piece
- **AND** prefers placements that are lower, that reduce the number of column holes, and that complete more full rows
- **AND** among placements with equal score, prefers a lower bottom, then a lower top, then more orthogonal contacts with settled minos or the board walls, then a placement that does not touch a side wall, with remaining ties chosen randomly

#### Scenario: The destination is held for the whole piece

- **GIVEN** an active demo session and a planned destination
- **WHEN** the demo steers the same piece over several ticks
- **THEN** the target angle and column stay the same until a last-tick side-step re-targets them or a new piece spawns

#### Scenario: The demo steers and hard-drops toward the destination

- **GIVEN** an active demo session and a computed destination
- **WHEN** the demo advances
- **THEN** it rotates the piece toward the destination angle, then moves it laterally toward the destination column, then hard-drops it once aligned
- **AND** the first step toward a re-targeted destination is the single side-step
- **AND** the resulting state is produced by the shared `GameSessionEngine`

#### Scenario: An engine that declines a last-tick move lets the piece lock

- **GIVEN** an active demo session whose selected engine returns `null` from its last-tick operation
- **WHEN** the active piece can no longer move down
- **THEN** the demo locks the piece through the shared `GameSessionEngine`
- **AND** it does not move the piece sideways

## REMOVED Requirements

### Requirement: The demo restarts automatically on game over

**Reason**: Stale. The client no longer starts the next demo immediately: a finished demo enters the `demo-over` phase and starts a fresh session only after `GAME_OVER_COOLDOWN_MS` (`700` ms), which the `browser-gameplay` requirement "The attract demo restarts after the game-over delay" and the game-over cooldown requirement already define in full.

**Migration**: Use the `browser-gameplay` "The attract demo restarts after the game-over delay" requirement for the timing and the screen behaviour; this capability's purpose and its "Demo mode runs when no game is active" requirement still describe the continuous demo loop.

### Requirement: The demo follows manual level changes

**Reason**: Duplicated the level-selection behaviour owned by `browser-gameplay` ("The level buttons select the level, start a game, or retune the demo"), which states the demo retune, the configured starting level, and the raise-only rule for a player game in one place. This version also described the player "increasing or decreasing" the level, which no longer matches the level buttons and the `+`/`-` steps.

**Migration**: Use the `browser-gameplay` level-selection requirement: its "Choosing a level during the demo retunes the demo", "The chosen demo level carries into the next session", and "The demo delay ignores the level of the finished session" scenarios cover the removed ones.
