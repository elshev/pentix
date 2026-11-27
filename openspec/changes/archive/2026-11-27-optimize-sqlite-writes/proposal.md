## Why

The SQLite store runs with its default rollback journal and `synchronous=FULL`.
Every write statement waits for an fsync. A probe with nine stub engines and one
game measured about `9` to `10` milliseconds per commit. The same game used
`105` milliseconds of storage for `1` game insert, `1` game update, and `9`
session inserts.

The cost comes from commit durability, not from data volume. Human gameplay
writes a session log on every action request, so the same cost sits on the
interactive path.

## What Changes

- On opening a writable SQLite file, set `PRAGMA journal_mode = WAL` and
  `PRAGMA synchronous = NORMAL`.
- Read both values back. Fail startup with a `StorageError` that names the file
  when the mode is not `wal` or the level is not `1` (`NORMAL`).
- Keep the schema, the repository interfaces, the API, and the in-memory store
  unchanged.
- Accept the `-wal` and `-shm` sidecar files that write-ahead logging creates.
  `close()` keeps releasing the database handle.
- Document the durability window. A crash or power loss can lose the most recent
  commits. The database stays consistent and never returns corrupt pages.
- Add tests for the two settings, a restart round trip, a missing file, and an
  older file that gains the mode.
- Benchmark a nine-stub-engine demo run before and after the change, and record
  the commit count and the storage time.

**Not in scope**: transaction batching, per-game write grouping, piece-only row
updates, and any change to when a demo session is stored. The design records
those as later options.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `storage-repositories`: the SQLite implementation enables write-ahead logging
  with normal synchronization, verifies both settings at startup, and states the
  durability window that this choice accepts.

## Impact

- Affected code: `apps/pentix-server/src/storage/sqlite.ts` (pragma setup and
  verification) and `tests/pentix-server.test.mjs` (settings, restart, and
  migration cases).
- Affected APIs: none. Paths, bodies, status codes, and response shapes stay the
  same.
- Dependencies: none. `node:sqlite` already supplies the pragmas.
- Storage: the database file moves to write-ahead logging, and the store may
  create `pentix.db-wal` and `pentix.db-shm` next to it. The file header keeps
  the WAL mode, so a rollback must reset the mode explicitly or accept it.
- Affected docs: `README.md` and `docs/foundation.md` state the settings and the
  durability window.
- Browser client: unaffected, because it calls no server endpoint.

## Affected Teams

- Backend/server development owns the pragma setup, the startup check, and the
  server tests.
- Storage/maintenance owns the durability trade-off and the rollback note.
- Documentation/maintenance owns the README and foundation note updates.
- Frontend/web development and product/gameplay design are unaffected.

## Rollback Plan

Remove the two `PRAGMA` calls and the read-back check, then rebuild and restart.
The data stays intact. The file header keeps `journal_mode=WAL`, so a rollback
that must return to the old journal runs `PRAGMA journal_mode = DELETE` on the
file once. Remove the `-wal` and `-shm` files only after the store closes. Revert
the tests and the two documentation paragraphs. No data repair and no schema
change are required.
