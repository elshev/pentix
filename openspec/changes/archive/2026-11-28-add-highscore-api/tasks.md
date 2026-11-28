## 1. Storage contract

- [x] 1.1 Add `HighScoreEntry` and `HighScoreCollection` to `apps/pentix-server/src/storage/entities.ts`, with the fields `sessionId`, `userId`, `name`, `type`, `score`, and `achievedAt`.
- [x] 1.2 Add `HighScoreRepository` to `apps/pentix-server/src/storage/repositories.ts` with `load()`, `submit(entry, tableLimit)`, and `replace(entries, tableLimit)`.
- [x] 1.3 Add `readonly highScores: HighScoreRepository` to `PentixStorage`, and export the new types from `storage/index.ts`.

## 2. SQLite storage

- [x] 2.1 Add the `high_scores` table to `SCHEMA_SQL` in `storage/sqlite.ts` with `session_id` as the primary key and the columns `user_id`, `name`, `user_type`, `score`, and `achieved_at`.
- [x] 2.2 Add the `high_scores_rank` index on `(user_type, score DESC, achieved_at ASC, session_id ASC)`, so an existing file gains the index on open.
- [x] 2.3 Add the row decoder for the user type, the integer score, and the date string. A bad value throws `StorageError` with the row id.
- [x] 2.4 Implement `load()` with one `SELECT` in the table order.
- [x] 2.5 Implement `submit()` as one transaction: upsert by `session_id`, then delete the rows of that type beyond `tableLimit` in the table order.
- [x] 2.6 Implement `replace()` as one transaction: delete every row, insert the supplied rows, and delete the overflow per type.
- [x] 2.7 Test that a new file holds the table, that an old file gains it on open, and that a repeated open changes nothing.

## 3. In-memory storage

- [x] 3.1 Add the in-memory `HighScoreRepository` to `storage/memory.ts` over a `Map` keyed by session id.
- [x] 3.2 Sort each type by score, date, then session id on `submit` and `replace`, and drop the rows beyond `tableLimit`.
- [x] 3.3 Add the repository to the object that `createInMemoryStorage` returns.

## 4. High-score service

- [x] 4.1 Add `apps/pentix-server/src/high-scores.ts` with `HIGH_SCORE_TABLE_SIZE = 1000`, `HighScoreService`, `HighScoreSubmission`, and the view type that carries `name`, `score`, and `achievedAt`.
- [x] 4.2 Implement `load()` to read the repository once, split the rows by type, order them, and keep the cache.
- [x] 4.3 Implement `submit()` to stamp `achievedAt` with the injected clock, write through the repository, and then update the cache.
- [x] 4.4 Implement `list(type)` to return a frozen copy of one cached list.
- [x] 4.5 Implement `backfill(sessions, userOf)` to run only when the cache is empty and to keep `game-over` sessions.
- [x] 4.6 Derive each backfilled date from a UUIDv7 session id, skip every other session, and write the cache through one `replace` call.
- [x] 4.7 Add the UUIDv7 timestamp helper and test it with a known id and with a non-UUIDv7 id.

## 5. Server wiring

- [x] 5.1 Add `highScoreClock?: () => Date` to `PentixServerContext`.
- [x] 5.2 Create the service in `createPentixServer`, load it before `PentixGameLifecycle.load()`, and pass it to the lifecycle and to `DemoRunService`.
- [x] 5.3 Record a finished session in `PentixGameLifecycle.persistAction` after the session log and game writes succeed, and in `advanceSession` when that request ends the session.
- [x] 5.4 Resolve the user name and type from the lifecycle user map, and skip a session whose user is missing.
- [x] 5.5 Record every finished demo session in `DemoRunService.playGame` after `storage.sessions.create`.
- [x] 5.6 Call `backfill` from `PentixGameLifecycle.load()` after the replay when the cache is empty.
- [x] 5.7 Test that a finishing human tick adds one human row and that an unfinished session adds none. Test that a submission failure answers `500` while the log stays stored.
- [x] 5.8 Test that a demo run adds one AI row per engine session, and that a submission failure reports the run as `failed`.
## 6. API

- [x] 6.1 Add `HighScoreQuerySchema` to `api/schemas.ts` with the required `type` query parameter, the message `High score type must be one of: ai, human.`, and the OpenAPI `param` metadata.
- [x] 6.2 Add `HighScoreEntrySchema` and `HighScoreListSchema` with the `name`, `score`, and `achievedAt` fields and the `type` and `scores` response fields.
- [x] 6.3 Add the `GET /v1/high-scores` route to `api/routes.ts` with the tag `High scores`, one summary, the `200` and `400` responses, and a handler that reads `highScores.list(type)`.
- [x] 6.4 Append the route to `PENTIX_ROUTE_CONFIGS`, so the `404` fallback and the OpenAPI document list it without another edit.
- [x] 6.5 Pass the high-score service through `createPentixApp` and `buildPentixRoutes`.
- [x] 6.6 Mention high scores in the `info.description` of `api/docs.ts`.
- [x] 6.7 Test `200` for both types and the empty list. Test the `400` cases (missing, other, and repeated `type`), the JSON content type, and the unchanged state after a read.
- [x] 6.8 Extend the OpenAPI contract test, so `GET /v1/high-scores` matches its schema and the route set equality still holds.

## 7. Backfill and cache tests

- [x] 7.1 Test that an empty table loads rows from stored finished sessions with the UUIDv7 date.
- [x] 7.2 Test that a non-empty table is not rewritten and that `replace` is not called.
- [x] 7.3 Test that a non-UUIDv7 session id and an `active` session are skipped.
- [x] 7.4 Test that a read performs no repository call, and that a submission changes the next read.
- [x] 7.5 Test that a failed submission leaves the cache unchanged.
- [x] 7.6 Test the table order, the 1000-row cap, the tie-break, and the SQLite reopen with 1500 submitted rows.

## 8. Documentation and checks

- [x] 8.1 Update `README.md` with the high-score endpoint, its filter, and the table limit.
- [x] 8.2 Update `docs/foundation.md` with the table, the cache, the submission paths, and the backfill rule.
- [x] 8.3 Update `GLOSSARY.md` with a `High score` entry, add `HighScoreRepository` to the repository entry, and state four repositories in the `PentixStorage` entry.
- [x] 8.4 Run `openspec validate add-highscore-api --type change --strict`.
- [x] 8.5 Run `python .cline/skills/asd-ste100/scripts/ste-lint.py` on every changed spec, `README.md`, `docs/foundation.md`, and `GLOSSARY.md`, and fix every new violation.
- [x] 8.6 Run the core build, the server build, the server tests, and the lint command, and fix every failure.
- [x] 8.7 Start the server on a temporary data file and finish one human session. Read both high-score tables and compare the rows and the dates with the session.

