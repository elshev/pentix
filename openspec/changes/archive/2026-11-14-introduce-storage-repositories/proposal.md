## Why

`PentixServer` keeps users, games, and sessions only in process memory, cleared on restart. The data will eventually live in a relational database (PostgreSQL is the likely target), so we need a storage layer now that is independent of any specific engine and that keeps each entity separate.

## What Changes

- Introduce DB-engine-agnostic repository interfaces for users, games, and sessions.
- Store users, games, and sessions separately; a game's piece sequence is stored as a single field (ordered list of piece IDs).
- Provide a SQLite-backed implementation now and an in-memory implementation for tests.
- Keep all REST endpoints unchanged: they depend only on the repository interfaces.
- Wire the lifecycle to read from and write to the repositories, loading retained state on startup.

## Capabilities

### New Capabilities

- `storage-repositories`: engine-agnostic persistence for users, games, and sessions with SQLite + in-memory implementations and startup reload.

### Modified Capabilities

- `pentix-server-bootstrap`: the server's "no restart-safe persistence" boundary is replaced by repository-backed durability.

## Impact

- Code: new `apps/pentix-server/src/storage/*` (interfaces + SQLite + memory), `server.ts` lifecycle rewiring, `main.ts` startup load.
- Dependencies: a SQLite driver (prefer a pure-JS option to avoid native builds; the interfaces keep the engine swappable).
- Tests: restart-survival and repository round-trip tests.
- Affected teams: single-repo; `pentix-server` and its tests only.
- Rollback plan: run with the in-memory repository (selected via configuration) to restore prior non-durable behavior; no migration needed.