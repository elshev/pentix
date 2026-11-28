## Why

A high-score row is a dead end for the client. It reports a name, a score, and a
date. It hides the session id, the game, and the action log behind that row.
The server already stores every finished session as a replayable log. It also
stores every demo game as a `PentixGame`. No read path exposes those records.
The planned high-score table cannot expand a row. It cannot show the best
sessions of that game. It also cannot offer a replay of the game or a new human
game on the same piece sequence.

## What Changes

- Add `sessionId` to every high-score entry in `GET /v1/high-scores`, so a
  client can request the row details. The existing `name`, `score`, and
  `achievedAt` fields stay unchanged.
- Add read-only `GET /v1/high-scores/{sessionId}`. The response carries the
  row values, the session `statistics` values (`score`, `level`,
  `clearedLines`, `blocks`, and `actions`, without `pieceCounts`), a compact
  stored game (`id`, `name`, `width`, `height`, one `0`/`1` `board` line, and a
  base64 `pieceIds` string), and `bestSessions`.
- `bestSessions` lists the best finished sessions of the same game. Each entry
  carries `sessionId`, `userId`, `name`, `engineId` when the user has one,
  `type`, `level` and `seedColumn` when the log has them, `score`,
  `clearedLines`, `blocks`, `achievedAt`, and `actions`. `actions[i]` applies to
  `pieceIds[i]`, so no piece id repeats. An AI entry omits every `T` code, and a
  human entry keeps its recorded ticks. The list SHALL hold at most
  `bestSessionCount` entries, ordered by score descending, then achievement date
  ascending, then session id ascending.
- Add the optional `bestSessionCount` query parameter. The default is `9`, the
  value matches one session per built-in engine, and the accepted range is `1`
  to `32`. An invalid value SHALL return `400 Bad Request`.
- Reuse `POST /v1/game-sessions` with the returned `gameId` for the human replay
  of the game. This change adds no write endpoint and no stored state.
- Document the new operation and the changed entry schema in the OpenAPI
  document and the API reference. Update `README.md` and `docs/foundation.md`
  with the detail read path.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `high-scores`: The entry schema gains `sessionId`. One requirement adds the
  detail read of one row, its game, its statistics, and its best sessions.
- `session-replay`: One requirement states that a client can read a stored
  session log for replay through the high-score detail. It also states that a
  human game on the same piece sequence uses the stored `PentixGame`.
- `api-reference`: The document lists the new `GET /v1/high-scores/{sessionId}`
  operation and documents the changed high-score entry schema and the
  `bestSessionCount` parameter.

## Impact

- `apps/pentix-server/src/high-scores.ts`: the view type gains `sessionId`, and
  the service gains a row lookup by session id.
- `apps/pentix-server/src/server.ts`: `PentixGameLifecycle` gains read methods
  for one session log and for the sessions of one game. The lifecycle already
  replays every stored session during `load`, so a detail read uses memory and
  stores nothing.
- `apps/pentix-server/src/api/schemas.ts` and `src/api/routes.ts`: new schemas,
  the new route, and the handler.
- `apps/pentix-server/src/storage/`: no schema change, no migration, and no new
  repository method. The game and session repositories already hold the needed
  rows.
- `packages/pentix-core`: no change. The detail read reuses `PentixGame`,
  `PentixGameSession`, and `SessionActionLog`.
- `apps/pentix-web`: no change in this proposal. The planned high-score table
  consumes `sessionId` and the detail endpoint later.
- Tests: server contract tests for the new route, the list entry, the ordering,
  the limit, the error cases, and the read-only behavior. The OpenAPI route set
  test gains the new operation.
- Dependencies: none.

## Rollback Plan

Revert the server source files, the tests, and the three spec deltas. The change
is additive and stores nothing new, so a rollback loses no data and needs no
migration. The existing high-score list keeps working because `sessionId` is an
extra field that an older client ignores.

## Affected Teams

- Server API owner: implements the route, the schemas, and the lifecycle read
  methods.
- Browser client owner: consumes `sessionId`, the detail endpoint, and the
  `gameId` for the human replay.
- QA owner: extends the contract tests and the OpenAPI route set check.
- Documentation owner: updates the API reference, `README.md`, and
  `docs/foundation.md`.
