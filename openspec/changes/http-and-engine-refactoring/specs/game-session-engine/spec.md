## ADDED Requirements

### Requirement: Gameplay operations are exposed on a single GameSessionEngine
The shared `pentix-core` package SHALL expose a `GameSessionEngine` that groups the active-piece gameplay operations. Its instances SHALL provide the operations as methods named `move`, `rotate`, `tick`, and `drop`. `move` and `rotate` SHALL accept a `PentixGameSession` plus a direction and return a `PentixGameSession`; `tick` and `drop` SHALL accept a `PentixGameSession`, a `PentixGame`, and (for `tick`) an optional piece selector, and return an `AdvancePentixGameSessionResult`.

#### Scenario: A consumer runs all active-piece operations through one engine
- **GIVEN** a session and its game
- **WHEN** a consumer calls `engine.move(...)`, `engine.rotate(...)`, `engine.tick(...)`, and `engine.drop(...)` on a single `GameSessionEngine`
- **THEN** move and rotate return a `PentixGameSession`
- **AND** tick and drop return an `AdvancePentixGameSessionResult`
- **AND** the gameplay, scoring, and `game-over` rules described by the `gameplay-mechanics` capability are preserved

### Requirement: Engine operations are stateless
The `GameSessionEngine` SHALL expose pure operations that do not mutate their inputs; each operation SHALL return new session and game values rather than modifying the ones passed in.

#### Scenario: A successful operation leaves the input session unchanged
- **GIVEN** an active session whose active piece can move
- **WHEN** a consumer calls `engine.move(session, direction)`
- **THEN** the returned session is a different value from the input session
- **AND** the input session is unchanged
