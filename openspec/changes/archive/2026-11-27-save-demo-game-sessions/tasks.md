## 1. Shared user type

- [x] 1.1 In `packages/pentix-core/src/user.ts`, add `export type UserType = 'human' | 'ai'`. Add the required `type: UserType` to `User` and the optional `type?: UserType` and `engineId?: DemoEngineId` to `CreateUserOptions`.
- [x] 1.2 In `createUser`, default `type` to `'human'`, trim and validate a supplied `engineId`, and return both fields on the frozen user. Reject an empty or whitespace-only `engineId` with `"User engineId must not be empty."`.
- [x] 1.3 In `packages/pentix-core/src/index.ts`, export `UserType` beside `User` and `CreateUserOptions`.
- [x] 1.4 In `tests/pentix-core.test.mjs`, cover the default `human` type, an `ai` user with `engineId`, and the empty-`engineId` rejection. Keep the existing id and name cases.

## 2. Session log opening state

- [x] 2.1 In `packages/pentix-core/src/session-log.ts`, add the optional `level?: number` and `seedColumn?: number` fields to `SessionActionLog`. Document that a demo log carries both and a human log carries neither.
- [x] 2.2 In `replayPentixGameSession`, apply `log.level` to `session.statistics.level` and apply `withSeededDemoMino(session, log.seedColumn)` before the action loop. Leave an absent field at its current value.
- [x] 2.3 In `tests/pentix-core.test.mjs`, add a replay case with `level` `9` and `seedColumn` `7`, and a case that shows an absent pair replays at level `1` without a seed.

## 3. Playback log recording

- [x] 3.1 In `packages/pentix-core/src/demo-play.ts`, add the recorded `pieces`, the opening `level`, and the opening `seedColumn` to `DemoPlayback`. Set `level` from `options.session.statistics.level`, and set `seedColumn` from the single occupied cell on row `height - 2`.
- [x] 3.2 Add a private helper that appends one code under the active piece's numeric id. Call it for every applied action and for every applied tick. Do not call it for the post-drop code that a settling hard drop discards, and do not append after the session ends.
- [x] 3.3 Add `log: SessionActionLog` to `DemoPlayResult`, and return it from `playDemoSession`.
- [x] 3.4 In `packages/pentix-core/src/index.ts`, keep `DemoPlayback` and `DemoPlayResult` exported. Add a new export only when a new public helper needs one.
- [x] 3.5 In `tests/pentix-core.test.mjs`, cover the recorded `T`, `L`, `R`, `C`, `A`, and `H` codes, the discarded settling code, and `level` plus `seedColumn`. Assert that the returned log replays to the returned session.

## 4. Storage columns and migration

- [x] 4.1 In `apps/pentix-server/src/storage/sqlite.ts`, add `type TEXT NOT NULL DEFAULT 'human'` and `engine_id TEXT` to `CREATE TABLE users`, and add `level INTEGER` and `seed_column INTEGER` to `CREATE TABLE game_sessions`.
- [x] 4.2 Add a migration step that reads `PRAGMA table_info` for both tables and runs one `ALTER TABLE ... ADD COLUMN` per missing column. Keep the step idempotent.
- [x] 4.3 Extend `UserRow` and the user select and upsert statements with `type` and `engine_id`. In `readUserRow`, reject an unknown type with a `StorageError` and keep a missing engine id `undefined`.
- [x] 4.4 Extend `GameSessionRow`, `readSessionLog`, and `writeSessionLog` with `level` and `seed_column`.
- [x] 4.5 In `tests/pentix-server.test.mjs`, round-trip an AI user and a demo log through SQLite. Add a case that opens a hand-built old-schema file, and a case that reopens the migrated file.

## 5. AI user seeding and API

- [x] 5.1 In `apps/pentix-server/src/server.ts`, pass the server's demo engine list into `PentixGameLifecycle`. Default that list to `demoEngineRegistry.list()`.
- [x] 5.2 In `PentixGameLifecycle.load()`, seed one AI user per engine after the retained users load. Reuse a user whose `engineId` matches, otherwise create `createUser({ id: this.createId(), name: engine.name, type: 'ai', engineId: engine.id })` and write it through `storage.users.create`.
- [x] 5.3 Add `getEngineUserId(engineId: string): string | undefined` and make `createUser` always build a `human` user. Keep the case-insensitive duplicate-name rule over all users.
- [x] 5.4 In `apps/pentix-server/src/api/schemas.ts`, add `type: z.enum(['human', 'ai'])` and `engineId: z.string().regex(...).optional()` to `UserSchema`. Leave `CreateUserRequestSchema` unchanged.
- [x] 5.5 In `createPentixServer`, pass the storage and an engine-user resolver into `new DemoRunService(...)`.
- [x] 5.6 In `tests/pentix-server.test.mjs`, cover the nine seeded rows, the UUIDv7 ids, the restart reuse, a one-engine context, `POST /v1/users` with `type` `ai`, and `GET /v1/users/{id}` for an AI user.

## 6. Demo run persistence

- [x] 6.1 In `apps/pentix-server/src/demo-runs.ts`, add `storage: PentixStorage` and `resolveEngineUserId: (engineId: string) => string` to `DemoRunServiceOptions`. Remove `DEMO_RUN_USER_ID`.
- [x] 6.2 In `playGame`, store the game through `storage.games.create` before the first session. Pass the engine's AI user id to `createDemoSession`.
- [x] 6.3 When an engine's playback finishes, save the merged game through `storage.games.save` when its piece list grew, then create the playback log through `storage.sessions.create`.
- [x] 6.4 Keep the existing catch, so a rejected storage write marks the run `failed` and publishes no standings.
- [x] 6.5 In `tests/pentix-server.test.mjs`, assert one game row and one log per engine, the AI `userId`, one write per session, the `T` codes, and the storage-failure status. Assert that a restart rebuilds each session and that a completed run leaves every human row unchanged.
- [x] 6.6 Add an in-memory case that completes a run and shows no row after a restart.

## 7. Update existing contracts in tests

- [x] 7.1 In `tests/pentix-server.test.mjs`, change `GET /users lists retained users` to expect the seeded AI rows on an empty server.
- [x] 7.2 Change the single-user list assertion to select the created human user by `type` and `id`, so the AI rows do not break it.
- [x] 7.3 Replace `a demo run leaves retained state and storage untouched` with the human-state-untouched case from 6.5.
- [x] 7.4 Run the suites and fix every `UserSchema` or `createUser` expectation that the new fields change.

## 8. Documentation

- [x] 8.1 In `README.md`, state the user `type` values, the AI user per demo engine, the durable demo sessions, and the in-memory run record. Name `PENTIX_DATA_FILE`.
- [x] 8.2 In `docs/foundation.md`, describe the AI user seeding, the four new columns, the migration, the recorded playback log, and the demo-run writes.
- [x] 8.3 In `GLOSSARY.md`, add `User type`, `AI user`, and `Demo session log`. Update `User`, `Session action log`, and `Demo run` for the new fields and the durable sessions.
- [x] 8.4 When `openspec archive` moves this change, add one row to `docs/decisions/README.md` with the date, the design link, the scope, and the status.

## 9. Verification

- [x] 9.1 Run `npm run build`. The core, server, and web builds must pass.
- [x] 9.2 Run `npm test`. Both suites must pass.
- [x] 9.3 Run `npm run lint`. The command must report no error.
- [x] 9.4 Run `openspec validate save-demo-game-sessions --strict`.
- [x] 9.5 Run `python .cline/skills/asd-ste100/scripts/ste-lint.py` on every changed spec and document. The output must show no hard violation.
- [x] 9.6 Start the server against `PENTIX_DATA_FILE` and start a `POST /v1/demo-runs` run of `1` game. The store must show the new game row and nine session rows. The restarted server must load them.
