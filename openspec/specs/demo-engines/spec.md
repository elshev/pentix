# demo-engines Specification

## Purpose

Define the demo-engine contract in `pentix-core`, the registry that resolves engines by id, and the built-in `delphi5` and `random` planners the browser's attract demo selects between.

## Requirements
### Requirement: The shared core exposes a demo-engine contract

`pentix-core` SHALL define a demo engine as a named planning strategy with a stable `id`, a human-readable `name`, and two operations: `planDestination(session)` returning a `DemoDestination` or `null`, and `planLastTickMove(session)` returning a `DemoDestination` or `null`, where `null` means the engine declines a side-step and the piece locks normally. An engine SHALL plan only: it SHALL NOT mutate the session, advance gravity, move or rotate the active piece, lock a piece, score, or detect game over.

#### Scenario: An engine plans a destination for an active session

- **GIVEN** a registered engine and an active session whose piece has a reachable placement
- **WHEN** the engine's `planDestination` operation is called
- **THEN** it returns a rotation angle and column
- **AND** the session it was given is unchanged

#### Scenario: An engine reports that no placement exists

- **GIVEN** a registered engine and a session whose active piece has no reachable placement
- **WHEN** the engine's `planDestination` operation is called
- **THEN** it returns `null`

#### Scenario: An engine may decline a last-tick move

- **GIVEN** a registered engine and a resting active piece
- **WHEN** the engine's `planLastTickMove` operation is called
- **THEN** it returns a destination or `null`
- **AND** `null` leaves the piece to lock on that tick

### Requirement: A demo engine registry resolves engines by id

`pentix-core` SHALL provide a demo engine registry that registers engines under their `id`, resolves a registered engine by id, and lists the registered engines in registration order. The registry SHALL reject a duplicate id and SHALL reject an unknown id with an error that names the id. The engine contract, the registry, the default engine id, and every built-in engine SHALL be exported from the `pentix-core` public API. The default engine id SHALL be `delphi5`.

#### Scenario: A registered engine is resolved by id

- **GIVEN** the registry contains an engine with id `delphi5`
- **WHEN** the client resolves `delphi5`
- **THEN** it receives the `Delphi5` engine

#### Scenario: An unknown id is rejected

- **GIVEN** no engine is registered under the id `missing`
- **WHEN** the client resolves `missing`
- **THEN** the registry raises an error that names `missing`
- **AND** the client does not fall back to another engine

#### Scenario: A duplicate id is rejected

- **GIVEN** an engine is already registered under an id
- **WHEN** another engine with the same id is registered
- **THEN** the registry raises an error
- **AND** the previously registered engine remains the one resolved for that id

#### Scenario: The registered engines can be listed

- **GIVEN** the registry has loaded its built-in engines
- **WHEN** the client lists the registered engines
- **THEN** the list contains `delphi5` and `random`

#### Scenario: The default engine is the classic heuristic

- **WHEN** the client resolves the default demo engine
- **THEN** it receives the engine with id `delphi5`

### Requirement: The `delphi5` engine preserves the classic heuristic

`pentix-core` SHALL register the existing Delphi `CalcDemoDest` planner as the demo engine with id `delphi5` and display name `Delphi 5`. Its `planDestination` and `planLastTickMove` operations SHALL return exactly the destinations that the existing `planDemoDestination` and `planDemoLastTickMove` functions return for the same session.

#### Scenario: The engine matches the classic destination planner

- **GIVEN** a session with a placeable active piece
- **WHEN** the `delphi5` engine plans a destination
- **THEN** the result equals `planDemoDestination` for that session

#### Scenario: The engine matches the classic last-tick planner

- **GIVEN** a session whose piece is resting with a better side-step available
- **WHEN** the `delphi5` engine plans a last-tick move
- **THEN** the result equals `planDemoLastTickMove` for that session

### Requirement: The temporary `random` engine plans random reachable destinations

`pentix-core` SHALL register a temporary demonstration engine with id `random` and display name `Random`. Its `planDestination` operation SHALL choose uniformly at random one rotation-angle and column pair at which the active piece can be placed and dropped from above the board, and SHALL return `null` when no such pair exists. Its `planLastTickMove` operation SHALL always return `null`, so the demo never side-steps while this engine is selected. The engine SHALL be removable on its own: deleting it and its registry entry SHALL leave the contract, the registry, and the remaining engines working.

#### Scenario: The random engine returns a reachable destination

- **GIVEN** a session whose active piece can be dropped in several rotation-angle and column pairs
- **WHEN** the `random` engine plans a destination
- **THEN** the returned angle and column are one of those reachable pairs

#### Scenario: The random engine's choice follows its random source

- **GIVEN** a session with more than one reachable angle and column pair
- **WHEN** the `random` engine plans a destination with `Math.random` returning `0` and then a value close to `1`
- **THEN** the two plans select different reachable pairs

#### Scenario: The random engine reports no destination when blocked

- **GIVEN** a session whose active piece cannot be placed anywhere
- **WHEN** the `random` engine plans a destination
- **THEN** it returns `null`

#### Scenario: The random engine never side-steps

- **GIVEN** a session whose active piece can no longer move down
- **WHEN** the `random` engine plans a last-tick move
- **THEN** it returns `null`

