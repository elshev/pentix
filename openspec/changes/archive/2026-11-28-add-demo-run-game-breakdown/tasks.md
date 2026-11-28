## 1. Result types and helpers

- [x] 1.1 In `apps/pentix-server/src/demo-runs.ts`, replace `DemoRunStanding` with three exported types. `DemoRunEngineStanding` carries `engineId`, `name`, `totalPoints`, `totalLines`, `totalPieces`, `playingTimeMs`, and `playingTimePer1000PiecesMs`. `DemoRunGameStanding` carries `engineId`, `points`, `lines`, `pieces`, and `playingTimeMs`. `DemoRunGameResult` carries `index`, `id`, and `standings`.
- [x] 1.2 Change `DemoRunSnapshot` to carry `engines: readonly DemoRunEngineStanding[]` and `games: readonly DemoRunGameResult[]`, and remove `standings`. Keep `id`, `status`, `gameCount`, `completedGameCount`, and the optional `error`.
- [x] 1.3 Add and export `playingTimePer1000PiecesMs(playingTimeMs: number, pieceCount: number): number | null`. Return `null` when `pieceCount` is `0`. Otherwise return `Math.round((playingTimeMs * 1000 / pieceCount) * 1000) / 1000`, and reuse `roundMilliseconds`.
- [x] 1.4 Add a private `toGameStanding(engine, statistics, planTimeMs)` helper that rounds the plan time and returns a row with no name and no rate.
- [x] 1.5 Replace `compareStandings` with a private `compareRank(a, b)` over `{ points, lines, pieces, playingTimeMs, engineId }`. Map `totalPoints`, `totalLines`, and `totalPieces` into that shape when the call sorts engine lines.

## 2. Per-game results and engine totals

- [x] 2.1 Keep `DemoRunTotals` as the four running numbers, and add a `games: readonly DemoRunGameResult[]` field to `DemoRunRecord`.
- [x] 2.2 Change `playGame(record, totals, gameIndex)` to return a `DemoRunGameResult`. It records the id of the game it creates and builds one row per engine from that session. It adds each row's four numbers to the totals and sorts the rows with `compareRank`.
- [x] 2.3 In `playRun`, append each game result and publish it in the same update that raises `completedGameCount`, so `games.length` equals `completedGameCount`.
- [x] 2.4 Add a private `buildEngineStandings(engines, totals)` that maps every engine to a `DemoRunEngineStanding` and sorts it with `compareRank`. Call it in `startRun` with empty totals, after each game, and at completion.
- [x] 2.5 In `startRun`, publish the zeroed engine lines so a queued run already carries `engineId` and `name`.
- [x] 2.6 In the `playRun` catch, publish `status: failed` with the message, an empty `games` array, and zeroed engine lines. Keep the retention trim and `whenIdle` behaviour unchanged.

## 3. API schemas

- [x] 3.1 In `apps/pentix-server/src/api/schemas.ts`, import the three new types and add `DemoRunGameStandingSchema`, `DemoRunEngineStandingSchema`, and `DemoRunGameResultSchema`. Use `UuidV7Schema` for `id`, a non-negative integer for `index`, and `z.number().nullable()` for the engine rate. The game row schema carries no `name` and no rate.
- [x] 3.2 Change `DemoRunSnapshotSchema` to carry `engines: z.array(DemoRunEngineStandingSchema).readonly()` and `games: z.array(DemoRunGameResultSchema).readonly()`, and drop `standings`. Keep `satisfies z.ZodType<DemoRunSnapshot>`.
- [x] 3.3 Keep the demo-run routes, the request schema, and the status codes unchanged. The OpenAPI document then carries the new objects through the existing `DemoRunSnapshot` reference.

## 4. Tests

- [x] 4.1 Update `a demo run plays every engine and completes`. Map engine ids from `run.engines`, assert the zeroed totals, and assert `games` is empty before completion and holds two entries after it.
- [x] 4.2 Update `demo standings sum the games and rank equal engines by id`. Assert two `games` entries with `index` `0` and `1` and distinct ids. Assert that each row equals one game's expected statistics and that its `playingTimeMs` equals its `pieces`. Assert that the engine line reports the doubled `total*` values and a rate of `1000`.
- [x] 4.3 Add a test that each game orders its own rows. In a two-game run, every row list follows `engineId` order for equal statistics. The engine line follows the run totals.
- [x] 4.4 Add a test for `playingTimePer1000PiecesMs`: `(4.5, 300)` returns `15`, `(1, 3)` returns `333.333`, `(0, 0)` returns `null`, and `(12, 0)` returns `null`.
- [x] 4.5 Update `a throwing planner fails the run without standings`. Assert `games` is empty, every engine line reports zero totals, and `error` names the cause.
- [x] 4.6 Update `POST /demo-runs starts a background run and reports its standings`. Assert the engine objects with `engineId` and `name`, the empty `games` on the `202` answer, and one game entry with `index` `0` and a UUIDv7 id after completion.
- [x] 4.7 Update the maximum-batch, retention, and live-schema tests to read `games` and `engines` instead of `standings`, and parse each game row through `DemoRunGameStandingSchema`. Assert that a game row carries no `name` and no rate.
- [x] 4.8 Run the whole suite and fix every remaining `standings` reference.

## 5. Documentation

- [x] 5.1 In `README.md`, rewrite the `GET /v1/demo-runs/{id}` paragraph. It must name `engines` with `engineId`, `name`, and the `total*` fields, `games` with `index`, `id`, and `standings`, and `playingTimePer1000PiecesMs` on an engine line with the `null` rule. It must state that a game row carries no engine name and no rate. It must state that `games` grows to `completedGameCount` entries.
- [x] 5.2 In `docs/foundation.md`, describe the engine ranking, the per-game standings, the game id, and the time per `1000` pieces rule in the demo-run paragraph.
- [x] 5.3 In `GLOSSARY.md`, split the `Standing` entry into `Engine standing` (run aggregate with `total*` fields) and `Game standing` (one game, no name and no rate). Add `Game result` (`DemoRunGameResult`) and `Time per 1000 pieces` (`playingTimePer1000PiecesMs`) with their avoid lists.
- [x] 5.4 When `openspec archive` moves this change, add one row to `docs/decisions/README.md` with the date, the design link, the scope, and the status.

## 6. Verification

- [x] 6.1 Run `npm run build`. The core, server, and web builds must pass.
- [x] 6.2 Run `npm test`. Both suites must pass.
- [x] 6.3 Run `npm run lint`. The command must report no error.
- [x] 6.4 Run `openspec validate add-demo-run-game-breakdown --strict`.
- [x] 6.5 Run `python .cline/skills/asd-ste100/scripts/ste-lint.py` on every changed spec and document. The output must show no new hard violation.
- [x] 6.6 Start the server against `PENTIX_DATA_FILE` and post a `POST /v1/demo-runs` run of `2` games. Read `GET /v1/demo-runs/{id}`. The response must hold two engine lines with `total*` fields and two game entries with stored ids. Each engine total must equal the sum of its game rows.

