## Purpose

Describe the dedicated `PentixServer` application scaffold, the endpoints it exposes, and the deliberate boundaries of the current server increment.
## Requirements
### Requirement: The repository contains an empty PentixServer application
The repository SHALL include a dedicated PentixServer application scaffold that is separate from the browser application and can be started as a Node.js/TypeScript process.

The PentixServer scaffold SHALL:

- live in its own application directory,
- have a dedicated TypeScript entry point,
- integrate with repository-level scripts or workspace commands,
- expose documented `POST /games`, `POST /game-sessions` (with a required `userId`), `POST /game-sessions/{id}/next-piece`, `POST /users`, `GET /users`, and `GET /users/{id}` endpoints,
- use a named internal base constant when parsing relative request URLs while retaining host and port as server settings,
- and remain intentionally limited with respect to durable persistence, multiplayer orchestration, gameplay movement, and history APIs.

#### Scenario: A dedicated server application exists
- **GIVEN** the game lifecycle change has been implemented
- **WHEN** a developer inspects the repository structure and server entry points
- **THEN** they can find a dedicated PentixServer application directory and startup entry point
- **AND** the repository provides a documented command to run it
- **AND** the server documents game creation, session creation with a required user, next-piece advancement, and user management as supported endpoints

#### Scenario: The functional server increment stays narrow
- **GIVEN** the PentixServer application exposes game, session, and user endpoints
- **WHEN** a developer reviews its implemented features
- **THEN** it provides user create, list, and get endpoints and requires a `userId` when starting a session
- **AND** it does not provide gameplay move, tick, or line-clear endpoints
- **AND** it does not provide durable history, multiplayer orchestration, or restart-safe persistence

### Requirement: PentixServer depends on shared game primitives instead of duplicating them
The PentixServer application SHALL consume the shared game-primitives package for `Piece` and `Board` concepts instead of defining its own independent piece catalog.

#### Scenario: Shared types are reused by the server
- **GIVEN** the shared game-primitives package exists
- **WHEN** a developer inspects the PentixServer application
- **THEN** the server imports the shared `Piece` and `Board` contracts from the shared package
- **AND** the server does not define a second copy of the piece catalog

