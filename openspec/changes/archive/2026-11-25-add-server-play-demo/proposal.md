## Why

Demo engines can only be compared by eye: the attract demo and the rail run in one browser tab, in real time, and every game is lost when the page reloads. `PentixServer` already owns the shared engine and the demo-engine registry, but it has no way to play a demo, so no one can measure which engine actually plays better.

## What Changes

- Add headless demo playback to `pentix-core`: one shared module that opens a demo session (one settled seed mino on the row before last plus the demo's opening level), replays an engine's `DemoActionLog` through the shared `GameSessionEngine` with the client's cadence (Action, then Tick, ticks only after the log ends, and a hard drop restarting the beat for its last-tick move), and measures only the time spent inside `plan` calls.
- Add a background demo-run service to `PentixServer`. One run plays `gameCount` games; each game plays one session per engine registered in the demo-engine registry, all from one `PentixGame` so every engine draws the same piece sequence.
- Expose the run over HTTP: `POST /demo-runs` with `{ "gameCount": <integer> }` (default `1`, maximum `256`, anything else rejected with `400`) returns `202` with the new run, and `GET /demo-runs/{id}` returns its status (`queued`, `running`, `completed`, `failed`) and, once it completes, its standings.
- Return the standings as one list ordered winner to loser. Each line carries the engine's display `name`, `points`, `lines`, `pieces`, and `playingTimeMs` — the sum of the milliseconds spent inside that engine's `plan` calls, accumulated across the run's games. Ties break on lines, then pieces, then shorter playing time, then engine id.
- Run the batch in the background: the request returns before the games are played, runs are executed one at a time so plan timings are not distorted by other runs, and the process yields whenever a piece is planned so HTTP keeps answering. Run state lives in server memory only; nothing is persisted and a restart forgets finished runs.
- No UI: `apps/pentix-web` is untouched, and no browser code calls the new endpoints.
- No change to engine contracts, the gameplay engine, scoring, leveling, game-over detection, storage repositories, or the session action log format. No new runtime dependencies.

## Capabilities

### New Capabilities

- `demo-playback`: the shared, timer-free demo driver in `pentix-core` — seeding a demo session, opening it at the demo's starting level, planning once per spawned piece, replaying one action and one tick in the client's order, dropping unplayed actions with a finished piece, stopping at game over, and reporting the planning time consumed.
- `server-demo-run`: the server-side batch of demo games — the `gameCount` parameter and its `1`–`256` bounds, one shared game and one session per registered engine per game, background execution with retrievable status, and the ordered standings with name, points, lines, pieces, and planning time.

### Modified Capabilities

- `pentix-server-bootstrap`: the server's endpoint list and its "functional increment stays narrow" requirement gain the demo-run endpoints and the headless, non-persisted demo batch, while the deliberate exclusions (durable history, multiplayer orchestration) stay.
- `repository-documentation`: the root documentation must describe the server demo runs as a shipped capability and must no longer imply that demo games can only be watched in the browser.

## Impact

- **Affected code**: `packages/pentix-core` (new `demo-play.ts`, barrel exports), new `apps/pentix-server/src/demo-runs.ts`, `apps/pentix-server/src/app.ts` (two routes plus the not-found endpoint list), `apps/pentix-server/src/server.ts` (run service wiring at start, optional engine/level/duration seams for tests), `apps/pentix-server/src/request.ts` (the `games` body parser), `tests/pentix-core.test.mjs`, `tests/pentix-server.test.mjs`, `README.md`, and `docs/foundation.md`.
- **Affected APIs**: additive only — new core exports (`createDemoSession`, `playDemoSession`, their option and result types) and two new HTTP endpoints. No existing endpoint, JSON shape, or status code changes.
- **Behavioural impact**: nothing changes for the browser client, for player sessions, or for stored sessions. Demo runs are read-only with respect to retained users, games, and sessions: a run creates its own in-memory games and sessions and never touches the repositories.
- **Affected teams/areas**: `pentix-server` and `pentix-core` owners, plus whoever tunes or adds demo engines and wants a measured comparison. The browser-client stream has no work in this change.
- **Dependencies**: none. The run reuses `createPentixGame`, `createPentixGameSession`, `gameSessionEngine`, `demoEngineRegistry`, and `createDemoEngineInput`.
- **Rollback plan**: delete `packages/pentix-core/src/demo-play.ts` and its barrel exports, delete `apps/pentix-server/src/demo-runs.ts`, remove the two routes and the service construction, revert the `games` parser, the tests, `README.md`, and `docs/foundation.md`. Because runs are in memory and no storage, contract, or client code changes, the rollback leaves no data migration and cannot affect player games or the browser client.
- **Known limitation**: runs are CPU-bound in the single Node.js process and are lost on restart. A run of `256` games takes noticeably longer than one game and blocks the event loop while an engine plays, so very large batches are a deliberate offline-style operation rather than a request-time one.
