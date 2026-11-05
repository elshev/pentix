## 1. Introduce Hono And Preserve Public Surface

- [ ] 1.1 Add `hono` and `@hono/node-server` to the root `package.json` dependencies and install, updating `package-lock.json`.
- [ ] 1.2 Create `apps/pentix-server/src/app.ts` exporting `createPentixApp(lifecycle)` that builds and returns a `Hono` instance.
- [ ] 1.3 Keep `apps/pentix-server/src/http.ts` for `HttpError`, `HttpStatus`, `checkUuid`, and the pure body-validation helpers (`readOptionalName`, `readOptionalGameId`, `readRequiredUserId`, `readRequiredName`, `readDirection`).

## 2. Port Routing, Body, And Response Handling

- [ ] 2.1 Register `POST /games`, `POST /game-sessions`, `POST /users`, `GET /users`, and `GET /users/:id` as Hono routes, preserving `201`/`200`/`400`/`404`/`409`, UUIDv7 validation, and validation-message semantics.
- [ ] 2.2 Register `POST /game-sessions/:id/next-piece`, `/move`, `/rotate`, `/tick`, and `/drop` as Hono routes using `:id` path params, preserving direction validation and `400`/`404` behavior.
- [ ] 2.3 Add a size-capped `readJsonBody(c)` helper (1 MiB limit) that throws `HttpError(400)` on oversize or malformed JSON instead of calling Hono's `c.req.json()` directly.
- [ ] 2.4 Add a `writeJson(c, status, payload)` helper that emits `application/json; charset=utf-8` with the correct status code.
- [ ] 2.5 Add `app.notFound` returning the existing `404` fallback payload (`service`, `method`, `path`, `message`) from `c.req.method` and `c.req.path`.
- [ ] 2.6 Add `app.onError` mapping `HttpError` to `{ message }` with its status and logging unknown errors before returning `500 { message: 'Internal server error.' }`.

## 3. Wire The Adapter And Preserve Start/Stop

- [ ] 3.1 Change `createPentixServer(context)` to build the `PentixGameLifecycle`, call `createPentixApp(lifecycle)`, and return `createAdaptorServer(app)` as a Node `Server`.
- [ ] 3.2 Remove the now-unused `handleRequest`, `writeJson`, `readJsonBody`, and `writeError` from `server.ts`, and verify `startPentixServer` (env `host`/`port`, `listening`/`error` await, URL formatting, and `close()`) works against the adapter unchanged.

## 4. Verify Contracts And Documentation

- [ ] 4.1 Run `npm run build`, `npm test`, and `npm run lint`, resolving all regressions; the existing server integration tests (content type, status codes, endpoints) must pass unchanged.
- [ ] 4.2 Add a short note to `docs/foundation.md` that `PentixServer` now serves HTTP through Hono + `@hono/node-server`.
- [ ] 4.3 Confirm the `404` fallback message and documented endpoint list remain accurate after the migration.
