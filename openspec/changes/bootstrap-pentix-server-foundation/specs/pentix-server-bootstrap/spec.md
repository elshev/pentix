## ADDED Requirements

### Requirement: The repository contains an empty PentixServer application
The repository SHALL include a dedicated PentixServer application scaffold that is separate from the browser application and can be started as a Node.js/TypeScript process.

The PentixServer scaffold SHALL:

- live in its own application directory,
- have a dedicated TypeScript entry point,
- integrate with repository-level scripts or workspace commands,
- and remain intentionally empty with respect to player management, PentixGame management, and PentixGame history APIs.

#### Scenario: A dedicated server application exists
- **GIVEN** the first foundation change has been implemented
- **WHEN** a developer inspects the repository structure
- **THEN** they can find a dedicated PentixServer application directory
- **AND** that application has its own startup entry point
- **AND** the repository provides a documented command to run it

#### Scenario: The first server increment remains empty
- **GIVEN** the PentixServer application has been created
- **WHEN** a developer reviews its implemented features
- **THEN** it does not yet provide player CRUD endpoints
- **AND** it does not yet provide PentixGame creation or next-piece endpoints
- **AND** it does not yet provide PentixGame history endpoints

### Requirement: PentixServer depends on shared game primitives instead of duplicating them
The PentixServer application SHALL consume the shared game-primitives package for `Piece` and `Board` concepts instead of defining its own independent piece catalog.

#### Scenario: Shared types are reused by the server
- **GIVEN** the shared game-primitives package exists
- **WHEN** a developer inspects the PentixServer application
- **THEN** the server imports the shared `Piece` and `Board` contracts from the shared package
- **AND** the server does not define a second copy of the piece catalog
