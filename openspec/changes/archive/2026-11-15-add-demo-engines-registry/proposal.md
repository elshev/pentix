## Why

The attract demo's planning logic is one hard-coded port of the Delphi `CalcDemoDest` heuristic in `packages/pentix-core/src/demo.ts`, and the browser demo controller calls it directly. Trying a different demo behaviour — or comparing strategies — means editing that heuristic or forking the controller, so there is no seam for alternative demo engines and no single place where the available ones are listed.

## What Changes

- Add a `DemoEngine` contract to `pentix-core`: a stable `id`, a display `name`, and two planning operations — `planDestination(session)` and `planLastTickMove(session)` — each returning a `DemoDestination` or `null`. Engines plan only; movement, rotation, locking, scoring, and game-over detection stay in the shared `GameSessionEngine`.
- Register the existing planning behaviour as the `Delphi5` engine (id `delphi5`, name `Delphi 5`), implemented as a thin adapter over the current `planDemoDestination` / `planDemoLastTickMove` functions so its behaviour is unchanged.
- Add a temporary `Random` engine (id `random`) that plans a uniformly random reachable rotation angle and landing column for the active piece and declines all last-tick side-steps. It is explicitly temporary and will be removed once the registry has a real alternative.
- Add a demo engine registry in `pentix-core` that registers engines by id, resolves them by id, lists them, rejects duplicate ids, and reports unknown ids with a clear error. `delphi5` is the default engine.
- Route the browser demo through the registry: `resolveDemoPlan` / `useDemoController` plan with the resolved engine instead of calling the global planner, and a single commented constant selects the active engine. The demo temporarily selects `random` to exercise the pluggable path; reverting that constant restores the `Delphi5` demo.
- Keep the existing per-piece plan cache, so a random destination stays stable while its piece falls.

## Capabilities

### New Capabilities

- `demo-engines`: The pluggable demo-engine contract, the registry that resolves engines by id, the `delphi5` engine that preserves the classic heuristic, and the temporary `random` engine.

### Modified Capabilities

- `demo-mode`: Demo planning now delegates to the engine selected from the registry instead of directly invoking the Delphi planner. The Delphi-specific placement/side-step requirements are scoped to the `delphi5` engine, and an engine that declines a last-tick move locks the piece normally.

## Impact

- Affected code: `packages/pentix-core` (new `demo-engine.ts`, `demo-delphi5.ts`, `demo-random.ts`; small internal exports from `demo.ts`; barrel exports; core tests) and `apps/pentix-web` (`engine/demo.ts`, `games/pentix/useDemoController.ts`; web tests). No change to `session-engine.ts`, `placement.ts`, the reducer, or presentation.
- Affected APIs: additive core exports (`DemoEngine`, `demoEngineRegistry`, `getDemoEngine`, `delphi5DemoEngine`, `randomDemoEngine`, `DEFAULT_DEMO_ENGINE_ID`); the web-internal `resolveDemoPlan` gains an optional engine parameter. No HTTP, server, storage, or session-replay contract changes.
- Affected teams/areas: owners of the shared demo planner in `pentix-core` and the `pentix-web` gameplay client. The server, storage, and replay paths are untouched.
- Dependencies: none — no new runtime packages.
- Rollback plan: point the browser's active-engine constant back at `delphi5` (or delete it and use the registry default), then delete `demo-random.ts`, `demo-delphi5.ts`, `demo-engine.ts`, their barrel exports, and the engine parameter on `resolveDemoPlan`; `demo.ts` and all existing planner behaviour remain intact throughout, so the demo returns to its pre-change wiring without touching the heuristic.
