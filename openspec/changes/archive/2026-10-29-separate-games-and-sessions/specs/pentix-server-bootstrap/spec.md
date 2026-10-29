## MODIFIED Requirements

### Requirement: The repository contains an empty PentixServer application
The repository SHALL include a dedicated PentixServer application scaffold that is separate from the browser application and can be started as a Node.js/TypeScript process.

The PentixServer scaffold SHALL:

- live in its own application directory,
- have a dedicated TypeScript entry point,
- integrate with repository-level scripts or workspace commands,
- expose documented `POST /games`, `POST /game-sessions`, and `POST /game-sessions/{id}/next-piece` endpoints,
- use a named internal base constant when parsing relative request URLs while retaining host and port as server settings,
- and remain intentionally limited with respect to player management, durable persistence, multiplayer orchestration, gameplay movement, and history APIs.

#### Scenario: A dedicated server application exists
- **GIVEN** the game lifecycle change has been implemented
- **WHEN** a developer inspects the repository structure and server entry points
- **THEN** they can find a dedicated PentixServer application directory and startup entry point
- **AND** the repository provides a documented command to run it
- **AND** the server documents game creation, session creation, and next-piece advancement as supported endpoints

#### Scenario: The functional server increment stays narrow
- **GIVEN** the PentixServer application exposes game and session lifecycle endpoints
- **WHEN** a developer reviews its implemented features
- **THEN** it does not provide player CRUD or user-assignment endpoints
- **AND** it does not provide gameplay move, tick, or line-clear endpoints
- **AND** it does not provide durable history, multiplayer orchestration, or restart-safe persistence
