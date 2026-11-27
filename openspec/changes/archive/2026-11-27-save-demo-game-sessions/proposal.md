## Why

A demo run plays every game to game over and then forgets it. The database
already holds human sessions as action logs, yet no demo play reaches it.
The nine engines therefore leave no durable record of what they played, and the
`users` table cannot tell an AI player from a human player.

## What Changes

- Add a user type to the shared `User`: `type` is `human` or `ai`, and `type`
  defaults to `human`. An AI user also carries the demo engine `engineId` that
  owns it.
- At server startup, create one AI user for every registered demo engine. Reuse
  the retained row on restart by looking it up through `engineId`. Name the row
  after the engine name.
- Store the two new `users` columns, `type` and `engine_id`. Store two new
  `game_sessions` columns, `level` and `seed_column`. Migrate an older database
  in place with additive `ALTER TABLE` statements. Existing rows become
  `human`.
- Record the action log during demo playback. The playback appends every
  applied code, including `T` for a tick, under the piece that was active. An
  action the settling drop discards is not recorded.
- Return the recorded log from `playDemoSession`, so a headless caller holds
  the same durable representation that a human session has.
- Add optional `level` and `seedColumn` to `SessionActionLog`. A demo log sets
  both, so a replay reproduces the seeded opening mino and the starting level.
  A human log omits both, and its replay is unchanged.
- Store one `PentixGame` per demo-run game and one session log per engine when
  that engine's session reaches `game-over`. Attribute the log to the engine's
  AI user id. Remove the synthetic `'demo'` user id.
- Keep the run record itself, its status, and its standings in server memory.
  Only the game and the session logs are durable.
- Keep `PENTIX_DATA_FILE` (default `data/pentix.db`) as the only data-path
  setting. Demo persistence uses the storage that the server already
  configures. No new environment variable appears.
- Replace the `server-demo-run` rule that runs never touch storage. The new
  rule states that a run's own record stays in memory. Its games and session
  logs are retained.

**BREAKING** (API response shape): `GET /v1/users` and `GET /v1/users/{id}` now
return `type` on every user, plus `engineId` on an AI user. The list also
contains the AI users of the registered demo engines, so a client that expects
only human users must filter on `type`.

## Capabilities

### New Capabilities

- `demo-session-storage`: the AI user row that every demo engine owns. It also
  covers the durable game and session log that each finished demo session
  writes. It covers the exact replay of a stored demo log after a restart. It
  also covers the rule that the existing storage setting and repositories carry
  that record.

### Modified Capabilities

- `user-management`: `User` gains `type` and an optional `engineId`, the user
  JSON exposes both, `POST /v1/users` creates a `human` user, and the list and
  fetch responses include the seeded AI users.
- `storage-repositories`: the `users` table stores the user type and the engine
  binding, and the `game_sessions` table stores the opening level and the demo
  seed column. An older database file migrates in place.
- `session-replay`: a session log can carry the opening `level` and the demo
  `seedColumn`, and replay applies both before the recorded actions.
- `demo-playback`: the playback records the action log that it applies, and
  `playDemoSession` returns that log with the finished session.
- `server-demo-run`: a finished demo session is persisted for every engine, the
  synthetic `'demo'` user id is gone, and the in-memory-only rule now covers
  only the run record.
- `repository-documentation`: the documentation states that demo session logs
  are stored, names the AI users, and stops describing demo runs as
  non-persisted.

## Impact

- Affected code: `packages/pentix-core/src/user.ts` (user type and engine
  binding), `packages/pentix-core/src/session-log.ts` (optional log fields and
  replay), `packages/pentix-core/src/demo-play.ts` (recorded log), and
  `packages/pentix-core/src/index.ts` (exports).
- Affected server code:
  `apps/pentix-server/src/storage/{entities,repositories,memory,sqlite}.ts`
  (new fields, columns, and migration), `apps/pentix-server/src/server.ts` (AI
  user seeding and demo engine list), `apps/pentix-server/src/demo-runs.ts`
  (game and session persistence), and `apps/pentix-server/src/api/schemas.ts`
  (user JSON fields).
- Affected tests: `tests/pentix-core.test.mjs` and
  `tests/pentix-server.test.mjs`.
- Affected APIs: no path, request body, or status code changes. The user JSON
  gains `type` and `engineId`, and the user list gains AI users. Demo-run
  responses keep their shape.
- Dependencies: none. `uuid` already supplies the UUIDv7 ids that the AI users
  use.
- Storage: two additive columns on `users` and two on `game_sessions`. Existing
  user, game, and session rows stay readable. Demo games and demo session logs
  become new rows.
- Browser client: `apps/pentix-web` does not call `PentixServer`, so the
  browser attract demo and its nine rail boards stay local and unpersisted.
  Wiring them is a separate change.
- Documentation: `README.md`, `docs/foundation.md`, and `GLOSSARY.md` change.
  `docs/decisions/README.md` gains one row when this change is archived.

## Affected Teams

- Backend/server development owns the AI user seeding, the demo-run
  persistence, the storage columns and migration, and the server tests.
- Shared-core development owns the user type, the log fields, the playback
  recording, and the core tests.
- Documentation/maintenance owns the README, foundation note, and glossary
  updates.
- Frontend/web development is unaffected, because the browser client still
  calls no server endpoint.
- Product/gameplay design is unaffected: no gameplay, scoring, engine, or
  standings rule changes.

## Rollback Plan

Stop seeding AI users in `PentixGameLifecycle`, remove the `type` and
`engineId` fields from `User`, the API schema, and the user repository. Remove
the session-log `level` and `seedColumn` fields with their replay handling. Drop
the playback log recording and restore the old `playDemoSession` result. Remove
the game and session writes from `DemoRunService`, restore `DEMO_RUN_USER_ID`,
and restore the storage-free guarantee in `server-demo-run`. The four added
columns are additive, so a rollback leaves them unread and existing data valid.
No data repair is required. The browser client needs no rollback.
