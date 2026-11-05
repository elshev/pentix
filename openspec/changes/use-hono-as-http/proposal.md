## Why

`PentixServer` currently serves HTTP by hand-rolling `node:http`: it matches each route with a regex, buffers and parses request bodies manually under a 1 MiB cap, and writes JSON responses and errors field-by-field across `server.ts` and `http.ts`. As the endpoint surface has grown, this transport layer has become verbose and repetitive, and it lacks the standard primitives (declarative routing, a centralized error boundary, middleware) the server will need as it grows. Migrating the transport to Hono removes that boilerplate while keeping the server's observable behavior identical.

## What Changes

- Add `hono` and `@hono/node-server` as runtime dependencies of the root package.
- Replace the raw `node:http` request handler with a Hono application served through `@hono/node-server`.
- Replace regex route matching with declarative Hono routes for `POST /games`, `POST /game-sessions`, `POST /game-sessions/{id}/next-piece`, `POST /game-sessions/{id}/move`, `POST /game-sessions/{id}/rotate`, `POST /game-sessions/{id}/tick`, `POST /game-sessions/{id}/drop`, `POST /users`, `GET /users`, and `GET /users/{id}`.
- Replace manual JSON body reading and response writing with a size-capped body helper and a JSON response helper, preserving the 1 MiB limit and `application/json; charset=utf-8`.
- Replace the manual `404` fallback and error-response branching with `app.notFound` and `app.onError`, preserving the exact status codes and `{ message }` shapes.
- Keep the `PentixGameLifecycle` domain service, the endpoint list, request/response payloads, and status codes unchanged — this is an internal transport refactor with no breaking API change.
- Keep the `PentixServerContext`, `PentixServerStartOptions`, `PentixServerHandle`, `createPentixServer`, and `startPentixServer` contracts intact so existing tests and callers are unaffected.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pentix-server-bootstrap`: The requirement describing how the server serves HTTP changes from a hand-rolled `node:http` handler that parses relative request URLs with a named internal base constant, to a Hono application mounted on a Node.js HTTP server via `@hono/node-server`. The endpoint list, JSON/status-code contract, host/port settings, and in-memory lifecycle are unchanged.

## Impact

- Affected code: `apps/pentix-server/src/server.ts` (routing/response logic extracted into a Hono app while keeping the lifecycle and start/stop code), a new `apps/pentix-server/src/app.ts` (the Hono app and route handlers), and `apps/pentix-server/src/http.ts` (helpers reused or adapted). `apps/pentix-server/src/main.ts` is unchanged.
- Affected APIs: none externally — the same endpoints, payload shapes, and status codes; the `startPentixServer` return shape is preserved.
- Dependencies: add `hono` and `@hono/node-server`; `@types/node` remains for Node types.
- Compatibility: non-breaking for clients and for the test suite, which exercises the server over HTTP only.

## Affected Teams

- Backend/server development owns the transport migration and the Hono app and routes.
- Frontend/web development is unaffected (the web app still talks to the same REST endpoints).
- Product/gameplay design is unaffected (no behavior or contract change).

## Rollback Plan

Remove the `hono` and `@hono/node-server` dependencies, delete `apps/pentix-server/src/app.ts`, and restore the raw `node:http` request handler and helper functions (regressing to the previous `server.ts` and `http.ts`). Revert the `pentix-server-bootstrap` spec wording to reference the named internal base constant. Because the domain lifecycle and endpoints are untouched, rollback is isolated to the transport layer and requires no data migration.
