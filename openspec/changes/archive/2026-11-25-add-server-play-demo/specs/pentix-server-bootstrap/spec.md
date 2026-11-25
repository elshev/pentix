## MODIFIED Requirements

### Requirement: The repository contains a dedicated PentixServer application

The repository SHALL include a dedicated `PentixServer` application scaffold that is separate from the browser application and can be started as a Node.js/TypeScript process.

The scaffold SHALL:

- live in its own application directory,
- have a dedicated TypeScript entry point,
- integrate with repository-level scripts or workspace commands,
- expose exactly the endpoints defined by the capabilities that own them, without restating their request and response contracts here: `POST /games` and `POST /game-sessions/{id}/next-piece` (`game-lifecycle`), `POST /game-sessions` (`game-session-start`), the gameplay endpoints `POST /game-sessions/{id}/move`, `/rotate`, `/tick`, and `/drop` that map one-to-one to the `GameSessionEngine` operations in `gameplay-mechanics`, `POST /users`, `GET /users`, `GET /users/{id}` (`user-management`), and `POST /demo-runs` and `GET /demo-runs/{id}` (`server-demo-run`),
- serve its HTTP endpoints through a Hono application mounted on a Node.js HTTP server via `@hono/node-server`, delegating routing, JSON serialization, and error handling to Hono while retaining host and port as server settings,
- persist users, games, and sessions through the repositories defined by `storage-repositories`,
- and remain intentionally limited with respect to multiplayer orchestration and durable history APIs.

#### Scenario: A dedicated server application exists

- **GIVEN** the repository
- **WHEN** a developer inspects the repository structure and server entry points
- **THEN** they find a dedicated PentixServer application directory and startup entry point
- **AND** the repository provides a documented command to run it
- **AND** they can reach every endpoint's contract from the capability that owns it

#### Scenario: The server serves HTTP through a Hono application

- **GIVEN** the PentixServer application is running
- **WHEN** a developer inspects its HTTP transport
- **THEN** each endpoint is registered as a declarative Hono route served through `@hono/node-server`
- **AND** the server retains host and port as configurable server settings
- **AND** requests and responses keep the JSON shapes and status codes defined by the owning capabilities

#### Scenario: The demo-run endpoints belong to the demo capability

- **GIVEN** the PentixServer application is running
- **WHEN** a developer looks for the contract of `POST /demo-runs` or `GET /demo-runs/{id}`
- **THEN** that contract lives in `server-demo-run`
- **AND** the bootstrap spec does not restate its request body, statuses, or result shape

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

