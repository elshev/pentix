## Why

Players and demo engines finish sessions, and the store keeps every replayable
log. No endpoint ranks those results, so a client cannot show a high-score
table, and a client that tried would replay every session. This change adds a
durable high-score table that the server maintains and serves from memory.

## What Changes

- Add a `high_scores` table with at most 1000 rows per user type, 1000 for
  `ai` and 1000 for `human`. Each row holds the session id, the user id, the
  user name, the user type, the score, and the achievement date.
- Add `GET /v1/high-scores?type=ai` and `GET /v1/high-scores?type=human`. The
  response carries `type` and `scores`, and each score entry carries `name`,
  `score`, and `achievedAt`.
- Submit one high-score row when a session reaches `game-over`, both on the
  gameplay endpoints and in a demo run. An unfinished session does not enter
  the table.
- Load the table once at startup into an in-memory cache. The endpoint reads
  that cache, so a request does not query the table.
- Rebuild the table from stored finished sessions when it is empty. The
  achievement date of such a row comes from the UUIDv7 timestamp of the
  session id.
- Extend storage with a `HighScoreRepository`, one SQLite implementation, and
  one in-memory implementation.
- Update the OpenAPI document, the API reference page, `README.md`,
  `docs/foundation.md`, and `GLOSSARY.md`.

No existing endpoint changes its request or response shape. The new route is
additive. A demo run gains high-score rows, so the row set that a run leaves
behind grows.

## Capabilities

### New Capabilities

- `high-scores`: the high-score row, its table capacity and order, its
  submission on session end, the startup cache and backfill, and the
  `GET /v1/high-scores` endpoint.

### Modified Capabilities

- `storage-repositories`: a fourth repository, the `high_scores` SQLite table
  and its index, the capacity rule, and the in-memory implementation.
- `demo-session-storage`: a finished demo session also submits its score, and a
  submission failure fails the run.
- `server-demo-run`: a run may add high-score rows for its AI users.
- `api-reference`: the documented endpoint list and the new route contract.

## Impact

- Code: new `apps/pentix-server/src/high-scores.ts`. Changed files are
  `storage/entities.ts`, `storage/repositories.ts`, `storage/memory.ts`,
  `storage/sqlite.ts`, `storage/index.ts`, `server.ts`, `demo-runs.ts`,
  `app.ts`, `api/routes.ts`, and `api/schemas.ts`.
- API: one additive `GET /v1/high-scores` route.
- Data: one new table in the existing data file. The store creates it when it
  opens the file, so an older file gains it in place. No new data file appears,
  and the backup command needs no change.
- Tests: storage round trips and capacity, the service order and backfill, the
  endpoint contract, the lifecycle and demo-run submissions, and the OpenAPI
  route set.
- Dependencies: none.

## Rollback Plan

1. Stop the server.
2. Start the previous version. It ignores the `high_scores` table, and every
   endpoint keeps its earlier behavior.
3. Keep or remove the table. To remove it, run `DROP TABLE high_scores` while
   no process uses the data file, or restore the latest backup.
4. No existing column or row changes, so gameplay, sessions, users, and demo
   runs need no migration back.

## Affected Teams

- The server and storage owners, who add the table, the repository, and the
  submission path.
- The browser client owners, who can build a high-score screen on the new
  endpoint.
- The demo-run owners, because a run now writes high-score rows and can fail on
  that write.
