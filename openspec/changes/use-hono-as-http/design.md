## Context

`apps/pentix-server` serves ten REST endpoints over a hand-rolled `node:http` server. `server.ts` holds a `PentixGameLifecycle` in-memory service and a single `handleRequest` that uses one regex per dynamic route, plus helpers that buffer request bodies under a 1 MiB cap, `JSON.parse` them, and write `application/json; charset=utf-8` responses. `http.ts` holds the framework-agnostic `HttpError`, `HttpStatus`, and UUID validation helpers. Tests exercise the server only through HTTP using `startPentixServer({ host, port, context })` and assert on status codes, JSON shapes, and the exact `application/json; charset=utf-8` content type.

This change swaps the transport layer for Hono without touching the lifecycle service or the externally visible contract. The server stays strict TypeScript (`erasableSyntaxOnly`, `noUnusedLocals`), runs under the Node test runner, and is built to `dist/` with `tsc -p apps/pentix-server/tsconfig.json`.

## Goals / Non-Goals

**Goals:**

- Serve the existing endpoints through Hono (`hono`) mounted on Node's HTTP server (`@hono/node-server`).
- Replace regex routing, manual body buffering, manual JSON writing, and scattered error branching with declarative routes, a size-capped body helper, a JSON response helper, `app.notFound`, and `app.onError`.
- Preserve every status code, payload shape, validation message, UUIDv7 validation, the 1 MiB body limit, and the `application/json; charset=utf-8` content type.
- Preserve `PentixServerContext`, `PentixServerStartOptions`, `PentixServerHandle`, `createPentixServer`, and `startPentixServer` signatures.

**Non-Goals:**

- No new or changed endpoints, payloads, or status codes.
- No durable persistence, middleware such as CORS/auth/logging, or OpenAPI generation (deferred).
- No change to `pentix-core`, the web app, or the `PentixGameLifecycle` domain service.

## Decisions

### 1. Use an adapter server so `createPentixServer` keeps returning a Node `Server`
Build the Hono app and adapt it with `@hono/node-server`'s `createAdaptorServer`, which returns a plain `node:http` `Server` that forwards requests into the app. `createPentixServer(context)` keeps its current `Server` return type, and `startPentixServer` keeps its `listen`/`listening`/`error`/`address`/`close` logic unchanged.

Alternative: return the `Hono` instance from `createPentixServer` and use `serve()` from `@hono/node-server`. Rejected because it changes the public return type and re-implements start/stop that `createAdaptorServer` already preserves.

### 2. Model each endpoint as one declarative route with a `:id` path parameter
`POST /games`, `POST /game-sessions`, `POST /users`, `GET /users`, `GET /users/:id`, and `POST /game-sessions/:id/{next-piece|move|rotate|tick|drop}` become individual `app.post`/`app.get` calls. Each handler reads `c.req.param('id')` instead of running a regex, then calls the existing `checkUuid` for `400` validation. Dynamic single-segment semantics are identical because Hono's `:id` matches exactly one path segment.

Alternative: keep regex matching inside a single catch-all route. Rejected because it re-introduces the manual matching this change removes.

### 3. Wrap Hono's JSON helpers to preserve the exact wire contract
A small `readJsonBody(c)` helper reads the raw body under the existing 1 MiB cap and `JSON.parse`s it, throwing `HttpError(400)` on oversize or malformed JSON, rather than relying on Hono's default `c.req.json()` error behavior. A small `writeJson(c, status, payload)` helper returns JSON with the explicit lowercase `application/json; charset=utf-8` content type via `c.body(...)`, keeping the existing test assertion green regardless of Hono's default charset casing.

Alternative: use bare `c.req.json()` and `c.json()`. Rejected because Hono's defaults can change the `400` body-parse status and the content-type charset casing, breaking the existing contract.

### 4. Centralize not-found and error handling
`app.notFound` returns the existing `404` fallback payload (`service`, `method`, `path`, `message`) by reading `c.req.method` and `c.req.path`. `app.onError` maps an `HttpError` to `{ message }` with its `statusCode`, logs unexpected errors with `console.error`, and otherwise returns `500 { message: 'Internal server error.' }`. This replaces `writeError` and the trailing `writeJson(404, …)` fallback in `handleRequest`.

### 5. Keep the lifecycle and pure helpers where they already are
`PentixGameLifecycle` stays in `server.ts`. `http.ts` keeps `HttpError`, `HttpStatus`, `checkUuid`, and the pure body-validation helpers (`readOptionalName`, `readOptionalGameId`, `readRequiredUserId`, `readRequiredName`, `readDirection`), which already take and return plain values. A new `app.ts` exports `createPentixApp(lifecycle)` that registers the routes and reads bodies/responses via the Hono context.

```mermaid
sequenceDiagram
    participant Client
    participant NodeServer as @hono/node-server (adaptor)
    participant Hono
    participant Handler as Route handler (app.ts)
    participant Lifecycle as PentixGameLifecycle

    Client->>NodeServer: POST /game-sessions/:id/rotate
    NodeServer->>Hono: Fetch Request (req/res adapted)
    Hono->>Handler: matched route, c.req.param('id')
    Handler->>Handler: checkUuid(id) -> 400 on malformed
    Handler->>Handler: readJsonBody(c) validates direction
    alt validation error
        Handler-->>Hono: throw HttpError(400)
        Hono->>NodeServer: 400 { message }
    else valid
        Handler->>Lifecycle: rotateSession(id, direction)
        Lifecycle-->>Handler: updated PentixGameSession
        Handler->>Hono: writeJson(c, 200, session)
        Hono->>NodeServer: 200 application/json; charset=utf-8
    end
    NodeServer-->>Client: HTTP response
```

## Risks / Trade-offs

- [Content-type charset casing differs under Hono] → Normalize with the explicit `writeJson` helper so responses stay `application/json; charset=utf-8`.
- [Hono's default body-parse errors return the wrong status] → Use a size-capped `readJsonBody` that throws `HttpError(400)` rather than `c.req.json()`.
- [Adapter server behaves slightly differently for malformed requests] → Preserve the lifecycle and validation code and rely on the existing integration tests to catch drift.
- [Dead code left behind after extraction] → Remove `handleRequest`, `writeJson`, `readJsonBody`, and `writeError` from `server.ts` so `noUnusedLocals` passes.
- [Hono's `:id` param shape] → Verify the route still matches exactly one segment and that non-matching paths fall through to `app.notFound`.

## Migration Plan

1. Add `hono` and `@hono/node-server` to the root `package.json` dependencies and install.
2. Add `apps/pentix-server/src/app.ts` with `createPentixApp(lifecycle)`, the route registrations, the `readJsonBody`/`writeJson` helpers, `app.notFound`, and `app.onError`.
3. Point `createPentixServer` at `createAdaptorServer(createPentixApp(lifecycle))` and delete the now-unused manual HTTP helpers from `server.ts`.
4. Run `npm run build`, `npm test`, and `npm run lint`, resolving any regressions.

Rollback follows the proposal: remove the new dependencies, delete `app.ts`, and restore the prior `server.ts`/`http.ts`. No data migration is needed.

## Open Questions

None blocking. CORS, authentication middleware, request logging, and OpenAPI generation are intentionally deferred and will be straightforward to layer onto the Hono app later.

