# demo-engines Specification

## Purpose

Define the demo-engine contract in `pentix-core`, the registry that resolves engines by id, and the built-in `delphi5` and `random` planners the browser's attract demo selects between.
## Requirements
### Requirement: The shared core exposes a demo-engine contract

`pentix-core` SHALL define a demo engine as a named planning strategy with a stable `id`, a human-readable `name`, a non-empty one-sentence `description`, and exactly one operation, `plan(board, piece, position)`, returning a `DemoActionLog` for the active piece. `board` SHALL be the visible board as rows of `0` (free) and `1` (occupied); `piece` SHALL be the active piece's reachable orientations, each a list of cells relative to the rotation point (current orientation first, each `C` selecting the next); `position` SHALL be the rotation point on the board. A `DemoActionLog` SHALL be a string of demo action codes from the shared alphabet: `L` (move left), `R` (move right), `C` (rotate clockwise), `A` (rotate anticlockwise), and `H` (hard drop). The log SHALL NOT contain `T` (tick): ticks belong to the demo driver, which applies Action then Tick. The alphabet SHALL be the session action vocabulary without `T`, defined once in the shared core rather than declared again. An empty log SHALL mean the engine has no actions for that piece. A log SHALL be permitted to carry exactly one code after its `H`: that code SHALL be the piece's last-tick move, one lateral action (`L` or `R`) that the driver applies after the hard drop and before that interval's gravity tick, so the piece can side-step one column into a placement a straight drop cannot reach. A log SHALL NOT carry more than one last-tick move and SHALL NOT carry `C`, `A`, or a second `H` after the drop; an engine that plans no side-step SHALL end its log with `H`. The destination the classic planner returns SHALL carry the last-tick move (`L`, `R`, or none) and the shared toolkit SHALL let an engine emit it with one call, `actionsToward(orientation, position, column, lastTickMove)`. An engine SHALL plan only: it SHALL NOT mutate the board, piece, or position, advance gravity, move or rotate the active piece itself, lock a piece, side-step a piece itself, score, or detect game over, and the three inputs SHALL be unchanged when the call returns.

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

#### Scenario: A log plans its last-tick side-step after the drop

- **GIVEN** a board on which the best placement is reachable only by dropping in the neighbouring column and side-stepping one column on the last tick
- **WHEN** the engine's `plan` returns
- **THEN** the log ends with `H` followed by exactly one `L` or `R` code
- **AND** that code points from the drop column toward the settlement column
- **AND** the log carries no rotation or second drop after `H`

#### Scenario: A log without a side-step ends with the drop

- **GIVEN** a board on which the best placement is reachable by a straight drop
- **WHEN** the engine's `plan` returns
- **THEN** the last code of the log is `H`
- **AND** no code follows it

#### Scenario: The toolkit expresses the last-tick move in one call

- **GIVEN** an orientation index, a rotation point, a target column, and a last-tick move of `R`
- **WHEN** the engine builds its log with `actionsToward(orientation, position, column, 'R')`
- **THEN** the result is the rotations, the lateral moves, `H`, and a trailing `R`
- **AND** omitting the last-tick move produces the same log without the trailing code

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

`pentix-core` SHALL register the existing Delphi `CalcDemoDest` planner as the demo engine with id `delphi5`, display name `Delphi 5`, and a non-empty description. Its `plan` operation SHALL return the action log that steers the piece to the destination the ported `CalcDemoDest` heuristic chooses for the same board, reachable orientations, and rotation point: rotations that reach the chosen orientation, lateral moves that reach the destination column, then `H`. Because that heuristic also scores the placements one column left and right of a resting placement and steers to the column the winning placement starts from, `plan` SHALL append the classic **last-tick move** — `L` or `R`, the direction from the drop column to the winning placement's column — when the winning placement is reached by such a side-step, and SHALL end at `H` when it is not. When the heuristic finds no placement, its `plan` SHALL return an empty log. `plan` SHALL run the heuristic on the `0`/`1` board it receives, without building another board representation, and SHALL NOT mutate its inputs.

#### Scenario: The engine steers toward the classic destination

- **GIVEN** a board with a placeable piece and a destination chosen by the classic heuristic
- **WHEN** the `delphi5` engine plans
- **THEN** its log's rotations and moves target that destination's orientation and column
- **AND** the log contains `H`
- **AND** the log contains no `T`

#### Scenario: The engine plans nothing when the classic planner finds no placement

- **GIVEN** a board on which the piece cannot be placed anywhere
- **WHEN** the `delphi5` engine plans
- **THEN** it returns an empty log

#### Scenario: A straight drop ends at the hard drop

- **GIVEN** a board on which the classic destination is reached by a straight drop
- **WHEN** the `delphi5` engine plans
- **THEN** its log ends with `H`
- **AND** it does not side-step after the drop

#### Scenario: The engine side-steps under a mino on the row before last

- **GIVEN** a board of `12` columns and `22` rows whose only settled cell is one mino at row `20` in column `c`
- **WHEN** the `delphi5` engine plans the single-cell piece from the top of the board
- **THEN** its log ends with `H` and then `L` or `R`, pointing from the neighbouring drop column toward column `c`
- **AND** replaying that log as Action then Tick settles the piece in column `c` on row `21`, directly under the settled mino
- **AND** the settled mino is still at row `20` in column `c` and the piece stays in that pocket

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

Every demo engine SHALL live in its own TypeScript module under `packages/pentix-core/src/demo-engines/`, named `<engine-id>-demo-engine.ts`, and that module SHALL export exactly the engine's `id`, `name`, `description`, and `plan` function, typed by the demo-engine contract, so every engine accepts the same three parameters (`board`, `piece`, `position`) and returns the same result type (`DemoActionLog`). An AI-authored engine's `<engine-id>` SHALL encode its source run as `<vendor>-<version>[-<variant>]-<mode>` in lowercase kebab-case, with an absent segment omitted rather than invented, the bracketed reproduction note excluded, and the module's `id` equal to that prefix. The repository SHALL supply each engine's `id`, `name`, and `description`; the standalone authoring brief SHALL ask only for the `plan` function. An AI-authored engine's `plan` SHALL be the authored body passed through the shared authored-plan adapter, and the module SHALL NOT restate or re-tune that strategy. The catalog module `demo-engines/index.ts` SHALL import the engine modules, register them in a documented order, and be the only place a new engine has to be added. The built-in engines SHALL follow the same convention as authored engines; no engine SHALL be defined as an object literal inside the registry, the browser client, or the documentation. An engine module SHALL be a pure planner: no session mutation, no I/O, no timers, no DOM or Node.js APIs, no ticks in its output, and no imports outside the demo-engine contract and the demo-engine toolkit.

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
- **AND** the built-in modules are `delphi5-demo-engine.ts`, `random-demo-engine.ts`, `claude-opus-5-5-extra-demo-engine.ts`, `claude-sonnet-5-5-extra-demo-engine.ts`, `deepseek-v4-flash-1107-max-demo-engine.ts`, `deepseek-v4-pro-max-demo-engine.ts`, `glm-5-3-flash-extra-demo-engine.ts`, `minimax-m3-1-flash-extra-demo-engine.ts`, and `qwen-4-max-demo-engine.ts`
- **AND** every module's `id` equals its file-name prefix

#### Scenario: The built-in engines follow the module convention

- **GIVEN** every built-in engine, the two classic ones and the seven authored ones
- **WHEN** their modules are inspected
- **THEN** each exports `id`, `name`, `description`, and `plan`
- **AND** each `description` is non-empty
- **AND** each `plan` returns only `L`, `R`, `C`, `A`, and `H` characters

#### Scenario: An AI-authored engine keeps its authored body

- **GIVEN** an authored plan function produced from the shared brief
- **WHEN** its engine module is inspected
- **THEN** the authored body is the module's only planning code
- **AND** the module exports `plan` as that body wrapped by the shared adapter
- **AND** the module does not import a strategy from another engine

#### Scenario: An incomplete engine module is rejected

- **GIVEN** a module that does not provide one of the four required exports
- **WHEN** the catalog attempts to register it
- **THEN** registration fails with an error naming the missing member
- **AND** the already-registered engines stay resolvable

### Requirement: AI-authored engines join the catalog under a self-describing id

`pentix-core` SHALL register seven of the AI-authored planners produced from `docs/demo-engine-task.md` as built-in demo engines, in the order `claude-opus-5-5-extra`, `claude-sonnet-5-5-extra`, `deepseek-v4-flash-1107-max`, `deepseek-v4-pro-max`, `glm-5-3-flash-extra`, `minimax-m3-1-flash-extra`, and `qwen-4-max`, after the existing `delphi5` and `random` engines. The `GigaChat` answer SHALL NOT be registered, because it adds no strategy the other engines do not cover. An AI-authored engine module SHALL be named `<engine-id>-demo-engine.ts`, where `<engine-id>` follows `<vendor>-<version>[-<variant>]-<mode>` in lowercase kebab-case and every optional segment keeps its stated position: `<vendor>` is the model family, `<version>` is the version with dots written as dashes and the model's `v`/`M` prefix kept, `<variant>` is the optional size or build token, and `<mode>` is the reasoning mode named by the source (`extra`, `max`). A segment the source name does not provide SHALL be omitted rather than invented, and the bracketed reproduction note — thinking time, `Chat`, credit commentary — SHALL NOT appear in the id. Each module SHALL export the display `name` in the model's own capitalization and a `description` that repeats the name in more detail and includes the bracketed note when the source run had one.

#### Scenario: The catalog lists the authored engines after the built-ins

- **GIVEN** the built-in demo-engine catalog
- **WHEN** a consumer lists the engine ids
- **THEN** the list starts with `delphi5` and `random`
- **AND** it continues with `claude-opus-5-5-extra`, `claude-sonnet-5-5-extra`, `deepseek-v4-flash-1107-max`, `deepseek-v4-pro-max`, `glm-5-3-flash-extra`, `minimax-m3-1-flash-extra`, and `qwen-4-max` in that order
- **AND** the list holds nine engines in total
- **AND** no engine with id `gigachat` is registered

#### Scenario: An authored engine's id is its file-name prefix

- **GIVEN** the module `packages/pentix-core/src/demo-engines/minimax-m3-1-flash-extra-demo-engine.ts`
- **WHEN** the catalog registers it
- **THEN** the registered engine's id is `minimax-m3-1-flash-extra`
- **AND** the file name matches `<engine-id>-demo-engine.ts`

#### Scenario: The file name carries the vendor, version, variant, and mode

- **GIVEN** an authored engine produced by GLM-5.3-Flash in Extra mode after 15 minutes of thinking
- **WHEN** its module is named
- **THEN** the id is `glm-5-3-flash-extra`
- **AND** its display name is `GLM 5.3 Flash Extra`
- **AND** the 15 minutes appear nowhere in the id

#### Scenario: A source without a mode or variant omits those segments

- **GIVEN** an authored engine produced by Qwen4 in Max mode with `Chat` as its bracketed note and no size tier in its name
- **WHEN** its module is named
- **THEN** the id is `qwen-4-max`
- **AND** no variant segment is invented

#### Scenario: The description repeats the name and keeps the bracket note

- **GIVEN** an authored engine whose source name is `Claude Opus 5.5 Extra (40 min thingking)`
- **WHEN** a consumer reads its `description`
- **THEN** the description names Claude Opus 5.5 in Extra mode
- **AND** it mentions the 40 minutes of thinking
- **AND** it summarizes the planning strategy rather than restating the action alphabet

### Requirement: A plan drops before it side-steps

An engine's action log SHALL end at `H` whenever the placement it chose is reachable by a straight drop in the target column. The single post-drop lateral code SHALL be emitted only when the chosen placement cannot be reached by a straight drop — a pocket under an overhang that only a drop in a neighbouring column followed by one side-step can enter. When the log carries that code, it SHALL still be the final character, with no rotation or second hard drop after it. An engine that does not need a side-step SHALL NOT emit one, and a plan for a placement reachable by a drop SHALL be the same log with the trailing code removed.

#### Scenario: A drop-reachable placement ends at the drop

- **GIVEN** a board on which the chosen placement is reachable by a straight drop in the target column
- **WHEN** an engine plans that placement
- **THEN** the log's last code is `H`
- **AND** no `L` or `R` follows it

#### Scenario: An empty board never needs a side-step

- **GIVEN** any built-in engine and an empty board on which the active piece can be placed
- **WHEN** the engine plans
- **THEN** its log ends at `H`
- **AND** it carries no post-drop lateral code

#### Scenario: Only a pocket earns the side-step

- **GIVEN** a board whose best placement sits under an overhanging settled cell, reachable only by dropping one column aside and side-stepping on the last tick
- **WHEN** the engine plans that placement
- **THEN** the log ends with `H` followed by exactly one `L` or `R`
- **AND** no rotation or second drop follows it

### Requirement: An authored plan function is adapted by one shared wrapper

`pentix-core` SHALL provide one shared adapter on the demo-engine toolkit that turns an authored plan function — typed `(board: number[][], piece: { row: number; column: number }[][], position: { row: number; column: number }) => string` — into a contract `plan(board, piece, position): DemoActionLog`. On every call the adapter SHALL deep-copy the read-only board rows and piece cells into fresh mutable arrays and clone the position, SHALL run the authored function inside `try`/`catch` and return the empty log when it throws, and SHALL normalize its result to a legal log: it SHALL keep only `L`, `R`, `C`, `A`, and `H`, SHALL keep at most one `L` or `R` after the first `H`, and SHALL drop everything after it. The adapter SHALL return the empty log for an empty result or a non-string result. Every AI-authored engine module SHALL expose `plan` through that adapter and SHALL keep the authored body as its planner; it SHALL NOT hand-edit the strategy.

#### Scenario: The contract inputs are copied before the authored plan runs

- **GIVEN** an AI-authored engine whose body writes to the `board` or `piece` it receives
- **WHEN** the demo calls the engine's `plan` with a session's board, piece, and position
- **THEN** the session's board and piece are unchanged
- **AND** the next call plans from the same board the demo passed

#### Scenario: Only demo action codes survive the wrapper

- **GIVEN** an authored plan that returns `"LLXH!"`
- **WHEN** the adapter normalizes the result
- **THEN** the returned log is `LLH`

#### Scenario: Nothing follows the post-drop move

- **GIVEN** an authored plan that returns `"RHHLC"`
- **WHEN** the adapter normalizes the result
- **THEN** the returned log is `RHL`
- **AND** no rotation or second drop follows the first `H`

#### Scenario: A throwing plan yields no actions

- **GIVEN** an authored plan that throws for the board it receives
- **WHEN** the demo calls the engine's `plan`
- **THEN** the engine returns the empty log
- **AND** the demo board keeps ticking under gravity

#### Scenario: A legal log passes through unchanged

- **GIVEN** an authored plan that returns `"CLRHR"`
- **WHEN** the adapter normalizes the result
- **THEN** the engine returns exactly `CLRHR`

