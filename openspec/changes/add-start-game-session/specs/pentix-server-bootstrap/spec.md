## MODIFIED Requirements

### Requirement: The repository contains an empty PentixServer application
The repository SHALL include a dedicated PentixServer application scaffold that is separate from the browser application and can be started as a Node.js/TypeScript process.

The PentixServer scaffold SHALL:

- live in its own application directory,
- have a dedicated TypeScript entry point,
- integrate with repository-level scripts or workspace commands,
- expose a documented `POST /game-sessions` bootstrap endpoint,
- and remain intentionally limited with respect to player management, multiplayer `PentixGame` orchestration, gameplay progression commands, and PentixGame history APIs.

#### Scenario: A dedicated server application exists
- **GIVEN** the session-start change has been implemented
- **WHEN** a developer inspects the repository structure and server entry points
- **THEN** they can find a dedicated PentixServer application directory
- **AND** that application has its own startup entry point
- **AND** the repository provides a documented command to run it
- **AND** the server now documents `POST /game-sessions` as its first supported endpoint

#### Scenario: The first functional server increment stays narrow
- **GIVEN** the PentixServer application exposes `POST /game-sessions`
- **WHEN** a developer reviews its implemented features
- **THEN** it does not yet provide player CRUD endpoints
- **AND** it does not yet provide gameplay move, tick, or line-clear endpoints
- **AND** it does not yet provide multiplayer `PentixGame` orchestration or history endpoints
