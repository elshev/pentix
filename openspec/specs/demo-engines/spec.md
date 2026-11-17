# demo-engines Specification

## Purpose

Define the demo-engine contract in `pentix-core`, the registry that resolves engines by id, and the built-in `delphi5` and `random` planners the browser's attract demo selects between.
## Requirements
### Requirement: The shared core exposes a demo-engine contract

`pentix-core` SHALL define a demo engine as a named planning strategy with a stable `id`, a human-readable `name`, a non-empty one-sentence `description`, and exactly one operation, `plan(board, piece, position)`, returning a `DemoActionLog` for the active piece. `board` SHALL be the visible board as rows of `0` (free) and `1` (occupied); `piece` SHALL be the active piece's reachable orientations, each a list of cells relative to the rotation point (current orientation first, each `C` selecting the next); `position` SHALL be the rotation point on the board. A `DemoActionLog` SHALL be a string of demo action codes from the shared alphabet: `L` (move left), `R` (move right), `C` (rotate clockwise), `A` (rotate anticlockwise), and `H` (hard drop). The log SHALL NOT contain `T` (tick): ticks belong to the demo driver, which applies Action then Tick. The alphabet SHALL be the session action vocabulary without `T`, defined once in the shared core rather than declared again. An empty log SHALL mean the engine has no actions for that piece. An engine SHALL plan only: it SHALL NOT mutate the board, piece, or position, advance gravity, move or rotate the active piece itself, lock a piece, score, or detect game over, and the three inputs SHALL be unchanged when the call returns.

#### Scenario: An engine plans an action log for the active piece

- **GIVEN** a registered engine, a board, the active piece's orientations, and its rotation point, with a reachable placement
- **WHEN** the demo calls the engine's `plan` with those three values
- **THEN** it returns a string made only of `L`, `R`, `C`, `A`, and `H`
- **AND** the three inputs are unchanged

#### Scenario: An engine with nothing to plan returns an empty log

- **GIVEN** a registered engine and a board on which the active piece has no reachable placement, or a strategy with no action for this piece
- **WHEN** the demo calls the engine's `plan`
- **THEN** it returns an empty string
- **AND** the demo lets the piece fall under gravity

#### Scenario: Ticks never appear in an engine log

- **GIVEN** any registered engine and any valid board, piece, and position
- **WHEN** the engine's `plan` returns
- **THEN** the returned log contains no `T`
- **AND** the driver, not the engine, advances gravity

#### Scenario: An engine identifies itself

- **GIVEN** a registered engine
- **WHEN** a consumer reads the engine
- **THEN** it exposes a stable `id`, a display `name`, and a non-empty `description`
- **AND** `plan(board, piece, position)` is the only operation it exposes for requesting actions

### Requirement: A demo engine registry resolves engines by id

`pentix-core` SHALL provide a demo engine registry that registers engines under their `id`, resolves a registered engine by id, lists the registered engines in registration order, and summarizes them as `{ id, name, description }` for consumers that render engines but never plan with them. Registration SHALL reject an engine whose `id` is not a non-empty lowercase kebab-case token, whose `name` is empty, whose `description` is empty, or whose `plan` is not a function, and every rejection SHALL raise an error that names the engine or the offending member. The registry SHALL reject a duplicate id and SHALL reject an unknown id with an error that names the id. The engine contract, the action alphabet, the registry, the default engine id, and every built-in engine SHALL be exported from the `pentix-core` public API. The default engine id SHALL be `delphi5`.

#### Scenario: A registered engine is resolved by id

- **GIVEN** the registry contains an engine with id `delphi5`
- **WHEN** the client resolves `delphi5`
- **THEN** it receives the `delphi5` engine
- **AND** that engine exposes the display name `Delphi 5`

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

#### Scenario: An engine without the required shape is rejected

- **GIVEN** a candidate engine whose id is not lowercase kebab-case, or whose name is empty, or whose description is empty, or whose `plan` is not a function
- **WHEN** the client registers that candidate
- **THEN** the registry raises an error naming the candidate or the offending member
- **AND** the registry keeps the engines it already accepted

#### Scenario: The registered engines can be listed

- **GIVEN** the registry has loaded its built-in engines
- **WHEN** the client lists the registered engines
- **THEN** the list contains `delphi5` and `random`
- **AND** the list preserves registration order

#### Scenario: The registered engines can be summarized for the UI

- **GIVEN** the registry has loaded its built-in engines
- **WHEN** the client asks for engine summaries
- **THEN** it receives one `{ id, name, description }` entry per registered engine, in registration order
- **AND** every entry has a non-empty `description`
- **AND** a summary exposes no planner

#### Scenario: The default engine is the classic heuristic

- **WHEN** the client resolves the default demo engine
- **THEN** it receives the engine with id `delphi5`

### Requirement: The `delphi5` engine preserves the classic heuristic

`pentix-core` SHALL register the existing Delphi `CalcDemoDest` planner as the demo engine with id `delphi5`, display name `Delphi 5`, and a non-empty description. Its `plan` operation SHALL return the action log that steers the piece to the destination the ported `CalcDemoDest` heuristic chooses for the same board, reachable orientations, and rotation point: rotations that reach the chosen orientation, lateral moves that reach the destination column, then `H`. When the heuristic finds no placement, its `plan` SHALL return an empty log.

#### Scenario: The engine steers toward the classic destination

- **GIVEN** a board with a placeable piece and a destination chosen by the classic heuristic
- **WHEN** the `delphi5` engine plans
- **THEN** its log's rotations and moves target that destination's orientation and column
- **AND** the log ends with `H`
- **AND** the log contains no `T`

#### Scenario: The engine plans nothing when the classic planner finds no placement

- **GIVEN** a board on which the piece cannot be placed anywhere
- **WHEN** the `delphi5` engine plans
- **THEN** it returns an empty log

### Requirement: The temporary `random` engine plans random reachable destinations

`pentix-core` SHALL register a demonstration engine with id `random`, display name `Random`, and a non-empty description. Its `plan` operation SHALL choose uniformly at random one rotation and origin column pair at which the piece can be placed and dropped from above the board, and SHALL return the action log that steers the piece there: rotations to the chosen angle, lateral moves to the chosen column, then `H`. It SHALL return an empty log when no such pair exists. The engine SHALL be removable on its own: deleting its module and its catalog entry SHALL leave the contract, the alphabet, the registry, the toolkit, and the remaining engines working.

#### Scenario: The random engine returns a log for a reachable destination

- **GIVEN** a board on which the piece can be dropped in several rotation and column pairs
- **WHEN** the `random` engine plans
- **THEN** the returned log targets one of those reachable pairs
- **AND** it contains only `L`, `R`, `C`, `A`, and `H`

#### Scenario: The random engine's choice follows its random source

- **GIVEN** a session with more than one reachable angle and column pair
- **WHEN** the `random` engine plans with `Math.random` returning `0` and then a value close to `1`
- **THEN** the two logs target different reachable pairs

#### Scenario: The random engine plans nothing when blocked

- **GIVEN** a board on which the piece cannot be placed anywhere
- **WHEN** the `random` engine plans
- **THEN** it returns an empty log

### Requirement: Every demo engine is one module with the same four exports

Every demo engine SHALL live in its own TypeScript module under `packages/pentix-core/src/demo-engines/`, named `<engine-id>-demo-engine.ts`, and that module SHALL export exactly the engine's `id`, `name`, `description`, and `plan` function, typed by the demo-engine contract, so every engine accepts the same three parameters (`board`, `piece`, `position`) and returns the same result type (`DemoActionLog`). The repository SHALL supply each engine's `id`, `name`, and `description`; the standalone authoring brief SHALL ask only for the `plan` function. The catalog module `demo-engines/index.ts` SHALL import the engine modules, register them in a documented order, and be the only place a new engine has to be added. The built-in engines SHALL follow the same convention as authored engines; no engine SHALL be defined as an object literal inside the registry, the browser client, or the documentation. An engine module SHALL be a pure planner: no session mutation, no I/O, no timers, no DOM or Node.js APIs, no ticks in its output, and no imports outside the demo-engine contract and the demo-engine toolkit.

#### Scenario: A new engine module needs no registry or UI change

- **GIVEN** a new engine module `packages/pentix-core/src/demo-engines/<engine-id>-demo-engine.ts` that exports `id`, `name`, `description`, and `plan`
- **WHEN** the catalog registers that module
- **THEN** the registry resolves the engine by its `id`
- **AND** the board assigned to it asks `plan(board, piece, position)` for its action log
- **AND** no registry code and no browser-client code needed a new case for that engine

#### Scenario: Every engine has the same signature and result type

- **GIVEN** two registered engines with different strategies
- **WHEN** the demo calls each engine's `plan` with the same board, piece, and position
- **THEN** both accept those three arguments
- **AND** both return a `DemoActionLog`
- **AND** neither requires a session, a request discriminator, a second method, or a callback

#### Scenario: Engine modules follow the file naming convention

- **GIVEN** the demo-engine folder
- **WHEN** its modules are listed
- **THEN** each engine module is named `<engine-id>-demo-engine.ts`
- **AND** the built-in modules are `delphi5-demo-engine.ts` and `random-demo-engine.ts`

#### Scenario: The built-in engines follow the module convention

- **GIVEN** the built-in `delphi5` and `random` engines
- **WHEN** their modules are inspected
- **THEN** each exports `id`, `name`, `description`, and `plan`
- **AND** each `description` is non-empty
- **AND** each `plan` returns only `L`, `R`, `C`, `A`, and `H` characters

#### Scenario: An incomplete engine module is rejected

- **GIVEN** a module that does not provide one of the four required exports
- **WHEN** the catalog attempts to register it
- **THEN** registration fails with an error naming the missing member
- **AND** the already-registered engines stay resolvable

