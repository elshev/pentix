## Why

Two modules have drifted away from single-responsibility and clear naming. `apps/pentix-server/src/http.ts` bundles genuinely generic HTTP error primitives together with Pentix-specific request-body parsing and non-HTTP validation helpers, so the file no longer has one clear job. `packages/pentix-core/src/engine.ts` exposes the active-piece gameplay operations as loose functions whose `Session`/`ActivePiece` suffixes (`dropSession`, `tickSession`, `moveActivePiece`, `rotateActivePiece`) are redundant: the session is already the first argument and the module's only concern is game-session work. Reading the code today forces a reader to repeatedly re-derive that these are all the same "run one gameplay step on a session" operations.

## What Changes

- Split `apps/pentix-server/src/http.ts` so it contains only Pentix-agnostic HTTP primitives: `HttpError`, `HttpStatus`, and `throwHttpErrorIf`.
- Move the request-body/validation helpers (`isUuidV7`, `checkUuid`, `isJsonRecord`, `readOptionalName`, `readOptionalGameId`, `readDirection`, `readRequiredName`, `readRequiredUserId`) out of `http.ts` into a new `apps/pentix-server/src/request.ts`, which the app routes import. `http.ts` drops its `uuid` dependency.
- Extract the `engine.ts` gameplay operations into a `GameSessionEngine` class in a new `packages/pentix-core/src/session-engine.ts`, renaming:
  - `moveActivePiece` → `move`
  - `rotateActivePiece` → `rotate`
  - `tickSession` → `tick`
  - `dropSession` → `drop`
- **BREAKING** (package API only): the public `pentix-core` exports for these gameplay functions change from four free functions to the `GameSessionEngine` class plus a shared `gameSessionEngine` instance. All consumers are internal (`server.ts`, `tests/pentix-core.test.mjs`) and are updated in the same change. The HTTP contract is unchanged.
- Rename the server life-cycle methods for consistency (`moveSession` → `move`, `rotateSession` → `rotate`, `tickSession` → `tick`, `dropSession` → `drop`) so `PentixGameLifecycle` and `GameSessionEngine` use the same verb names.

## Capabilities

### New Capabilities

- `game-session-engine`: The shared `pentix-core` package exposes a single `GameSessionEngine` that encapsulates the active-piece operations `move`, `rotate`, `tick`, and `drop`.

### Modified Capabilities

None. Gameplay behavior, endpoints, payloads, and status codes are unchanged; this is a naming and encapsulation refactor with no externally observable behavior change.

## Impact

- Affected code: `packages/pentix-core/src/engine.ts` (→ `session-engine.ts`), `packages/pentix-core/src/index.ts`, `apps/pentix-server/src/http.ts`, new `apps/pentix-server/src/request.ts`, `apps/pentix-server/src/app.ts`, `apps/pentix-server/src/server.ts`, and `tests/pentix-core.test.mjs`.
- Affected APIs: internal to the repository — the `pentix-core` package's exported gameplay function names change. HTTP endpoints, status codes, payload shapes, and the `startPentixServer` contract are unchanged.
- Dependencies: none added or removed (the `uuid` import just moves from `http.ts` to `request.ts`).
- Compatibility: non-breaking for HTTP clients and for the server integration suite (which exercises the server over HTTP only). Breaking only for direct consumers of the changed `pentix-core` function exports, all of which are in-repo.

## Affected Teams

- Backend/server and shared-core development own the refactor.
- Frontend/web development is unaffected (the web app speaks the same REST contract).
- Product/gameplay design is unaffected (no behavior or contract change).

## Rollback Plan

Revert the file moves and renames in a single commit: restore `engine.ts` and its four free functions, restore the original `http.ts` contents, delete `session-engine.ts` and `request.ts`, and revert the callers (`index.ts`, `server.ts`, `app.ts`, `tests/pentix-core.test.mjs`). No data or schema migration is required, and the existing `build:core`, `build:server`, `test`, and `lint` scripts are the guardrail that confirms behavior is unchanged.
