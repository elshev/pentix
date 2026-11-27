## Why

`PentixServer` publishes twelve REST endpoints at unprefixed paths such as `/users` and `/game-sessions/{id}/move`. No path, header, or document field states which API contract a client uses. Any breaking contract change then hits every client at once, and the server cannot keep an older contract alive next to a newer one.

## What Changes

- **BREAKING**: Move every API endpoint under the major-version path prefix `/v1`. `POST /games`, `POST /game-sessions`, the four gameplay operations, the three user operations, and the two demo-run operations become `/v1/games`, `/v1/game-sessions`, and so on. The unprefixed paths stop answering.
- Add `apps/pentix-server/src/api/version.ts` as the single source of the version. It exports the major version, the `/v1` prefix, a `versionedPath` helper, and the document version `1.0.0`.
- Build every route path in `apps/pentix-server/src/api/routes.ts` through `versionedPath`, so one constant moves the whole API.
- Keep the two documentation endpoints unversioned at `GET /openapi.json` and `GET /docs`. The document then lists the `/v1` operations of the current version.
- Set the OpenAPI `info.version` field to `1.0.0` and name the version prefix in the document description.
- Derive the `404` fallback endpoint list from the registered route table instead of a hand-written string, so the message always names the `/v1` paths and the two documentation endpoints.
- Answer an unprefixed path or an unknown version prefix, such as `/users` or `/v2/users`, with the existing `404` fallback and the `{ service, method, path, message }` envelope. Add no redirect and no alias to an unversioned path.
- Step 1 of the version policy: a published major version never changes in place. A future breaking change ships under a new prefix, and `/v1` keeps its contract.
- Update `tests/pentix-server.test.mjs` to call the `/v1` paths, and add coverage for the prefix rule, the unknown-prefix `404`, the document paths, and the document version.
- Update `README.md`, `docs/foundation.md`, and `GLOSSARY.md` so every documented endpoint shows its versioned path.

## Capabilities

### New Capabilities

- `api-versioning`: the major-version path prefix that every API endpoint uses, the rule that one constant owns it, the `404` answer for unprefixed and unknown-prefix paths, the version reported in the OpenAPI document, and the policy that a published version never changes in place.

### Modified Capabilities

- `api-reference`: documented paths gain the `/v1` prefix, the document reports `info.version` `1.0.0`, and the fallback message names the versioned endpoints.
- `pentix-server-bootstrap`: the endpoint set, the transport scenarios, and the validation scenarios name the `/v1` paths, and the fallback message derives from the route table.
- `user-management`: the three user endpoints move to `/v1/users` and `/v1/users/{id}`.
- `game-lifecycle`: `POST /games` and `POST /game-sessions/{id}/next-piece` move under `/v1`.
- `game-session-start`: `POST /game-sessions` moves to `/v1/game-sessions`.
- `server-demo-run`: `POST /demo-runs` and `GET /demo-runs/{id}` move under `/v1`.
- `session-replay`: the recorded gameplay request paths gain the `/v1` prefix.
- `storage-repositories`: the restart scenario fetches `GET /v1/users`.
- `repository-documentation`: the documentation names the versioned demo-run endpoints.

## Impact

- Affected code: `apps/pentix-server/src/api/version.ts` (new), `apps/pentix-server/src/api/routes.ts` (versioned route paths), `apps/pentix-server/src/api/docs.ts` (document version and description), `apps/pentix-server/src/app.ts` (derived fallback message), `tests/pentix-server.test.mjs` (versioned paths and new coverage).
- Affected APIs: every REST endpoint changes its path. Request bodies, response bodies, status codes, the `{ message }` envelope, and the `application/json; charset=utf-8` content type stay the same. `GET /openapi.json` and `GET /docs` keep their paths. This is a breaking change for any client that calls an unprefixed path.
- Dependencies: none. No package is added, removed, or upgraded.
- Storage: none. Stored users, games, sessions, and session logs keep their shapes, so no migration or data repair is needed.
- Browser client: `apps/pentix-web` does not call `PentixServer`, so it is unaffected.
- Documentation: `README.md`, `docs/foundation.md`, and `GLOSSARY.md` show the versioned paths.

## Affected Teams

- Backend/server development owns the version constant, the route table, the document metadata, the fallback message, and the server tests.
- Frontend/web development is unaffected, because the browser app runs its game locally and calls no server endpoint.
- Documentation/maintenance owns the path updates in `README.md`, `docs/foundation.md`, and `GLOSSARY.md`.
- Product/gameplay design is unaffected: no gameplay, scoring, session, or demo-run rule changes.

## Rollback Plan

Restore the literal route paths in `apps/pentix-server/src/api/routes.ts`, set `info.version` back to `0.1.0`, restore the hand-written fallback message in `apps/pentix-server/src/app.ts`, and delete `apps/pentix-server/src/api/version.ts`. Revert the test paths and remove the new versioning coverage. Revert the spec deltas and drop the `api-versioning` spec. Stored data and the browser app need no rollback, because neither changes.
