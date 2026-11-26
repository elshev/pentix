# api-reference Specification

## Purpose

Define the OpenAPI 3.1 document and the browser Swagger UI that expose and exercise every `PentixServer` endpoint. Define how that document stays consistent with the route handlers.
## Requirements
### Requirement: PentixServer publishes a machine-readable OpenAPI document

`PentixServer` SHALL serve `GET /openapi.json` with `200 OK` and an OpenAPI `3.1.0` JSON document. The document SHALL describe every API endpoint the server exposes — `POST /games`, `POST /game-sessions`, `POST /game-sessions/{id}/next-piece`, `POST /game-sessions/{id}/move`, `POST /game-sessions/{id}/rotate`, `POST /game-sessions/{id}/tick`, `POST /game-sessions/{id}/drop`, `POST /users`, `GET /users`, `GET /users/{id}`, `POST /demo-runs`, and `GET /demo-runs/{id}` — without restating their business rules. The two documentation endpoints SHALL be excluded from the document, so the console lists API operations only.

Each operation in the document SHALL carry its HTTP method, path, and a summary. It SHALL carry a tag that groups the operation with the capability that owns it. It SHALL carry its path parameters and its request body schema when it accepts one. It SHALL carry the response schemas for the status codes it returns. The document SHALL be generated from the same zod schemas that the routes use to validate requests. It SHALL NOT be a separately maintained file. The document's `servers` entry SHALL be the origin of the request that fetched it. A client that executes operations from the document then targets the running host and port.

#### Scenario: The document lists every endpoint

- **GIVEN** a running `PentixServer`
- **WHEN** a client fetches `GET /openapi.json`
- **THEN** the response status is `200`
- **AND** its `paths` contain every endpoint listed in this requirement with the correct HTTP methods
- **AND** every operation carries a summary and a tag

#### Scenario: The document declares OpenAPI 3.1

- **GIVEN** a running `PentixServer`
- **WHEN** the document is fetched
- **THEN** its `openapi` field is `3.1.0`
- **AND** its `info.title` names the Pentix server API

#### Scenario: The document targets the running origin

- **GIVEN** a `PentixServer` listening on an ephemeral test port
- **WHEN** the document is fetched from that origin
- **THEN** the document's `servers` entry reports that exact origin
- **AND** operations executed from the document resolve against that origin

#### Scenario: The document is generated from the route schemas

- **GIVEN** the demo-run request body refuses a `gameCount` outside `1` to `256`
- **WHEN** the document is read
- **THEN** the documented body schema states those integer bounds
- **AND** no repository file other than the route schema definitions repeats those bounds for documentation purposes

### Requirement: PentixServer serves a Swagger UI to exercise the API

`PentixServer` SHALL serve `GET /docs` with `200 OK` and an HTML page that renders the document from `GET /openapi.json` through Swagger UI, titled `PentixServer API`, with **Try it out** available on every operation. The page SHALL load the Swagger UI stylesheet and script from this server under `/docs/swagger-ui-dist/*`. The server SHALL serve those files from the installed `swagger-ui-dist` package, so the page needs no CDN, internet access, or build-time asset copy. Both the page and its assets SHALL be read-only and available whenever the server runs, without an extra command-line flag or environment variable.

#### Scenario: The browser console is served

- **GIVEN** a running `PentixServer`
- **WHEN** a browser requests `GET /docs`
- **THEN** the response status is `200` with an HTML content type
- **AND** the page title is `PentixServer API`
- **AND** the page loads its specification from `/openapi.json`

#### Scenario: The UI assets are served by the server

- **GIVEN** the page returned by `GET /docs`
- **WHEN** its stylesheet and script URLs are inspected
- **THEN** they point at `/docs/swagger-ui-dist/` on the same origin
- **AND** requesting those URLs returns `200` with a CSS and a JavaScript content type
- **AND** the page references no external host

#### Scenario: A browser executes a real request

- **GIVEN** the page is open in a browser and the operator expands `POST /users`
- **WHEN** the operator executes it with `{ "name": "Ada" }` through **Try it out**
- **THEN** the page reports `201 Created` with the new user
- **AND** `GET /users` lists that user

#### Scenario: Documentation requests change nothing

- **GIVEN** a `PentixServer` retaining users, games, and sessions
- **WHEN** a client fetches `GET /docs`, `GET /openapi.json`, and the UI assets
- **THEN** no user, game, session, or demo run is created, updated, or deleted
- **AND** subsequent API responses are identical to those before the documentation requests

### Requirement: The document cannot drift from the handlers

The server's test suite SHALL validate the responses of every endpoint against the same zod schemas the document publishes. It SHALL assert that the set of documented operations equals the set of API routes the server registers. The two documentation endpoints are excluded from that comparison. A handler payload that stops matching its documented schema SHALL fail the test suite. An API route that is added or deleted without its declaration SHALL also fail the test suite.

#### Scenario: A response that outgrows its schema fails

- **GIVEN** a handler that renames or drops a documented response field
- **WHEN** the server test suite runs
- **THEN** the contract test fails and names the offending field
- **AND** the failure is reported without contacting an external service

#### Scenario: Every API route is documented

- **GIVEN** the running server and its `GET /openapi.json` document
- **WHEN** the test suite compares the documented method-and-path pairs with the server's registered API routes
- **THEN** the two sets are equal once the two documentation endpoints are excluded
- **AND** adding an API route without a declaration fails the comparison in either direction

### Requirement: The API reference stays additive

The documentation endpoints SHALL be read-only `GET` operations that add no state, no authentication requirement, and no behavior change to the existing API. `GET /` SHALL keep answering the `404 Not Found` fallback, and that fallback's message SHALL name `GET /docs` and `GET /openapi.json` alongside the supported API endpoints.

#### Scenario: The root path is still not found

- **GIVEN** a running `PentixServer`
- **WHEN** a client requests `GET /`
- **THEN** the response status is `404`
- **AND** the fallback message names `/docs` and `/openapi.json`

#### Scenario: Existing endpoints are unchanged

- **GIVEN** the server with the API reference in place
- **WHEN** a client calls an existing endpoint such as `POST /games`
- **THEN** its status code, response body, and content type match the behavior defined by its owning capability
- **AND** the response carries no documentation-specific fields

