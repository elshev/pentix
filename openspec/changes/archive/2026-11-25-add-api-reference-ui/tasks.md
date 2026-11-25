## 1. Dependencies

- [x] 1.1 Add `zod`, `@hono/zod-openapi`, `@hono/swagger-ui`, and `swagger-ui-dist` to the root `package.json` dependencies and install them, updating `package-lock.json`.
- [x] 1.2 Confirm the installed `hono` (`>=4.10.0`) and `zod` (`^4`) satisfy the `@hono/zod-openapi` peer ranges, and record the resolved versions.

## 2. Zod Schemas

- [x] 2.1 Create `apps/pentix-server/src/api/schemas.ts` with the shared UUIDv7 path-parameter schema (message `<label> must be a UUIDv7 value.`) and the `{ message }` error envelope schema used by every failure response.
- [x] 2.2 Define the `BoardCell`, `BoardSnapshot`, `User`, `PentixGame`, and `PentixGameSession` response schemas field for field, using `.readonly()` for core readonly arrays and records, and pin each with `satisfies z.ZodType<CoreType>` so `npm run build:server` fails when `pentix-core` changes shape.
- [x] 2.3 Define the `DemoRunSnapshot` schema (including `error` only for `failed` runs) and register the named schemas with `.openapi('Name')` so the document emits `#/components/schemas` references.
- [x] 2.4 Define the request body schemas: `POST /games` optional object with trimmed `name`; `POST /game-sessions` required `userId` and optional `null`/blank `gameId`; `POST /users` required non-empty trimmed `name`; `move`/`rotate` direction enums; `POST /demo-runs` optional object with integer `gameCount` from `1` to `256`. Author messages that keep the current texts, including the `1` to `256` wording and the `left, right` / `clockwise, counterclockwise` lists.

## 3. Route Table

- [x] 3.1 Create `apps/pentix-server/src/api/routes.ts` exporting `buildPentixRoutes(lifecycle, demoRuns)` that returns a route-plus-handler table for all twelve endpoints, with `createRoute` summaries, capability tags (`Users`, `Games`, `Sessions`, `Gameplay`, `Demo runs`), path parameters, bodies, and every status code each handler returns.
- [x] 3.2 Export `listPentixRouteKeys()` derived from that same table as `METHOD /path` strings for the documentation tests, excluding the two documentation endpoints.
- [x] 3.3 Declare responses with the schemas from `api/schemas.ts`, including the `202` demo-run snapshot and the `{ message }` envelope on `400`, `404`, `409`, and `415` responses.

## 4. Application Wiring

- [x] 4.1 Rewrite `createPentixApp` to build `new OpenAPIHono({ defaultHook })`, where the hook returns `400 { message }` from the first zod issue.
- [x] 4.2 Add the 1 MiB body guard as `app.use('*', ...)` before the routes: reject a declared `Content-Length` above the cap and otherwise measure `c.req.text()`, answering `400 Request JSON body is too large.` and relying on Hono's cached body for the later validator.
- [x] 4.3 Register the route table with `app.openapi(route, handler)` and keep `writeJson` as a typed wrapper over `c.json(payload, status, { 'content-type': 'application/json; charset=utf-8' })`.
- [x] 4.4 Extend `app.onError` to map Hono `HTTPException` (malformed JSON `400`, media type `415`) to `{ message }` alongside `HttpError`, and keep the unknown-error `500 Internal server error.` branch.
- [x] 4.5 Update the `404` fallback message to name `GET /docs` and `GET /openapi.json` next to the supported API endpoints, and keep `GET /` answering `404`.
- [x] 4.6 Delete the readers in `request.ts` that no route or handler uses any more, keeping `isUuidV7` and `checkUuid` for the `gameId` body field, and remove `MAX_JSON_BODY_BYTES`/`readJsonBody` from `app.ts` once the guard owns them.

## 5. Documentation Endpoints

- [x] 5.1 Create `apps/pentix-server/src/api/docs.ts` exporting `registerApiReference(app)`.
- [x] 5.2 Register `GET /openapi.json` with `app.doc(...)`, `openapi: '3.1.0'`, `info.title` `PentixServer API`, a version, and `servers` derived from `new URL(c.req.url).origin`.
- [x] 5.3 Register `GET /docs` with `swaggerUI({ baseUrl: '/docs', title: 'PentixServer API', docExpansion: 'list', tryItOutEnabled: true })`.
- [x] 5.4 Mount `serveStatic` at `/docs/swagger-ui-dist/*` with `root` from `createRequire(import.meta.url)('swagger-ui-dist').getAbsoluteFSPath()` and `rewriteRequestPath` stripping `/docs/swagger-ui-dist`, throwing a startup error naming `swagger-ui-dist` when the directory is absent.
- [x] 5.5 Wire `registerApiReference(app)` into `createPentixApp` after the API routes so the document is generated once the full route table is registered.

## 6. Tests

- [x] 6.1 Add a test that fetches `GET /openapi.json`, asserts `200`, `openapi === '3.1.0'`, the title, and `servers[0].url` equal to the test origin.
- [x] 6.2 Add a test that the documented `METHOD /path` set equals `listPentixRouteKeys()` from `apps/pentix-server/dist/api/routes.js`, that neither documentation endpoint appears in the document, and that every operation has a summary and a tag.
- [x] 6.3 Add a test that the documented demo-run body reports the `1` to `256` bounds and the path parameters report the UUIDv7 pattern.
- [x] 6.4 Add a test that `GET /docs` answers `200` HTML titled `PentixServer API`, references `/openapi.json`, and contains no external host.
- [x] 6.5 Add a test that `/docs/swagger-ui-dist/swagger-ui.css` and `/docs/swagger-ui-dist/swagger-ui-bundle.js` answer `200` with CSS and JavaScript content types.
- [x] 6.6 Add contract tests that parse live `POST /users`, `GET /users`, `POST /games`, `POST /game-sessions`, `POST /demo-runs`, and a `404` error body with the exported schemas, so a dropped or renamed field fails the suite.
- [x] 6.7 Add a test that a body sent with `Content-Type: text/plain` answers `415 { message }` and creates nothing, and that the 1 MiB and malformed-JSON cases still answer `400 { message }`.
- [x] 6.8 Re-run the untouched existing server tests and fix any assertion whose contract genuinely changed (expected: none except the new `415` case).

## 7. Verification And Documentation

- [x] 7.1 Run `npm run build`, `npm test`, and `npm run lint`, resolving every failure.
- [x] 7.2 Start the server with `npm run start:server`, open `/docs` in a browser, execute `POST /users` and `GET /users` through Try it out, and confirm the JSON responses.
- [x] 7.3 Document `GET /openapi.json` and `GET /docs` in `README.md` (server API section and commands) and note the OpenAPI-aware transport in `docs/foundation.md`.
- [x] 7.4 Run `openspec validate add-api-reference-ui --strict` and confirm the change validates.
