## Why

A run of two or more games publishes one totals line per engine and nothing
else. A reader cannot tell which game produced a score, a line count, a piece
count, or a planning time. A single slow or short game hides inside the totals.
The response also carries engine ids without their names or descriptions. A
reader of a stored run must therefore join the registry to label a line.

A planning time also compares engines poorly across games of different length,
because a faster engine that placed more pieces spends more total time.

## What Changes

- Replace the snapshot's `standings` field with two sections, `engines` and
  `games`.
- `engines` holds one line per competing engine, ordered by `totalPoints`
  descending, then `totalLines`, then `totalPieces`, then shorter
  `playingTimeMs`, then `engineId`. Each line carries `engineId`, `name`,
  `totalPoints`, `totalLines`, `totalPieces`, `playingTimeMs`, and
  `playingTimePer1000PiecesMs` over every game of the run. It carries no
  `description`.
- `games` holds one entry per finished game, ordered by `index` ascending. Each
  entry carries `index` (zero-based), `id` (the UUIDv7 of the stored
  `PentixGame`), and `standings`.
- A game's `standings` lists every engine once, ordered by that game's `points`
  descending, then `lines`, then `pieces`, then shorter `playingTimeMs`, then
  `engineId`. Each row carries `engineId`, `points`, `lines`, `pieces`, and
  `playingTimeMs`. It carries no engine `name` and no rate.
- Add `playingTimePer1000PiecesMs` to the engine lines. The value is
  `playingTimeMs` multiplied by `1000`, divided by `totalPieces`, and rounded to
  three decimals. It is `null` when `totalPieces` is `0`.
- Round each game row's `playingTimeMs` to three decimals and sum the rounded
  values into the engine total. An engine line therefore equals the sum of its
  game rows. The rank rules and the tie-breaks stay unchanged.
- Grow `games` as each game ends, so its length equals `completedGameCount`.
  Report `engines` from the start, with zero statistics before the first game
  ends, so the engine order falls back to `engineId`.
- Record the `PentixGame` id of every game in the in-memory run record, so a
  game entry names the durable game and its stored session logs.

**BREAKING** (API response shape): `GET /v1/demo-runs/{id}` drops `standings`.
`engines` changes from an array of engine id strings to an array of engine
objects. A client that read `points` on an engine line now reads `totalPoints`.
A client that reads `standings` or treats `engines` as strings needs an update.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `server-demo-run`: the engine ranking and the per-game breakdown replace the
  single standings list. The snapshot fields, the game entry, the engine totals,
  and the game row change. The playing-time requirement gains the rate rule, its
  `null` case, and the rounding of each game row.
- `repository-documentation`: the demo-batch documentation names `engines`,
  `games`, the engine totals, and the time-per-1000-pieces field.

## Impact

- Affected code: `apps/pentix-server/src/demo-runs.ts` (the three result types,
  the per-game accumulation, the ranking, the rate helper) and
  `apps/pentix-server/src/api/schemas.ts` (the snapshot, engine, and game
  schemas).
- Affected APIs: `GET /v1/demo-runs/{id}` response body and the
  `DemoRunSnapshot` schema in `/openapi.json`. No path, request body, or status
  code changes.
- Affected tests: `tests/pentix-server.test.mjs`.
- Storage: no schema change and no new row. The run already creates one
  `PentixGame` per game, and a game entry only names its id.
- Browser client: `apps/pentix-web` calls no server endpoint and shows no run, so
  it is untouched.
- Documentation: `README.md`, `docs/foundation.md`, and `GLOSSARY.md` change.
  `docs/decisions/README.md` gains one row when this change is archived.

## Affected Teams

- Backend/server development owns the result types, the per-game accumulation,
  the ranking, the API schemas, and the server tests.
- Documentation/maintenance owns the README, foundation note, and glossary
  updates.
- Frontend/web development is unaffected, because no browser code reads a run.
- Shared-core development is unaffected: no playback, engine, or scoring rule
  changes.
- Product/gameplay design is unaffected: no rank, tie-break, or scoring rule
  changes.

## Rollback Plan

Restore `standings` and the `engines` string array in `DemoRunSnapshot`, in its
zod schema, and in `DemoRunService`. Remove `DemoRunEngineStanding`,
`DemoRunGameStanding`, and `DemoRunGameResult`, then restore the single rounding
of the summed planning time. The response returns to its current shape. The
change adds no stored field and no column, so no data repair is needed. A run
record in memory holds an extra game list, and a restart drops it.
