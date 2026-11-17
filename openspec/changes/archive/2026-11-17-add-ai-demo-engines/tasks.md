## 1. Core contract, minimal input, and the registry

- [x] 1.1 Add `packages/pentix-core/src/demo-actions.ts` with `DEMO_ACTION_CODES` derived from the existing `SESSION_ACTIONS` (no code literals repeated), `DemoAction = Exclude<SessionAction, 'T'>`, `DemoActionLog = string`, and `isDemoAction(code): code is DemoAction`.
- [x] 1.2 In the same module, define the minimal planning input: `DemoBoard` (rows of `0`/`1`), `DemoPieceCell`/`DemoPieceOrientation`/`DemoPiece` (reachable orientations, current first), `DemoPosition` (the rotation point), and `DemoEngineInput`, plus `createDemoEngineInput(session)` (which lists the reachable orientations by replaying the game's `clockwise` rule), `demoPieceCells`, `demoCanPlace`, `demoLandingRow`, and `actionsToward(orientation, position, column)` ending in `H`.
- [x] 1.3 In `packages/pentix-core/src/demo-engine.ts`, define `DemoEngine` as `{ id, name, description, plan(board, piece, position): DemoActionLog }`, document that `T` must not appear in a log, and define `DemoEngineSummary`.
- [x] 1.4 Keep the registration checks: non-empty lowercase kebab-case `id`, non-empty trimmed `name`, non-empty trimmed `description`, and a `plan` that is a function; keep duplicate-id and unknown-id rejections with errors that name the engine.
- [x] 1.5 Add `summaries(): readonly DemoEngineSummary[]` (frozen entries, registration order), keep `list()` in registration order, keep `DEFAULT_DEMO_ENGINE_ID = 'delphi5'`, and remove the built-in imports, singleton registration, and `getDemoEngine` from this module.

## 2. Demo-engine toolkit

- [x] 2.1 Add `packages/pentix-core/src/demo-engine-toolkit.ts` documenting it as the stable helper surface for engine modules and their wrappers.
- [x] 2.2 Re-export from it: `DEMO_ACTION_CODES`, `actionsToward`, `createDemoEngineInput`, `demoLandingRow`, `demoCanPlace`, `demoPieceCells`, `createDemoEngineInput`, `isDemoAction`, `planDemoDestinationForOrientations`, and the `DemoAction`, `DemoActionLog`, `DemoBoard`, `DemoEngineInput`, `DemoPiece`, `DemoPieceCell`, `DemoPosition`, `DemoDestination`, and `BoardSnapshot` types.
- [x] 2.3 Do not add the toolkit to the `pentix-core` barrel; engine modules import it directly by path. Do not offer `planDemoLastTickMove` in the toolkit even though `demo.ts` keeps exporting it.

## 3. Built-in engines and catalog

- [x] 3.1 Add `packages/pentix-core/src/demo-engines/delphi5-demo-engine.ts` exporting `id = 'delphi5'`, `name = 'Delphi 5'`, a one-sentence `description`, and `plan(board, piece, position)` that converts the minimal input to a board snapshot and offsets, plans with `planDemoDestinationForOrientations` over the given orientations, and returns `actionsToward(destination.orientation, position, destination.column)` or `''` when the heuristic finds nothing.
- [x] 3.2 Add `packages/pentix-core/src/demo-engines/random-demo-engine.ts` exporting `id = 'random'`, `name = 'Random'`, a one-sentence `description`, and `plan(board, piece, position)` that walks every given orientation and keeps every column with a landing row via `demoLandingRow`, picks one uniformly with `Math.random`, returns `actionsToward(picked.orientation, position, picked.column)`, and returns `''` when none is reachable.
- [x] 3.3 Add `packages/pentix-core/src/demo-engines/index.ts` that imports both modules as namespaces, exports `delphi5DemoEngine`/`randomDemoEngine` typed as `DemoEngine`, exposes `builtInDemoEngines` in registration order, creates the `demoEngineRegistry` singleton by registering that list, and exports `getDemoEngine(id = DEFAULT_DEMO_ENGINE_ID)`.
- [x] 3.4 Delete `packages/pentix-core/src/demo-delphi5.ts` and `packages/pentix-core/src/demo-random.ts`; keep `demo.ts`'s `planDemoDestination`, `planDemoDestinationForOrientations`, `planDemoLastTickMove`, and `canDemoPieceMoveDown` exports for the classic helper surface and existing tests.
- [x] 3.5 Update `packages/pentix-core/src/index.ts` to export the minimal input types, the action alphabet and helpers, the registry, the catalog, and every built-in engine.
- [x] 3.6 Run `npm run build:core` and confirm the strict build passes with `erasableSyntaxOnly` and `noUnusedLocals`.

## 4. Browser driver

- [x] 4.1 In `apps/pentix-web/src/engine/demo.ts`, keep a per-piece log queue (`sessionId`, `pieceIndex`, `actions`, `index`); `resolveDemoPlan(plan, session, engine)` asks `createDemoEngineInput(session)` for the board, piece, and position, calls `engine.plan(board, piece, position)` once per piece, and advances the cursor per interval.
- [x] 4.2 Expose `nextDemoAction(plan)` (the next `DemoAction` or `null`, with invalid characters mapped to `null`) and `advanceDemoPlan(plan)`; remove the destination-based steering helpers.
- [x] 4.3 In `apps/pentix-web/src/engine/gameReducer.ts`, change the demo step payload to `{ sessionId, pieceIndex, action: DemoAction | null }`, reject a step whose session id or piece index does not match, apply the code through `gameSessionEngine.move`/`rotate`/`drop`, and then always apply exactly one `gameSessionEngine.tick`.
- [x] 4.4 Delete `runDemoStep`'s unreachable-destination fallback, the `canDemoPieceMoveDown` import, and the old placement guard; keep `applyAdvance`, `mergeGame`, the phase transitions, and the gravity-epoch handling intact.
- [x] 4.5 In `apps/pentix-web/src/engine/gameReducer.ts`, delete `DEMO_BOARD_ENGINES`, import `demoEngineRegistry`, add `MAX_DEMO_BOARDS = 12`, and derive the slot engines from `demoEngineRegistry.list().slice(0, MAX_DEMO_BOARDS).map((engine) => engine.id)` inside `createBoardSet`, keeping `demoBoardId(index)` and `MAIN_DEMO_ENGINE_ID = 'random'`.
- [x] 4.6 In `apps/pentix-web/src/games/pentix/DemoBoard.tsx`, add `title={engine.description}` to the engine-name element, keeping the article's swap hint, `aria-label`, and the three statistics unchanged.
- [x] 4.7 Confirm `useDemoStepper`, `useDemoBoard`, and `useDemoController` only need the session, the resolved engine, and the dispatch, and that each board keeps its own queue in the stepper ref.
- [x] 4.8 Run `npm run build:web` and fix any type or import errors introduced by the new contract.

## 5. Documentation

- [x] 5.1 Rewrite `docs/demo-engine-task.md` as a fully standalone task for an AI with no repository access: no file path, imports, toolkit, id, name, or description; the exact `plan(board, piece, position): string` signature; `board`, `piece`, and `position` defined with examples, including `absolute = position + cell`.
- [x] 5.2 In the brief, explain the game, the action alphabet (`L`, `R`, `C`, `A`, `H`), the rule that `T` must never appear, the Action-then-Tick driving rule (then ticks alone), the rotation rule `(row, column) -> (-column, row)` with its inverse, and wall kicks.
- [x] 5.3 In the brief, list what the function may and may not do (pure, no imports/I/O/state, valid characters only), give a complete standalone example function, state the answer format (one function, no metadata), and give a self-check list.
- [x] 5.4 Add the engine module convention (`<engine-id>-demo-engine.ts`, `id`/`name`/`description` written by the repository, `plan(board, piece, position)`), the Action-Tick contract, and a link to `docs/demo-engine-task.md` to `docs/foundation.md`; update the `pentix-core` and browser-client descriptions in `README.md`.
- [x] 5.5 Document how an AI answer is adopted: keep the returned `plan` function unchanged, wrap it in `packages/pentix-core/src/demo-engines/<engine-id>-demo-engine.ts` with the repository-authored `id`, `name`, and `description`, and register the module in `demo-engines/index.ts` after review.
- [x] 5.6 When the change is archived, apply the manual spec fixes the delta format cannot express: update the `demo-boards` spec `Purpose` paragraph (which still says "two slot-addressed boards") to the registry-driven rail, and move the two renamed requirements (`A board set pairs the main session with one demo board per registered engine` and `The demo advances one action and one gravity step per interval`) back to their original positions, because the archive tool appends renamed requirements at the end.

## 6. Tests

- [x] 6.1 Add core tests for the alphabet: the demo codes are exactly `L`, `R`, `C`, `A`, `H`; they are the session alphabet minus `T`; `isDemoAction` rejects `T` and unknown characters.
- [x] 6.2 Add core tests for the geometry helpers: `createDemoEngineInput` lists each catalog piece's orientations in the game's clockwise order, `demoLandingRow` finds the resting row and returns `null` for a sealed column, and `actionsToward` emits rotations, lateral moves, and `H`.
- [x] 6.3 Add core registry tests for admission (non-kebab id, empty name, empty description, missing `plan` all throw and leave accepted engines intact), duplicates, unknown ids, and `summaries()` (one entry per engine, registration order, non-empty descriptions, no `plan`).
- [x] 6.4 Add a core test that every module in `builtInDemoEngines` exports the four members with non-empty descriptions, and a test that every module file in `demo-engines/` follows `<engine-id>-demo-engine.ts`.
- [x] 6.5 Add a core test that a freshly constructed engine object with the documented shape registers and plans from `(board, piece, position)` in a new `DemoEngineRegistry`.
- [x] 6.6 Add a core test that `createDemoEngineInput(session)` returns the visible board as `0`/`1` rows, the active piece's reachable orientations, and that rotation point.
- [x] 6.7 Add core tests for `delphi5` and `random` planned from the minimal input: alphabet-only logs with no `T`, an empty log when the board is sealed, and deterministic random choices under a pinned `Math.random`.
- [x] 6.8 Add a core replay test: replaying `delphi5`'s log as Action then Tick through `gameSessionEngine` locks the piece in the planned column.
- [x] 6.9 Update `tests/pentix-web.test.mjs` for the queue: `resolveDemoPlan` asks `plan` once per session/piece with the minimal input, replays the log's characters in order, returns `null` after the last character, and re-plans when the piece index changes.
- [x] 6.10 Update the web reducer tests: a demo step applies the action and then exactly one tick in that order, a blocked action still ticks, an exhausted log ticks only, a step with a stale session id or piece index is ignored, and a piece that locks with unplayed actions gets a fresh plan on the next piece.
- [x] 6.11 Update the rail tests so a fresh state's demo-board ids and engines equal `demoEngineRegistry.list().slice(0, MAX_DEMO_BOARDS)`, still `['demo-slot-1', 'demo-slot-2']` and `['delphi5', 'random']` for the built-ins, with `mainEngineId === 'random'`; keep the swap, restart, level-retune, and game-over tests green.
- [x] 6.12 Remove or rewrite the web tests that expected a last-tick side-step or steering toward a destination; they are superseded by the log replay tests.

## 7. Verification and readiness check

- [x] 7.1 Run `npm run lint` and fix any findings.
- [x] 7.2 Run `npm test` (builds core and server, runs the core, server, and web suites).
- [x] 7.3 Run `npm run build` to confirm core, server, and browser bundles all type-check with the new exports.
- [x] 7.4 Readiness: confirm the registry can hold many engines — every registered module resolves by id, appears once in `list()`/`summaries()`, produces one rail board while the cap is not exceeded, and a malformed module is rejected at registration without affecting the others.
- [x] 7.5 Readiness: author a plan function strictly from `docs/demo-engine-task.md` (then delete it) using a simple strategy idea, confirm the brief supplies the game, the three parameters, the `string` result, the alphabet, the ban on `T`, the Action-Tick rule, the rules, and the answer format without any repository access, and confirm the returned function's log contains no `T`.
- [x] 7.6 Spot-check `npm run dev:web`: the rail shows one board per registered engine with the built-in names, each name exposes its description as a tooltip, the main board still runs `random`, pieces follow their action logs (Action before Tick) and lock, and the console is free of registration errors.
