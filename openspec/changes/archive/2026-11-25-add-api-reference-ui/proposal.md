## Why

`PentixServer` exposes twelve REST endpoints, but its contract lives only in `app.ts`, `request.ts`, and prose in `README.md`. Nothing machine-readable describes the API, so the README drifts from the handlers, clients cannot generate code from it, and testing a request from a browser is impossible without curl or an ad-hoc script. A generated OpenAPI document plus a Swagger UI gives the server one self-verifying contract and a browser console that appears whenever the server runs.

## What Changes

- Add `zod`, `@hono/zod-openapi`, `@hono/swagger-ui`, and `swagger-ui-dist` as runtime dependencies of the root package.
- **Contract-first routes**: replace the `Hono` instance in `apps/pentix-server/src/app.ts` with `OpenAPIHono` and declare every endpoint with `createRoute` plus zod schemas for path parameters, request bodies, and responses, so validation and documentation share one source of truth.
- Move request validation out of the hand-rolled readers in `request.ts` into those route schemas, preserving the current status codes, the `{ message }` error envelope, UUIDv7 checks, trimming and blank-value rules, and the `1`–`256` demo-run `gameCount` rule.
- Serve the generated OpenAPI 3.1 document at `GET /openapi.json`, with `servers` derived from the requesting origin so "Try it out" targets the actual host and port.
- Serve a Swagger UI page at `GET /docs` (title `PentixServer API`) with every operation's **Try it out** enabled.
- **Self-host the UI**: serve the `swagger-ui-dist` CSS and bundle from this server under `/docs/swagger-ui-dist/*` through `@hono/node-server/serve-static`, and point `@hono/swagger-ui` at them with its `baseUrl` option, so the page works offline and never depends on a CDN.
- Keep the existing response contract: JSON responses keep `application/json; charset=utf-8`, errors keep the `{ message }` shape, and the 1 MiB body cap keeps answering `400 Bad Request`.
- **Tighten one transport rule**: a request that carries a body without a JSON content type is rejected with `415 Unsupported Media Type` instead of being parsed as JSON. Malformed JSON keeps answering `400`, and Hono `HTTPException`s join `HttpError` in `app.onError` so both keep the `{ message }` envelope.
- Update the `404` fallback message to list `GET /openapi.json` and `GET /docs` alongside the API endpoints.
- Retire the readers in `request.ts` that zod replaces, keeping the UUIDv7 helpers used by handlers that resolve ids outside a route schema.
- Tests: existing server tests keep passing unchanged; add coverage for the document, the UI page, the locally served assets, the `415` rule, and a contract test that parses live responses with the documented schemas so a handler change cannot silently outdate the document.
- Document the two new endpoints in `README.md` and `docs/foundation.md`.

## Capabilities

### New Capabilities

- `api-reference`: the OpenAPI document and the browser UI that expose and exercise every `PentixServer` endpoint, including how the document stays consistent with the handlers and how the UI assets are served.

### Modified Capabilities

- `pentix-server-bootstrap`: the server serves its routes through an OpenAPI-aware Hono application that declares each route's contract, publishes `GET /openapi.json` and `GET /docs`, validates request bodies against the declared schemas (adding the `415` rule), and lists the new endpoints in its endpoint set and `404` fallback message.

## Impact

- Affected code: `apps/pentix-server/src/app.ts` (OpenAPI-aware routes and handlers), new `apps/pentix-server/src/api/` modules for schemas, route definitions, and the docs wiring, `apps/pentix-server/src/request.ts` (readers moved into schemas), `apps/pentix-server/src/http.ts` (error mapping), `apps/pentix-server/src/server.ts` (app construction unchanged in shape), `tests/pentix-server.test.mjs`, `README.md`, `docs/foundation.md`.
- Affected APIs: additive `GET /openapi.json` and `GET /docs` plus their assets; one documented tightening (`415` for a body without a JSON content type). Every existing endpoint keeps its path, payload shapes, and status codes for valid requests.
- Dependencies: adds `zod` (already present transitively at `4.3.6`), `@hono/zod-openapi`, `@hono/swagger-ui`, and `swagger-ui-dist`; `hono` and `@hono/node-server` versions already satisfy their peer ranges.
- Compatibility: non-breaking for valid clients and for the existing test suite; the `415` rule and the document/asset responses are the only observable difference, and no stored data or persisted format changes.

## Affected Teams

- Backend/server development owns the `OpenAPIHono` migration, the schemas, the docs endpoints, and the server tests.
- Frontend/web development is unaffected: the browser app talks to a local session and does not call `PentixServer` yet.
- Product/gameplay design is unaffected: no gameplay, scoring, or session-lifecycle behavior changes.
- Documentation/maintenance owns the README and `docs/foundation.md` updates.

## Rollback Plan

Remove the `zod`, `@hono/zod-openapi`, `@hono/swagger-ui`, and `swagger-ui-dist` dependencies, restore `createPentixApp` to a plain `Hono` instance with the hand-rolled readers from `request.ts`, and delete the new `apps/pentix-server/src/api/` modules and the `GET /openapi.json` and `GET /docs` routes. Revert the `pentix-server-bootstrap` spec delta and drop the `api-reference` spec. No persisted data, storage schema, or game/session state is touched by this change, so rollback needs no migration and no data repair.
