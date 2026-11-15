## 1. Core contract and registry

- [x] 1.1 Add `packages/pentix-core/src/demo-engine.ts` defining `DemoEngineId`, the `DemoEngine` interface (`id`, `name`, `planDestination`, `planLastTickMove`) and a `DemoEngineRegistry` class with `register` (throws on a duplicate id), `get` (throws on an unknown id, naming it) and `list` (registration order).
- [x] 1.2 In the same module, register `delphi5DemoEngine` and then `randomDemoEngine`, and export the `demoEngineRegistry` singleton, `DEFAULT_DEMO_ENGINE_ID = 'delphi5'`, and `getDemoEngine(id = DEFAULT_DEMO_ENGINE_ID)`.
- [x] 1.3 Add `packages/pentix-core/src/demo-delphi5.ts` exporting a frozen `delphi5DemoEngine` (`id: 'delphi5'`, `name: 'Delphi 5'`) whose two operations delegate directly to `planDemoDestination` and `planDemoLastTickMove`.
- [x] 1.4 Export the existing internal geometry helpers `candidateAngles` and `findLandingRow` from `packages/pentix-core/src/demo.ts` for in-package reuse (do not add them to the public barrel).
- [x] 1.5 Add `packages/pentix-core/src/demo-random.ts` exporting a frozen `randomDemoEngine` (`id: 'random'`, `name: 'Random'`) with a TEMPORARY-removal comment: `planDestination` enumerates every `{ angle, column }` with an open drop shaft via `candidateAngles`/`findLandingRow`, picks one uniformly with `Math.random`, and returns `null` when none exists; `planLastTickMove` always returns `null`.
- [x] 1.6 Add the new public exports to `packages/pentix-core/src/index.ts` (`demo-engine.ts` values/types, `delphi5DemoEngine`, `randomDemoEngine`) and run `npm run build:core`.

## 2. Browser integration

- [x] 2.1 In `apps/pentix-web/src/engine/demo.ts`, add a commented temporary `ACTIVE_DEMO_ENGINE_ID: DemoEngineId = 'random'`, resolve it once with `getDemoEngine`, and give `resolveDemoPlan` an optional `engine` parameter defaulting to that resolved engine; use the engine's `planDestination`/`planLastTickMove` instead of the imported global planners.
- [x] 2.2 Pass the resolved engine from `apps/pentix-web/src/games/pentix/useDemoController.ts` into `resolveDemoPlan` so the controller never plans with the module default implicitly.
- [x] 2.3 Confirm `nextDemoAction`/`actionTowardDestination` keep their current signatures and still steer toward a supplied destination without consulting any planner.

## 3. Tests

- [x] 3.1 Add core tests for the registry: resolving `delphi5` and `random`, the default resolving to `delphi5`, listing both built-ins, an unknown id raising an error that names it, and a duplicate id raising an error while the original engine still resolves.
- [x] 3.2 Add core tests that `delphi5DemoEngine.planDestination` and `.planLastTickMove` return exactly what `planDemoDestination` and `planDemoLastTickMove` return for the same sessions.
- [x] 3.3 Add core tests for `randomDemoEngine`: with `Math.random` stubbed to `0` and to a value near `1` it returns different reachable angle/column pairs, every returned pair is placeable, it returns `null` on a fully blocked board, and `planLastTickMove` always returns `null`.
- [x] 3.4 Update `tests/pentix-web.test.mjs` demo tests to pass an explicit engine to `resolveDemoPlan` (pin `delphi5DemoEngine` for the side-step/steering cases) and add a case proving the engine's `planDestination` is the one consulted.
- [x] 3.5 Keep the existing core planner and web steering tests unchanged in expectation; they must still pass.

## 4. Verification

- [x] 4.1 Run `npm run lint` and fix any warnings introduced by the new modules.
- [x] 4.2 Run `npm test` (builds core and server, runs core, server, and web suites).
- [x] 4.3 Run `npm run build:web` to confirm the browser bundle type-checks with the new imports.
- [x] 4.4 Confirm reverting the demo is a single-line change: setting `ACTIVE_DEMO_ENGINE_ID` back to `'delphi5'` restores the classic demo with no other edits.
