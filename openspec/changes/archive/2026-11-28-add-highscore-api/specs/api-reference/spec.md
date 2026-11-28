## MODIFIED Requirements

### Requirement: PentixServer publishes a machine-readable OpenAPI document

`PentixServer` SHALL serve `GET /openapi.json` with `200 OK` and an OpenAPI
`3.1.0` JSON document. The document SHALL describe every API endpoint the
server exposes — `POST /games`, `POST /game-sessions`,
`POST /game-sessions/{id}/next-piece`, `POST /game-sessions/{id}/move`,
`POST /game-sessions/{id}/rotate`, `POST /game-sessions/{id}/tick`,
`POST /game-sessions/{id}/drop`, `POST /users`, `GET /users`, `GET /users/{id}`,
`POST /demo-runs`, `GET /demo-runs/{id}`, and `GET /high-scores` — without
restating their business rules. The two documentation endpoints SHALL be
excluded from the document, so the console lists API operations only.

Each operation in the document SHALL carry its HTTP method, path, and a summary.
It SHALL carry a tag that groups the operation with the capability that owns it.
It SHALL carry its path parameters and its request body schema when it accepts
one. It SHALL carry the response schemas for the status codes it returns. The
document SHALL be generated from the same zod schemas that the routes use to
validate requests. It SHALL NOT be a separately maintained file. The document's
`servers` entry SHALL be the origin of the request that fetched it. A client that
executes operations from the document then targets the running host and port.

#### Scenario: The document lists every endpoint

- **GIVEN** a running `PentixServer`
- **WHEN** a client fetches `GET /openapi.json`
- **THEN** the response status is `200`
- **AND** its `paths` contain every endpoint listed in this requirement with the correct HTTP methods
- **AND** every operation carries a summary and a tag

#### Scenario: The high-score operation is documented

- **GIVEN** a running `PentixServer`
- **WHEN** the document is read
- **THEN** it lists `GET /v1/high-scores`
- **AND** that operation carries the `High scores` tag
- **AND** it documents the required `type` query parameter and the `200` and
  `400` response schemas

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
