# pentix-server-bootstrap Specification

## Purpose

Describe the dedicated `PentixServer` application scaffold, the endpoints it exposes, and the deliberate boundaries of the current server increment.
## Requirements
### Requirement: PentixServer depends on shared game primitives instead of duplicating them
The PentixServer application SHALL consume the shared game-primitives package for `Piece` and `Board` concepts instead of defining its own independent piece catalog.

#### Scenario: Shared types are reused by the server

- **GIVEN** the shared game-primitives package exists
- **WHEN** a developer inspects the PentixServer application
- **THEN** the server imports the shared `Piece` and `Board` contracts from the shared package
- **AND** the server does not define a second copy of the piece catalog

### Requirement: The repository contains a dedicated PentixServer application

The repository SHALL include a dedicated `PentixServer` application scaffold that is separate from the browser application and can be started as a Node.js/TypeScript process.

The scaffold SHALL:

- live in its own application directory,
- have a dedicated TypeScript entry point,
- integrate with repository-level scripts or workspace commands,
- expose exactly the endpoints defined by the capabilities that own them, without restating their request and response contracts here. `game-lifecycle` owns `POST /games` and `POST /game-sessions/{id}/next-piece`, and `game-session-start` owns `POST /game-sessions`. `user-management` owns `POST /users`, `GET /users`, and `GET /users/{id}`. `gameplay-mechanics` owns the gameplay endpoints `POST /game-sessions/{id}/move`, `/rotate`, `/tick`, and `/drop`, which map one-to-one to the `GameSessionEngine` operations. `server-demo-run` owns `POST /demo-runs` and `GET /demo-runs/{id}`, and `api-reference` owns `GET /openapi.json` and `GET /docs`,
- serve its HTTP endpoints through an OpenAPI-aware Hono application (`OpenAPIHono`) mounted on a Node.js HTTP server via `@hono/node-server`. The application delegates routing, JSON serialization, and error handling to Hono. It declares every route's path parameters, request bodies, and responses with the zod schemas that validate the request and generate the OpenAPI document,
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

### Requirement: The functional server increment stays narrow

The PentixServer application SHALL provide user management, game creation, session start, next-piece, gameplay, and demo-run endpoints. It SHALL durably persist users, games, and sessions through the engine-agnostic repositories. Its demo runs SHALL keep their games, sessions, and standings in memory only, outside those repositories. It SHALL NOT provide durable history or multiplayer orchestration.

- **GIVEN** the PentixServer application exposes game, session, gameplay, and user endpoints
- **WHEN** a developer reviews its implemented features
- **THEN** it provides user create, list, and get endpoints, requires a `userId` when starting a session, and provides gameplay move, rotate, tick, and drop endpoints
- **AND** it durably persists users, games, and sessions through engine-agnostic repositories
- **AND** it can play demo batches on demand through `POST /demo-runs`, keeping their sessions and standings in memory only and out of those repositories
- **AND** it does not provide durable history or multiplayer orchestration

#### Scenario: Demo runs stay out of the storage layer

- **GIVEN** a server started with any storage implementation
- **WHEN** a demo run completes
- **THEN** no user, game, or session repository was written by that run
- **AND** the server's storage contracts are unchanged by the demo-run capability

### Requirement: Routes validate their declared request contracts

Every route that accepts a request body SHALL validate that body against the schema declared on the route before its handler runs. A body that fails validation SHALL produce `400 Bad Request` with a `{ message }` body, SHALL NOT invoke the handler, and SHALL leave retained state unchanged. The message SHALL name the offending field's rule, including the accepted `1` to `256` range for a demo run's `gameCount`.

A request whose body is present but whose `Content-Type` is not `application/json` or a `+json` type SHALL be rejected with `415 Unsupported Media Type` and a `{ message }` body. A body larger than 1 MiB SHALL be rejected with `400 Bad Request` and a `{ message }` body. A body that is not valid JSON SHALL be rejected with `400 Bad Request` and a `{ message }` body. Transport rejections and domain rejections SHALL use the same `{ message }` envelope, and no rejection SHALL change retained state.

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

