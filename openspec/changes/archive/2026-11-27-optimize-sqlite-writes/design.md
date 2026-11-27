## Context

`apps/pentix-server/src/storage/sqlite.ts` opens the data file through
`node:sqlite`, runs an integrity check, creates the schema, and migrates four
missing columns. The store uses the SQLite defaults: a rollback journal and
`synchronous=FULL`.

`PentixGameLifecycle` writes a session log on every gameplay action. A demo run
writes each finished session once, plus a game update when the shared piece list
grows. The write count is small, but each write pays a full commit.

A probe with nine stub engines and one game measured this pattern:

```json
{"games.create":1,"games.save":1,"sessions.create":9}
```

It took `144` ms in total and about `105` ms in storage, or about `9` to `10` ms
per commit. The cost is the fsync, not the row size.

## Goals / Non-Goals

**Goals:**

- Cut the per-commit wait for every SQLite write, for demo runs and human
  gameplay alike.
- Keep the schema, the repository contracts, the API, and the stored row shapes
  unchanged.
- Make the setting explicit and checked at startup, so an operator sees a clear
  error when the file cannot use it.
- State the durability trade-off in the docs.

**Non-Goals:**

- Transaction batching, per-game write grouping, or a change to when a demo
  session is stored.
- Piece-only row updates, log compression, or a schema change.
- A benchmark tool in the repository, or a CI performance gate.
- Any change to in-memory storage.

## Decisions

### 1. Write-ahead logging instead of the rollback journal

`PRAGMA journal_mode = WAL` pays one fsync per checkpoint instead of one per
commit. A reader no longer blocks a writer. The alternative, staying with the
rollback journal, keeps the current per-commit cost, which the probe measured at
about `9` ms.

The mode lives in the database header. Every open keeps the file in WAL mode.

### 2. `synchronous=NORMAL` instead of `FULL`

`PRAGMA synchronous = NORMAL` stops the per-commit fsync that `FULL` performs.
SQLite still writes the WAL record before it reports the commit, and it syncs at
a checkpoint and at close.

`FULL` with WAL would still fsync the WAL on every commit, so it would keep most
of the cost. `OFF` would drop consistency guarantees, so it is not acceptable.

The accepted consequence: an OS crash or power loss can lose the most recent
commits. The database remains consistent, and the last checkpoint survives.

### 3. Apply after the integrity check, before schema work

`openDatabase` performs:

1. Create the parent directory.
2. Open the file.
3. Run `PRAGMA integrity_check`.
4. Set `PRAGMA journal_mode = WAL` and `PRAGMA synchronous = NORMAL`.
5. Read both values back.
6. Run `SCHEMA_SQL` and the column migration.

The order keeps the corrupt-file error the same. A corrupt file fails before any
journal change. The read-back catches a read-only file and a filesystem that
cannot host WAL. The returned store exposes `pragmas()` for the test and for an
operator who checks a live file.

### 4. Fail startup when the setting does not apply

When `PRAGMA journal_mode` does not return `wal`, or `synchronous` does not
return `1`, the store throws a `StorageError` that names the file and the
returned value.

Alternative: fall back to the rollback journal and continue. Rejected, because
the change exists for the speed, and a silent fallback hides a deployment
problem. The error message states the data file, so an operator can fix the
filesystem or move the file.

### 5. Keep the write points and measure before batching

The demo write points stay: one game insert, a game update when the sequence
grows, and one session insert per engine at `game-over`. The probe runs again
after the pragma change. Batching moves to a later change only when the new
numbers still show a problem.

Alternatives recorded for later:

- One transaction per game for its session inserts.
- A single transaction for a game update and its session insert.
- A `piece_ids`-only update for a game.

### 6. Sidecar files are part of the store

WAL creates `pentix.db-wal` and `pentix.db-shm` next to the data file. The store
SHALL accept them, and `close()` SHALL release the handle. The files can remain
on disk after a close. Cleanup code removes the whole data directory, not one
file.

## Risks / Trade-offs

- Power loss can drop the latest commits →  The docs state the window. A human
  session replays to its last durable action. A demo run loses the sessions that
  did not commit and reports no change to its in-memory record.
- A network share or read-only file cannot host WAL →  Startup fails with a
  `StorageError` that names the file. The operator moves the file to a local
  disk or fixes its permissions.
- The WAL file can grow during a long run →  SQLite checkpoints automatically at
  the default threshold. This change uses the default and adds no tuning.
- Benchmark numbers vary per machine →  The task runs the probe three times and
  reports the median, with the same stub engines and seed.
- A rollback leaves the file in WAL mode →  The rollback plan resets
  `journal_mode = DELETE` when the old behavior is required.

## Migration Plan

1. Rebuild core and server.
2. Restart `PentixServer` against the existing `PENTIX_DATA_FILE`. The first open
   converts the file to WAL mode. No schema change and no data backfill occur.
3. Observe that `PRAGMA journal_mode` reports `wal` and `PRAGMA synchronous` reports
   `1` on the open file.
4. Run one demo run and inspect the game row and the session rows.
5. Roll back with the steps in `proposal.md`. Reset the journal mode only when the
   old behavior is required.

## Open Questions

- Does product accept the loss of the last few action-log commits on a power
  loss, in exchange for the faster interactive writes?
- Do large demo batches need transaction batching after this change? The
  post-change probe answers it.
