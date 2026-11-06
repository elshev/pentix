## Context

`packages/pentix-core/src/engine.ts` exports four free functions (`moveActivePiece`, `rotateActivePiece`, `tickSession`, `dropSession`) plus the `move`/`rotate` types, all operating on a `PentixGameSession`. The package's `index.ts` re-exports these to the server. `apps/pentix-server/src/http.ts` bundles the generic `HttpError`/`HttpStatus`/`throwHttpErrorIf` primitives next to UUID/JSON guards (`isUuidV7`, `checkUuid`, `isJsonRecord`) and Pentix-specific request parsers (`readOptionalName`, `readOptionalGameId`, `readDirection`, `readRequiredName`, `readRequiredUserId`). The server's `app.ts` imports the parsers, and `server.ts` imports the engine functions and `HttpError`/`HttpStatus`.

This is a pure naming and encapsulation refactor: no endpoint, payload, status code, gameplay rule, or scoring value changes. The server stays strict TypeScript (`erasableSyntaxOnly`, `noUnusedLocals`), builds to `dist/` with `tsc -p ...`, and is verified by `npm run build`, `npm test`, and `npm run lint`.

## Goals / Non-Goals

**Goals:**

- Keep `http.ts` limited to Pentix-agnostic HTTP primitives (`HttpError`, `HttpStatus`, `throwHttpErrorIf`).
- Move the request-body/validation helpers into a dedicated `request.ts` so route parsing has one home.
- Encapsulate the active-piece gameplay operations under a `GameSessionEngine` with the shorter method names `move`, `rotate`, `tick`, `drop`.
- Preserve every behavior, status code, payload, and the `startPentixServer` contract.

**Non-Goals:**

- No new or changed endpoints, payloads, or status codes.
- No changes to gameplay rules, scoring, rotation kicks, or the `'game-over'` semantics.
- No new dependencies.
- No change to `session.ts`, `board.ts`, `piece.ts`, `catalog.ts`, `game.ts`, or `user.ts`.

## Decisions

### 1. Rename `engine.ts` to `session-engine.ts` and hold a `GameSessionEngine` class
The free functions are grouped into a `GameSessionEngine` class that is instantiated with no state (all operations are pure). Renamed methods keep the session context in the class name rather than in every method:

- `moveActivePiece` → `move`
- `rotateActivePiece` → `rotate`
- `tickSession` → `tick`
- `dropSession` → `drop`

The `MoveDirection` and `RotateDirection` types move with the class. `index.ts` exports the class and a shared `gameSessionEngine` instance so callers don't have to construct empty objects repeatedly.

Alternative considered: keep a plain module with renamed free functions (`move`, `rotate`, `tick`, `drop`). Rejected because the user asked for something that *encapsulates* game-session work, and a class gives the operations a single cohesive identity that future session concerns (e.g., configurable rules, hooks) can attach to.

Alternative considered: make the methods static so no instance is needed. Rejected because instance methods read more naturally at call sites (`gameSessionEngine.tick(...)`) and leave the door open for future per-engine configuration state.

### 2. Split `http.ts` into generic HTTP primitives plus a request module
`http.ts` keeps only `HttpError`, `HttpStatus`, and `throwHttpErrorIf`, and loses its `uuid` import. A new `apps/pentix-server/src/request.ts` owns the JSON and validation helpers — `isJsonRecord`, `isUuidV7`, `checkUuid`, `readOptionalName`, `readOptionalGameId`, `readDirection`, `readRequiredName`, `readRequiredUserId` — importing `HttpError`/`HttpStatus` from `http.js` and `validate`/`version` from `uuid`. `app.ts` switches its parser imports from `./http.js` to `./request.js` and keeps `HttpError`/`HttpStatus` from `./http.js`.

Alternative considered: put the parsers directly in `app.ts`. Rejected because that would bloat the route table and couple routing to validation, which the existing split intentionally avoids.

Alternative considered: put the UUID guard in its own shared core module. Rejected because `checkUuid` throws an `HttpError` carrying a `400` status, which is a server-transport concern rather than a core primitive.

### 3. Align the life-cycle method names with the engine
`PentixGameLifecycle`'s `moveSession`/`rotateSession`/`tickSession`/`dropSession` become `move`/`rotate`/`tick`/`drop`, matching `GameSessionEngine`. This is internal to `server.ts`/`app.ts` (the lifecycle is not part of the documented HTTP contract) and removes the same redundant `Session` suffix the engine had.

```mermaid
sequenceDiagram
    participant Client
    participant Hono as Hono (app.ts)
    participant LC as PentixGameLifecycle
    participant E as GameSessionEngine

    Client->>Hono: POST /game-sessions/:id/tick
    Hono->>Hono: checkUuid(id) from request.ts
    Hono->>LC: tick(sessionId)
    LC->>LC: resolveSession(sessionId)
    LC->>E: tick(session, game)
    E-->>LC: AdvancePentixGameSessionResult
    LC-->>Hono: updated PentixGameSession
    Hono-->>Client: 200 application/json; charset=utf-8
```

## Risks / Trade-offs

- [Renaming `pentix-core` exports breaks direct importers] → Update `index.ts`, `server.ts`, and `tests/pentix-core.test.mjs` in the same change; `npm run build` and `npm test` catch stragglers.
- [`http.ts`/`request.ts` split leaves a stale import] → `noUnusedLocals` and `eslint` fail on unused imports, so the build/lint step catches it.
- [A stateless class reads as empty boilerplate] → Export a shared `gameSessionEngine` instance and document that methods are pure, so callers use the singleton and never construct it manually.
- [Forgetting to update `docs/foundation.md`] → Add an explicit task to refresh the modules description so docs match the new file layout.

## Migration Plan

1. Rename `engine.ts` → `session-engine.ts`; rename the functions to methods on `GameSessionEngine`; update `index.ts` to export the class and `gameSessionEngine`.
2. Split `http.ts` into `http.ts` (primitives) and `request.ts` (parsers); update `app.ts` imports.
3. Rename the `PentixGameLifecycle` methods and update `app.ts` calls and `server.ts` to use `gameSessionEngine`.
4. Update `tests/pentix-core.test.mjs` imports/calls.
5. Run `npm run build`, `npm test`, `npm run lint` and refresh `docs/foundation.md`.

Rollback follows the proposal: restore `engine.ts` and its four free functions, restore the original `http.ts`, delete `session-engine.ts` and `request.ts`, and revert the callers. No data migration.

## Open Questions

None blocking. Whether `GameSessionEngine` should later become stateful (owning a `PentixGameSession` reference per game) is a deliberate deferral — the current operations are pure and keep the existing immutable-session model intact.
