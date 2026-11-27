## 1. Version module

- [x] 1.1 Create `apps/pentix-server/src/api/version.ts` with `API_VERSION = '1'`, `API_BASE_PATH = '/v1'` derived from it, `API_DOCUMENT_VERSION = '1.0.0'` derived from it, and `versionedPath(path)` returning `${API_BASE_PATH}${path}`. Export a doc comment that states the module is the only owner of the version.
- [x] 1.2 Confirm the module compiles under the server `tsconfig.json` settings (`strict`, `module: NodeNext`) with no new dependency.

## 2. Versioned routes

- [x] 2.1 In `apps/pentix-server/src/api/routes.ts`, wrap every one of the twelve `createRoute` paths with `versionedPath`: `/games`, `/game-sessions`, `/users`, `/users/{id}`, `/game-sessions/{id}/next-piece`, `/game-sessions/{id}/move`, `/game-sessions/{id}/rotate`, `/game-sessions/{id}/tick`, `/game-sessions/{id}/drop`, `/demo-runs`, and `/demo-runs/{id}`.
- [x] 2.2 Keep `PENTIX_ROUTE_CONFIGS` in the same order and keep `listPentixRouteKeys()` unchanged, so every key now starts with `/v1`.
- [x] 2.3 Leave handlers, request validation, response writes, and status codes untouched.

## 3. Document and fallback message

- [x] 3.1 In `apps/pentix-server/src/api/docs.ts`, replace the literal `info.version` `'0.1.0'` with `API_DOCUMENT_VERSION` and name `API_BASE_PATH` in the document description.
- [x] 3.2 In `apps/pentix-server/src/app.ts`, replace the literal `NOT_FOUND_MESSAGE` endpoint list with a message built from `listPentixRouteKeys()`, `API_REFERENCE_PATH`, and `API_DOCUMENT_PATH`, so the fallback names the versioned endpoints and the two documentation endpoints.
- [x] 3.3 Verify that the two documentation routes stay at `/docs` and `/openapi.json` and that neither appears in the document's `paths`.

## 4. Server tests

- [x] 4.1 In `tests/pentix-server.test.mjs`, change every endpoint path passed to `post()`, `getJson()`, and `fetch()` to its `/v1/...` form, including the template paths for session ids.
- [x] 4.2 Update the document tests to assert `info.version` `1.0.0`, eleven documented paths, and a `/v1` prefix on every documented path.
- [x] 4.3 Update the schema-derivation test to read `paths['/v1/demo-runs']` and `paths['/v1/users/{id}']`.
- [x] 4.4 Add a test that every key from `listPentixRouteKeys()` starts with `/v1` and no key repeats the prefix.
- [x] 4.5 Add a test that `POST /users` and `GET /v2/users` answer `404` with the not-found envelope, that the message names `POST /v1/users`, `GET /docs`, and `GET /openapi.json`, and that no user is created.
- [x] 4.6 Add a test that `GET /docs` and `GET /openapi.json` keep their paths and still answer `200`.

## 5. Documentation

- [x] 5.1 In `README.md`, state the `/v1` prefix rule and the `404` answer for unprefixed and unknown-version paths in the **Server API** section, then change every endpoint bullet to its `/v1/...` path.
- [x] 5.2 In `docs/foundation.md`, name `apps/pentix-server/src/api/version.ts` as the version owner and change every endpoint path to its `/v1/...` form.
- [x] 5.3 In `GLOSSARY.md`, add an **API version** entry that names `API_VERSION`, the `/v1` path segment, and the `1.0.0` document version, and update the **Demo run** entry to `POST /v1/demo-runs`.

## 6. Verification

- [x] 6.1 Run `npm run build` and confirm the server and web builds pass.
- [x] 6.2 Run `npm test` and confirm the server suite passes with the versioned paths and the new tests.
- [x] 6.3 Run `npm run lint` and confirm no lint error.
- [x] 6.4 Start the server, open `GET /docs`, execute `POST /v1/users` and `GET /v1/users`, and confirm the document lists `/v1` paths with `info.version` `1.0.0`.
