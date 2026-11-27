## MODIFIED Requirements

### Requirement: PentixServer can start a game session through REST

`PentixServer` SHALL expose `POST /v1/game-sessions` as the supported endpoint for creating and retaining a new `PentixGameSession`. The required JSON `userId` field SHALL identify a retained `User`. The optional JSON `gameId` field SHALL select the parent game. An omitted or null `gameId`, or an empty/whitespace-only `gameId`, SHALL cause a new game to be initialized. A supplied valid ID SHALL reuse the existing game.

The endpoint SHALL:

- return `201 Created` on success,
- return a JSON body that matches the shared `PentixGameSession` snapshot contract,
- create a fresh independent session with a UUIDv7 `id` for each successful request,
- return `400 Bad Request` for invalid JSON, invalid field types, a missing, non-string, or malformed `userId`, or a malformed nonempty `gameId`,
- return `404 Not Found` for a well-formed `userId` that does not identify a retained user,
- and return `404 Not Found` for a well-formed `gameId` that does not identify a retained game.

#### Scenario: The server requires an assigned user to start a session

- **GIVEN** `PentixServer` is running
- **WHEN** a client sends `POST /v1/game-sessions` without a `userId` or with a malformed `userId`
- **THEN** the server responds with `400 Bad Request`
- **AND** no session is created

#### Scenario: The server returns a session with a newly initialized game

- **GIVEN** `PentixServer` is running and a user has been created
- **WHEN** a client sends `POST /v1/game-sessions` with that user's `userId` and no `gameId`
- **THEN** the server responds with `201 Created`
- **AND** the response is an opening `PentixGameSession` whose `userId` equals the user id and whose UUIDv7 `gameId` identifies a newly retained game

#### Scenario: The server reuses a requested game

- **GIVEN** a client has created a user and a game
- **WHEN** the client sends `POST /v1/game-sessions` with that user's `userId` and that game's ID in JSON
- **THEN** the server responds with `201 Created`
- **AND** the session's `gameId` equals the supplied ID, its `userId` equals the user id, and its pieces come from that game's sequence

#### Scenario: Repeated start requests produce distinct sessions

- **GIVEN** `PentixServer` is running and a user has been created
- **WHEN** a client sends `POST /v1/game-sessions` twice with that user's `userId`
- **THEN** each response contains a different UUIDv7 session `id`
- **AND** each returned session starts from its own empty opening state rather than sharing mutable session data

#### Scenario: An unknown user is rejected

- **GIVEN** no retained user has the well-formed UUIDv7 supplied by a client
- **WHEN** the client sends `POST /v1/game-sessions` with that `userId`
- **THEN** the server responds with `404 Not Found`
- **AND** no session is created

#### Scenario: An unknown game is rejected

- **GIVEN** a user has been created and no retained game has the well-formed UUIDv7 supplied by a client
- **WHEN** the client sends `POST /v1/game-sessions` with the user's `userId` and that `gameId`
- **THEN** the server responds with `404 Not Found`
- **AND** no session is created
