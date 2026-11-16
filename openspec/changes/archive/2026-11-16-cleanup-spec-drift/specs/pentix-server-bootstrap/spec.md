## ADDED Requirements

### Requirement: The repository contains a dedicated PentixServer application

The repository SHALL include a dedicated `PentixServer` application scaffold that is separate from the browser application and can be started as a Node.js/TypeScript process.

The scaffold SHALL:

- live in its own application directory,
- have a dedicated TypeScript entry point,
- integrate with repository-level scripts or workspace commands,
- expose exactly the endpoints defined by the capabilities that own them, without restating their request and response contracts here: `POST /games` and `POST /game-sessions/{id}/next-piece` (`game-lifecycle`), `POST /game-sessions` (`game-session-start`), the gameplay endpoints `POST /game-sessions/{id}/move`, `/rotate`, `/tick`, and `/drop` that map one-to-one to the `GameSessionEngine` operations in `gameplay-mechanics`, and `POST /users`, `GET /users`, `GET /users/{id}` (`user-management`),
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

#### Scenario: The functional server increment stays narrow

- **GIVEN** the PentixServer application exposes game, session, gameplay, and user endpoints
- **WHEN** a developer reviews its implemented features
- **THEN** it provides user create, list, and get endpoints, requires a `userId` when starting a session, and provides gameplay move, rotate, tick, and drop endpoints
- **AND** it durably persists users, games, and sessions through engine-agnostic repositories
- **AND** it does not provide durable history or multiplayer orchestration

## REMOVED Requirements

### Requirement: The repository contains an empty PentixServer application

**Reason**: The title described a scaffold that no longer exists (the server ships user, game, session, and gameplay endpoints), the requirement re-listed every route that four other capabilities already define, and its scenario was gated on "the game lifecycle change has been implemented" — a completed change used as a precondition. The route list is exactly the kind of duplicated contract that drifts when an endpoint is added.

**Migration**: Use "The repository contains a dedicated PentixServer application"; its endpoint bullet names the owning capability for each route instead of restating the contract.
