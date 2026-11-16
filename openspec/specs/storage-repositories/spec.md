# storage-repositories Specification

## Purpose
Define the engine-agnostic persistence contract for users, games, and sessions, with durable SQLite and non-durable in-memory implementations that `PentixServer` reloads at startup and writes to on every successful state change.
## Requirements
### Requirement: Engine-agnostic repository interfaces for each entity

The server SHALL define repository interfaces for users, games, and sessions that expose create, read, and (where needed) save operations without referencing any specific storage engine. Application code SHALL depend only on these interfaces.

#### Scenario: Application code depends on interfaces, not engines

- **GIVEN** the server's persistence layer
- **WHEN** the HTTP or lifecycle code stores or loads an entity
- **THEN** it calls a repository interface method
- **AND** no concrete storage engine appears in that code path

### Requirement: Users, games, and sessions are stored separately

The system SHALL store users, games, and sessions as separate collections. A game's piece sequence SHALL be stored as a single field containing the ordered list of its piece IDs.

#### Scenario: A game persists its sequence as one field

- **GIVEN** a game with a piece sequence
- **WHEN** it is saved to and reloaded from storage
- **THEN** its piece sequence is recovered as one ordered list equal to the original

#### Scenario: Entities live in distinct collections

- **GIVEN** stored users, games, and sessions
- **WHEN** a consumer lists or fetches one kind of entity
- **THEN** the other kinds are not interleaved into the result

### Requirement: SQLite and in-memory implementations share the interface

A SQLite-backed implementation SHALL persist each entity to durable storage and reload it, and an in-memory implementation SHALL provide the same interface for tests and non-durable runs.

#### Scenario: SQLite round-trips entities

- **GIVEN** a SQLite-backed repository with saved entities
- **WHEN** a new repository instance loads from the same database
- **THEN** the loaded entities equal the saved entities

#### Scenario: In-memory retains nothing across instances

- **GIVEN** an in-memory repository to which entities were saved
- **WHEN** a new instance loads
- **THEN** the loaded collections are empty

### Requirement: The server loads retained entities on startup

On startup the server SHALL load previously persisted users, games, and sessions from the configured repository so retained entities are available without being recreated.

#### Scenario: Previously created users survive a restart

- **GIVEN** a server configured with a durable repository has created a user
- **WHEN** the server restarts and loads from the same repository
- **THEN** `GET /users` returns the previously created user

#### Scenario: A missing database starts empty

- **GIVEN** a durable repository whose database file does not yet exist
- **WHEN** the server starts
- **THEN** no retained entities are loaded and the server starts successfully

### Requirement: State-changing operations are persisted

The server SHALL persist through the matching repository after every successful state-changing operation (creating a user, game, or session, and each gameplay mutation).

#### Scenario: A created entity is durable

- **GIVEN** a durable server
- **WHEN** a client creates a user, game, or session
- **THEN** the entity is retrievable after a restart
- **AND** its identity and relationships are preserved

