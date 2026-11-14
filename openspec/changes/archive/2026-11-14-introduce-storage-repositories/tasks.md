## 1. Repository interfaces

- [x] 1.1 Define `UserRepository`, `GameRepository`, and `GameSessionRepository` interfaces in `apps/pentix-server/src/storage/`
- [x] 1.2 Define entity save/load types (collections) used by the interfaces

## 2. Implementations

- [x] 2.1 Implement an in-memory repository set with the same interfaces (no-op load, in-object save)
- [x] 2.2 Implement a SQLite repository set (separate users/games/sessions tables, game sequence as one field)
- [x] 2.3 Choose the SQLite driver (`node:sqlite` preferred, `better-sqlite3` fallback) and add the dependency if needed

## 3. Lifecycle wiring

- [x] 3.1 Add a `storage`/repository injection point on `PentixServerContext` (default to in-memory)
- [x] 3.2 Load users/games/sessions from repositories on lifecycle construction
- [x] 3.3 Persist through repositories after each mutation (`createUser`, `createGame`, `createSession`, `advanceSession`, `move`, `rotate`, `tick`, `drop`)
- [x] 3.4 Fail fast at startup with a clear error on a corrupt database file

## 4. Entry point and configuration

- [x] 4.1 Configure `main.ts` to construct the SQLite repositories from a data path (e.g. `PENTIX_DATA_FILE`)
- [x] 4.2 Keep `startPentixServer` defaulting to in-memory repositories for deterministic tests

## 5. Tests

- [x] 5.1 Add repository round-trip tests for users, games, and sessions
- [x] 5.2 Add a restart-survival test (created user survives restart with SQLite)
- [x] 5.3 Add a missing-database-starts-empty test
- [x] 5.4 Add a corrupt-database-fails-startup test
- [x] 5.5 Run `npm test` and `npm run lint` and keep them green

## 6. Docs

- [x] 6.1 Update `README.md` (server persistence note) and `docs/foundation.md`