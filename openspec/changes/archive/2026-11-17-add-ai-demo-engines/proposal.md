## Why

The registry already resolves engines by id, but an engine is still a two-method planner (`planDestination`, `planLastTickMove`) that returns one destination and forces the browser driver to re-ask on every last tick and to synthesize the actual keystrokes. A strategy cannot express a sequence, the steering rules live in the client, the last tick needs a second engine call, and an AI author must implement two methods plus understand the driver's re-planning. Pentix already replays sessions from compact per-piece action strings, so an engine should produce exactly that: a replayable log of actions for the active piece.

## What Changes

- **BREAKING** (internal core API): replace both engine operations with one function, `plan(board, piece, position)`, returning a `DemoActionLog`; the three parameters are the minimal planning input: the visible board as rows of `0`/`1`, the active piece's reachable orientations, and that rotation point — a string such as `"LLCRH"` where `L`/`R` move, `C`/`A` rotate clockwise/anticlockwise, and `H` hard-drops. `T` (tick) SHALL NOT appear in a log: the driver owns time.
- Define and document the driving rule: after a piece appears the demo applies **Action, then Tick, then Action, then Tick**, and once the log is exhausted it applies ticks only until the piece locks. The engine never plans ticks.
- Add `packages/pentix-core/src/demo-actions.ts` with the demo action codes, an `isDemoAction` guard, the minimal input types, `createDemoEngineInput(session)`, and `actionsToward(rotations, position, column)` — the shared helpers both built-ins use.
- Rewrite both existing engines to the log contract with unchanged strategy intent: `delphi5` converts `planDemoDestination` into rotations, lateral moves, and a hard drop; `random` picks a uniformly random reachable angle/column and converts it the same way. Both return an empty log when no destination exists.
- **Remove** the last-tick side-step from the demo contract and demo mode: there is no second engine call and no per-tick re-planning. The destination heuristic keeps scoring side-step placements, and `planDemoLastTickMove` stays as a pure classic helper that the demo no longer calls.
- Keep the one-module-per-engine convention (`<engine-id>-demo-engine.ts`), the `description` field, registry shape validation and `summaries()`, and the registry-driven rail (one board per registered engine, capped at `12`).
- Rewrite the AI authoring brief in `docs/demo-engine-task.md` as a standalone task for an AI with no repository access: it asks only for the `plan(board, piece, position): string` function (no id, name, description, path, or imports) and explains the game, the parameter and return types, the action alphabet, the ban on `T`, and the Action-Tick rule.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities

- `demo-engines`: the contract becomes one `plan(board, piece, position)` returning a replayable action log (`L`, `R`, `C`, `A`, `H`, never `T`); engines are one module with the four named exports; the registry validates shape and id format and exposes summaries; `delphi5` and `random` are rewritten to emit logs.
- `demo-mode`: the demo replays the selected engine's log with the Action-Tick rule, ticks alone once the log ends, and no longer asks an engine about its last tick or re-plans mid-piece; the side-step requirements are removed.
- `demo-boards`: each rail board replays its own engine's action log with the same Action-Tick rule, per-piece plan caching, and per-board cadence.
- `repository-documentation`: the AI authoring brief must state the action alphabet, the ban on `T`, and the Action-Tick rule, and the documentation must describe the registry-driven rail.

## Impact

- Affected code: `packages/pentix-core` (new `demo-actions.ts`; rewritten `demo-engine.ts` contract; `demo-engines/` folder with `index.ts`, `delphi5-demo-engine.ts`, `random-demo-engine.ts` replacing `demo-delphi5.ts` and `demo-random.ts`; `demo-engine-toolkit.ts`; barrel exports; core tests), `apps/pentix-web` (`engine/demo.ts` becomes a per-piece action queue, `engine/gameReducer.ts` applies one action code plus one tick per step and drops the unreachable-destination fallback, `games/pentix/DemoBoard.tsx` keeps the engine label and tooltip, web tests), `docs/demo-engine-task.md` (new), `docs/foundation.md`, and `README.md`.
- Affected APIs: additive core exports (`DemoAction`, `DemoActionLog`, `DemoBoard`, `DemoPiece`, `DemoPosition`, `DEMO_ACTION_CODES`, `isDemoAction`, `createDemoEngineInput`, `actionsToward`, `demoLandingRow`, `DemoEngineSummary`, `builtInDemoEngines`, `DemoEngineRegistry.summaries()`); breaking internal exports (`DemoEngine.plan` replaces `planDestination`/`planLastTickMove`, engine modules move under `demo-engines/`). No HTTP, server, storage, or session-replay format changes; no new runtime dependencies.
- Behavioural impact: demo pieces follow the planned actions exactly, Action before Tick, and no longer take a separate last-tick side-step; a piece whose log is longer than its fall drops the remaining actions when it locks. Destination choice is unchanged, so placements and scoring stay familiar.
- Affected teams/areas: owners of the shared demo planners in `pentix-core`, the demo-engine authors (human or AI) who follow `docs/demo-engine-task.md`, and the `pentix-web` gameplay client that renders and drives the rail. The server, storage, and replay paths are untouched.
- Dependencies: none — no new packages, and engine modules may use only the core helpers listed in the toolkit.
- Rollback plan: restore the two-operation `DemoEngine` (`planDestination`/`planLastTickMove`), move the engine modules back to `packages/pentix-core/src/` with their adapters, restore the per-interval "tick then destination steering" driver in `apps/pentix-web/src/engine/demo.ts` and `gameReducer.ts` (including the unreachable-destination lock fallback), delete `demo-actions.ts`, `demo-engines/`, `demo-engine-toolkit.ts`, and `docs/demo-engine-task.md`, and revert the documentation and the removed `demo-mode` requirements. `demo.ts` keeps `planDemoDestination`/`planDemoLastTickMove` in both directions, so the classic planners survive a partial rollback.
