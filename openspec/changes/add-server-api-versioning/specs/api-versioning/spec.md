## ADDED Requirements

### Requirement: Every API endpoint lives under the `/v1` prefix

`PentixServer` SHALL expose each REST endpoint under the `/v1` path prefix. The endpoints are:

- `POST /v1/games`
- `POST /v1/game-sessions`
- `POST /v1/game-sessions/{id}/next-piece`
- `POST /v1/game-sessions/{id}/move`
- `POST /v1/game-sessions/{id}/rotate`
- `POST /v1/game-sessions/{id}/tick`
- `POST /v1/game-sessions/{id}/drop`
- `POST /v1/users`
- `GET /v1/users`
- `GET /v1/users/{id}`
- `POST /v1/demo-runs`
- `GET /v1/demo-runs/{id}`
One exported constant SHALL hold the prefix. Every route config SHALL build its path from that constant, and no route config SHALL repeat the prefix as a literal. The version SHALL appear only in the path. The server SHALL NOT read a version from a request header or a query parameter. It SHALL NOT add a version field to a response body or to a response `Content-Type`.


The two documentation endpoints `GET /docs` and `GET /openapi.json` SHALL stay outside the prefix, because they describe the server rather than one API version.

#### Scenario: A versioned endpoint answers

- **GIVEN** a running `PentixServer`
- **WHEN** a client sends `POST /v1/users` with `{ "name": "Ada" }`
- **THEN** the response status is `201`
- **AND** the response body is the created user

#### Scenario: Every route carries the prefix

- **GIVEN** the server's route table
- **WHEN** a developer inspects the registered method-and-path pairs
- **THEN** every API path starts with `/v1`
- **AND** no API path repeats the prefix
- **AND** no documentation path starts with the prefix

#### Scenario: The version lives only in the path

- **GIVEN** a valid request to a versioned endpoint
- **WHEN** a reviewer inspects the request and the response
- **THEN** no request header selects the version
- **AND** no query parameter selects the version
- **AND** the response body and `Content-Type` carry no version marker

### Requirement: An unprefixed or unknown-version path is not found

A request whose path lacks the `/v1` prefix SHALL NOT reach any API handler. The same rule applies when the first segment names another version, such as `/v2` or `/v0`. The server SHALL answer `404 Not Found` with its `{ service, method, path, message }` envelope.
The message SHALL name the versioned endpoints and the two documentation endpoints. The server SHALL NOT redirect an unprefixed path to its versioned form. It SHALL NOT alias an unprefixed path to a handler, and it SHALL NOT change retained state for such a request.


#### Scenario: An unprefixed path is not found

- **GIVEN** a running `PentixServer`
- **WHEN** a client sends `POST /users` with `{ "name": "Ada" }`
- **THEN** the response status is `404`
- **AND** the message names `POST /v1/users`, `GET /docs`, and `GET /openapi.json`
- **AND** the user list stays unchanged

#### Scenario: An unknown version is not found

- **GIVEN** a running `PentixServer`
- **WHEN** a client sends `GET /v2/users` or `GET /v0/users`
- **THEN** each response status is `404`
- **AND** the response is the not-found envelope rather than a redirect

### Requirement: The OpenAPI document reports the API version

The OpenAPI document served at `GET /openapi.json` SHALL report the current API version in its `info.version` field as `1.0.0`. The value SHALL come from the same version constant that produces the path prefix.

Every documented operation path SHALL start with `/v1`. The document SHALL describe the versioned paths, and it SHALL NOT describe an unprefixed form of an API operation.

#### Scenario: The document reports version 1.0.0

- **GIVEN** a running `PentixServer`
- **WHEN** a client fetches `GET /openapi.json`
- **THEN** `info.version` is `1.0.0`

#### Scenario: The document lists only versioned paths

- **GIVEN** the fetched OpenAPI document
- **WHEN** a client inspects its `paths` keys
- **THEN** every API path starts with `/v1`
- **AND** `/docs` and `/openapi.json` do not appear as operations

### Requirement: A published version never changes in place

A breaking contract change SHALL ship under a new major path prefix. A breaking change is a removed or renamed request or response field, a changed field type, or a changed status code for an existing request. After such a change, the `/v1` endpoints SHALL keep their request shapes, response shapes, and status codes.

An additive change SHALL stay inside `/v1`. Such a change is a new endpoint, a new optional request field, or a new response field. A handler SHALL NOT branch on the version prefix.

#### Scenario: A breaking change moves to a new prefix

- **GIVEN** a planned change that removes a documented response field
- **WHEN** the change ships
- **THEN** it is reachable only under a new major prefix
- **AND** the `/v1` responses keep the field

#### Scenario: An additive change stays in `/v1`

- **GIVEN** a planned new optional request field
- **WHEN** the change ships
- **THEN** the existing `/v1` paths accept the request with and without the field
