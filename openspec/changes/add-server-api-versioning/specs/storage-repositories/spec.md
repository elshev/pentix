## MODIFIED Requirements

### Requirement: The server loads retained entities on startup

On startup the server SHALL load previously persisted users, games, and sessions from the configured repository so retained entities are available without being recreated.

#### Scenario: Previously created users survive a restart

- **GIVEN** a server configured with a durable repository has created a user
- **WHEN** the server restarts and loads from the same repository
- **THEN** `GET /v1/users` returns the previously created user

#### Scenario: A missing database starts empty

- **GIVEN** a durable repository whose database file does not yet exist
- **WHEN** the server starts
- **THEN** no retained entities are loaded and the server starts successfully
