## 1. Shared core playback

- [x] 1.1 Add `packages/pentix-core/src/demo-play.ts` with the demo constants: `DEMO_SEED_PIECE_KEY: PieceKey = '1Line'`, the `height - 2` seed row rule, and `DEFAULT_DEMO_STARTING_LEVEL = 9`. Each carries a comment saying it reproduces the browser attract demo.
- [x] 1.2 In the same module, add `withSeededDemoMino(session, seedColumn?)` — one settled cell with `DEMO_SEED_PIECE_KEY` at row `height - 2` in `seedColumn` or a random column, statistics untouched, session unchanged when the board has no rows or columns.
- [x] 1.3 Add `createDemoSession({ id, userId, game, level, seedColumn })`: `createPentixGameSession` with `statistics.level` set to `level` and the seeded board applied; export `DemoSessionOptions`.
- [x] 1.4 Add the playback state machine: `createDemoPlayback({ engine, game, session, clock, selectPieceId })`, `advanceDemoPlayback(playback)`, and `playDemoSession(options)` looping the advance until `status` is `game-over`. The state carries `game`, `session`, `slot` (`'action' | 'tick'`, starting on `'action'`), the cached log with its index and piece index, `plans`, `planTimeMs`, and `done`. Keep the longer piece list from every `GameSessionEngine` result.
- [x] 1.5 Implement the cadence in `advanceDemoPlayback`: plan lazily when the cached log's piece index differs from `session.nextPieceIndex` (timing only that call with `clock`, defaulting to `performance.now()`/`Date.now()`); on the action slot apply one `move`/`rotate`/`drop` and advance the log, choosing the next slot `'action'` after `H` and `'tick'` otherwise; on the tick slot apply one `tick` and set the next slot to `'action'`; when the session is no longer `active`, return the state with `done: true` and change nothing.
- [x] 1.6 Export `createDemoSession`, `withSeededDemoMino`, `createDemoPlayback`, `advanceDemoPlayback`, `playDemoSession`, `DEMO_SEED_PIECE_KEY`, `DEFAULT_DEMO_STARTING_LEVEL`, and the option/result/state types from `packages/pentix-core/src/index.ts` with a short doc comment per group.

## 2. Client seed reuse

- [x] 2.1 In `apps/pentix-web/src/engine/gameReducer.ts`, delete the local seed implementation and import `withSeededDemoMino` from `#pentix/core`, re-exporting it so existing imports keep working; drop now-unused imports without touching any other demo state or behaviour.
- [x] 2.2 Run `npm run build:core` and `npm run test:web` and confirm the reducer, demo set, and rail tests still pass unchanged.

## 3. Server demo-run service

- [x] 3.1 Add `apps/pentix-server/src/demo-runs.ts` with `MAX_DEMO_RUN_GAME_COUNT = 256`, `DEFAULT_DEMO_RUN_GAME_COUNT = 1`, `MAX_RETAINED_DEMO_RUNS = 32`, `DEMO_RUN_USER_ID = 'demo'`, the `DemoRunStatus`, `DemoRunStanding`, and `DemoRunSnapshot` types, and a `DemoRunService` whose options accept `selectPieceId`, `engines` (default `demoEngineRegistry.list()`), `startingLevel` (default `DEFAULT_DEMO_STARTING_LEVEL`), and `clock`.
- [x] 3.2 Implement `startRun(gameCount)` (validate the integer range, create the `queued` record with a `createId` id and the engine-id list, enqueue, kick the pump with `setImmediate` so the `202` response leaves first, return the snapshot), `getRun(id)` (snapshot or `undefined`), and `whenIdle()`.
- [x] 3.3 Implement the pump: one run at a time, `running` before the first game, one `createPentixGame` per game plus one `createDemoSession` per engine, then drive each engine with `createDemoPlayback`/`advanceDemoPlayback`, `await`ing a `setImmediate` whenever `plans` grows so HTTP stays responsive, reusing the longest game and accumulating totals per engine; `completedGameCount` after each game, then the sorted `standings` and `completed`.
- [x] 3.4 Sort with `points` desc, `lines` desc, `pieces` desc, `playingTimeMs` asc, `engineId` asc; round `playingTimeMs` to three decimals; on an unexpected exception set `failed` and its `error` message with no standings.
- [x] 3.5 Trim completed runs to the `32` most recent completions, never evicting a `queued` or `running` record; trim before answering a new `startRun`.

## 4. Server wiring and HTTP

- [x] 4.1 In `apps/pentix-server/src/request.ts`, add `readGameCount(body): number` — absent body or field means `DEFAULT_DEMO_RUN_GAME_COUNT`, and the body field is `gameCount`; a non-integer or out-of-range value throws `HttpError(400, 'Demo run gameCount must be an integer from 1 to 256.')`.
- [x] 4.2 In `apps/pentix-server/src/http.ts`, add `accepted202: 202` to `HttpStatus`. In `apps/pentix-server/src/app.ts`, change `createPentixApp` to accept the run service, register `POST /demo-runs` (reads the body, calls `startRun`, answers `HttpStatus.accepted202`) and `GET /demo-runs/:id` (`checkUuid`, `404` with `Demo run {id} was not found.` when unknown), and add both endpoints to `NOT_FOUND_MESSAGE`.
- [x] 4.3 In `apps/pentix-server/src/server.ts`, add `demoEngines`, `demoStartingLevel`, and `demoPlanClock` to `PentixServerContext`, build one `DemoRunService` per server instance in `createPentixServer` from `context.createId ?? uuidv7` and those seams, and pass it to `createPentixApp`; export the service and its types.
- [x] 4.4 Confirm the lifecycle's repositories are untouched by the new module (no `storage.*` call in `demo-runs.ts`) and that nothing in `demo-runs.ts` imports `PentixGameLifecycle`.

## 5. Core tests

- [x] 5.1 In `tests/pentix-core.test.mjs`, add seed and session tests: a `12` by `22` game opens with exactly one `1Line` cell at row `20`, the supplied `seedColumn` is used, level `9` is applied, and statistics stay zero.
- [x] 5.2 Add playback cadence tests with a stub engine: `"L"` moves before the first tick; `"HL"` hard-drops, side-steps on the next action, and locks on the tick after that; `"HR"` on a piece that cannot move down leaves the spawned piece unmoved and plans a fresh log; an empty log lets ticks finish the piece; a blocked action leaves the placement and still ticks.
- [x] 5.3 Add plan-time tests with a stub clock returning `0`, `0.5`, `1`, `1.5`: `plans` is `2` and `planTimeMs` is `1` regardless of tick count; an empty-log engine still adds one plan and its measured duration.
- [x] 5.4 Add robustness tests: the original session and game objects are unchanged after playback; `playDemoSession` ends on `status` `game-over`; the returned game holds every consumed piece index and the session keeps its `gameId`.
- [x] 5.5 Run `npm run build:core` and `node --test tests/pentix-core.test.mjs`; keep the existing suite green.

## 6. Server tests

- [x] 6.1 In `tests/pentix-server.test.mjs`, add service-level tests with stub engines, a fixed `createId`, a fixed `selectPieceId`, and a fixed clock: `startRun` returns `queued` with the engine ids, `whenIdle()` completes it, `completedGameCount` equals `gameCount`, and each engine appears once in the standings.
- [x] 6.2 Add ranking tests: totals are summed across games, the highest `points` is first, equal points break on lines, then pieces, then shorter `playingTimeMs`, then engine id, and `playingTimeMs` matches the stub clock's measured durations.
- [x] 6.3 Add HTTP tests: `POST /demo-runs` with no body answers `202` with `gameCount` `1` and a UUIDv7 id; `{ "gameCount": 256 }` is accepted; `0`, `257`, `1.5`, and `"3"` answer `400` and create no run; polling `GET /demo-runs/{id}` reaches `completed` and then returns the standings; an unknown UUID answers `404` and a malformed id answers `400`.
- [x] 6.4 Add isolation tests: a run leaves the server's retained users, games, and sessions unchanged (list them before and after), and a run id answers `404` on a freshly started server.
- [x] 6.5 Run `npm run build:server` and `node --test tests/pentix-server.test.mjs`; keep the existing suite green.

## 7. Documentation

- [x] 7.1 In `README.md`, add `POST /demo-runs` and `GET /demo-runs/{id}` to the Server API section with the `gameCount` default and maximum, the background statuses, the standings fields, and the in-memory lifetime without a UI; mention demo runs in the current-scope list.
- [x] 7.2 In `docs/foundation.md`, add a section for the shared demo playback (seeded session, Action-then-Tick replay, plan-time measurement) and the server demo-run service, and state that runs are not persisted and never touch the repositories.
- [x] 7.3 Re-read both documents against the code: no demo-run feature is described as missing, no removed contract is described, and no engine count or field name is wrong.

## 8. Verification

- [x] 8.1 Run `npm run lint`.
- [x] 8.2 Run `npm test` (core, server, and web suites).
- [x] 8.3 Start the server with `npm run start:server`, `POST /demo-runs` with `{ "gameCount": 2 }`, poll `GET /demo-runs/{id}` until `completed`, and confirm nine ordered standing lines with name, points, lines, pieces, and `playingTimeMs`.
- [x] 8.4 Run `openspec validate --change add-server-play-demo` (or `openspec status --change add-server-play-demo`) and confirm every artifact is done.


## 9. Count naming convention

- [x] 9.1 Rename the demo-run request field `games` to `gameCount`, the snapshot fields to `gameCount` and `completedGameCount`, and the bounds constants to `MAX_DEMO_RUN_GAME_COUNT` and `DEFAULT_DEMO_RUN_GAME_COUNT` across `apps/pentix-server/src/{request,app,demo-runs}.ts`, `tests/pentix-server.test.mjs`, the specs, `proposal.md`, `design.md`, `README.md`, and `docs/foundation.md`.
- [x] 9.2 Record the convention in `.clinerules/rules.md`: a parameter or field that carries a count is named `<thing>Count`; a field that holds a collection keeps its plural name.
- [x] 9.3 Re-run `npm run build:server`, `node --test tests/pentix-server.test.mjs`, `npx eslint . --quiet`, and `openspec validate add-server-play-demo`.

