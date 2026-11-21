## ADDED Requirements

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

## MODIFIED Requirements

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
