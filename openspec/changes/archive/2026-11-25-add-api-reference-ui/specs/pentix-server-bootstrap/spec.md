## MODIFIED Requirements

### Requirement: The repository contains a dedicated PentixServer application

The repository SHALL include a dedicated `PentixServer` application scaffold that is separate from the browser application and can be started as a Node.js/TypeScript process.

The scaffold SHALL:

- live in its own application directory,
- have a dedicated TypeScript entry point,
- integrate with repository-level scripts or workspace commands,
- expose exactly the endpoints defined by the capabilities that own them, without restating their request and response contracts here: `POST /games` and `POST /game-sessions/{id}/next-piece` (`game-lifecycle`), `POST /game-sessions` (`game-session-start`), the gameplay endpoints `POST /game-sessions/{id}/move`, `/rotate`, `/tick`, and `/drop` that map one-to-one to the `GameSessionEngine` operations in `gameplay-mechanics`, `POST /users`, `GET /users`, `GET /users/{id}` (`user-management`), `POST /demo-runs` and `GET /demo-runs/{id}` (`server-demo-run`), and `GET /openapi.json` and `GET /docs` (`api-reference`),
- serve its HTTP endpoints through an OpenAPI-aware Hono application (`OpenAPIHono`) mounted on a Node.js HTTP server via `@hono/node-server`, delegating routing, JSON serialization, and error handling to Hono, and declaring every route's path parameters, request bodies, and responses with the zod schemas that validate the request and generate the OpenAPI document,
- persist users, games, and sessions through the repositories defined by `storage-repositories`,
- and remain intentionally limited with respect to multiplayer orchestration and durable history APIs.

#### Scenario: A dedicated server application exists

- **GIVEN** the repository
- **WHEN** a developer inspects the repository structure and server entry points
- **THEN** they find a dedicated PentixServer application directory and startup entry point
- **AND** the repository provides a documented command to run it
- **AND** they can reach every endpoint's contract from the capability that owns it

#### Scenario: The server serves HTTP through an OpenAPI-aware Hono application

- **GIVEN** the PentixServer application is running
- **WHEN** a developer inspects its HTTP transport
- **THEN** each endpoint is registered as a declarative `OpenAPIHono` route served through `@hono/node-server`
- **AND** each route declares its parameters, request body, and responses with zod schemas
- **AND** every registered route appears in the document served by `GET /openapi.json`
- **AND** the server retains host and port as configurable server settings
- **AND** requests and responses keep the JSON shapes and status codes defined by the owning capabilities

#### Scenario: The demo-run endpoints belong to the demo capability

- **GIVEN** the PentixServer application is running
- **WHEN** a developer looks for the contract of `POST /demo-runs` or `GET /demo-runs/{id}`
- **THEN** that contract lives in `server-demo-run`
- **AND** the bootstrap spec does not restate its request body, statuses, or result shape

#### Scenario: The documentation endpoints belong to the API reference capability

- **GIVEN** the PentixServer application is running
- **WHEN** a developer looks for the contract of `GET /openapi.json` or `GET /docs`
- **THEN** that contract lives in `api-reference`
- **AND** the bootstrap spec only lists the two endpoints without restating their documents or UI behavior

## ADDED Requirements

### Requirement: Routes validate their declared request contracts

Every route that accepts a request body SHALL validate that body against the schema declared on the route before its handler runs. A body that fails validation SHALL produce `400 Bad Request` with a `{ message }` body, SHALL NOT invoke the handler, and SHALL leave retained state unchanged; the message SHALL name the offending field's rule, including the accepted `1` to `256` range for a demo run's `gameCount`.

A request whose body is present but whose `Content-Type` is not `application/json` or a `+json` type SHALL be rejected with `415 Unsupported Media Type` and a `{ message }` body. A body larger than 1 MiB SHALL be rejected with `400 Bad Request` and a `{ message }` body, and a body that is not valid JSON SHALL be rejected with `400 Bad Request` and a `{ message }` body. Transport rejections and domain rejections SHALL use the same `{ message }` envelope, and no rejection SHALL change retained state.

#### Scenario: An invalid body is rejected before the handler runs

- **GIVEN** a running `PentixServer` with retained users
- **WHEN** a client sends `POST /users` with `{ "name": 42 }`
- **THEN** the response status is `400`
- **AND** the body is `{ message }` naming the name rule
- **AND** `GET /users` still lists the same users

#### Scenario: A demo run outside the range is named

- **GIVEN** a running `PentixServer`
- **WHEN** a client sends `POST /demo-runs` with `{ "gameCount": 257 }`
- **THEN** the response status is `400`
- **AND** its message names the accepted `1` to `256` range
- **AND** no demo run is created

#### Scenario: A non-JSON content type is refused

- **GIVEN** a running `PentixServer`
- **WHEN** a client sends `POST /games` with a body and `Content-Type: text/plain`
- **THEN** the response status is `415`
- **AND** its body is `{ message }`
- **AND** no game is created

#### Scenario: Oversized and malformed bodies keep their answers

- **GIVEN** a running `PentixServer`
- **WHEN** a client sends a body larger than 1 MiB, or a body that is not valid JSON, to `POST /games`
- **THEN** each response status is `400`
- **AND** each body is `{ message }`
- **AND** the server keeps answering subsequent requests
