# user-management Specification

## Purpose

Define the shared `User` primitive and the `PentixServer` endpoints that create, list, and fetch retained users.
## Requirements
### Requirement: A JSON-serializable User entity exists
The shared `pentix-core` package SHALL define a JSON-serializable `User` with a UUIDv7 string `id`, a non-empty trimmed `name`, and a `type` of `human` or `ai`. The user factory SHALL reject an empty or whitespace-only `id` or `name`. The factory SHALL default `type` to `human` when the caller omits it. An AI user SHALL carry an optional `engineId` naming its demo engine, and the factory SHALL reject an empty or whitespace-only `engineId`.

#### Scenario: A user is created with identity and name

- **GIVEN** a caller creates a `User` with a UUIDv7 `id` and a non-empty `name`
- **WHEN** the returned user is inspected
- **THEN** it exposes the supplied `id` and `name`
- **AND** it reports `type` `human`

#### Scenario: A user requires a non-empty name

- **GIVEN** a caller attempts to create a `User` with an empty or whitespace-only `name`
- **WHEN** the factory runs
- **THEN** it rejects with an error
- **AND** no user is created

#### Scenario: An AI user keeps its engine binding

- **GIVEN** a caller creates a `User` with `type` `ai` and `engineId` `delphi5`
- **WHEN** the returned user is inspected
- **THEN** it reports `type` `ai` and `engineId` `delphi5`

#### Scenario: An empty engine id is rejected

- **GIVEN** a caller creates a `User` with an `engineId` of `"   "`
- **WHEN** the factory runs
- **THEN** it rejects with an error
- **AND** no user is created

### Requirement: PentixServer manages users through REST
`PentixServer` SHALL expose `POST /v1/users` to create and retain a user, `GET /v1/users` to list retained users, and `GET /v1/users/{id}` to fetch a single user.

`POST /v1/users` SHALL require a JSON object body with a non-empty string `name`. It SHALL return `201 Created` with the user JSON on success. That JSON SHALL carry `id`, `name`, and `type`, and a created user SHALL report `type` `human` with no `engineId`. A `type` in the request body SHALL NOT change the stored type. The endpoint SHALL return `400 Bad Request` for invalid JSON, a non-object body, or a missing, empty, or non-string `name`.

`GET /v1/users` SHALL return `200 OK` with an object whose `users` array contains all retained users, including the AI users of the registered demo engines. It SHALL return an empty `users` array when none exist. Every entry SHALL carry `type`, and an AI entry SHALL also carry `engineId`.

`GET /v1/users/{id}` SHALL return `200 OK` with the user JSON for a known user, whether that user is `human` or `ai`. It SHALL return `400 Bad Request` for a malformed id. It SHALL return `404 Not Found` for a well-formed id that does not identify a retained user.

#### Scenario: A client creates a user

- **GIVEN** `PentixServer` is running
- **WHEN** a client sends `POST /v1/users` with `{ "name": "Ada" }`
- **THEN** the server responds with `201 Created`
- **AND** the response has a UUIDv7 `id`, `name` `"Ada"`, and `type` `"human"`
- **AND** it has no `engineId`

#### Scenario: User creation requires a name

- **GIVEN** `PentixServer` is running
- **WHEN** a client sends `POST /v1/users` without a `name`, with an empty or whitespace-only `name`, or with a non-string `name`
- **THEN** the server responds with `400 Bad Request`
- **AND** no user is created

#### Scenario: A client lists users

- **GIVEN** two human users have been created and one demo engine is registered
- **WHEN** a client sends `GET /v1/users`
- **THEN** the server responds with `200 OK`
- **AND** the response `users` array contains both human users
- **AND** it also contains the engine's AI user with its `engineId`

#### Scenario: A client fetches a known user

- **GIVEN** a user has been created
- **WHEN** a client sends `GET /v1/users/{id}` with that user's id
- **THEN** the server responds with `200 OK` and that user's JSON
- **AND** that JSON carries the user's `type`

#### Scenario: An AI user is readable like any other user

- **GIVEN** the server seeded an AI user for engine `delphi5`
- **WHEN** a client sends `GET /v1/users/{id}` with that user's id
- **THEN** the server responds with `200 OK`
- **AND** the JSON reports `type` `ai` and `engineId` `delphi5`

#### Scenario: An unknown user is not found

- **GIVEN** no retained user has the well-formed UUIDv7 supplied by a client
- **WHEN** the client sends `GET /v1/users/{id}` with that id
- **THEN** the server responds with `404 Not Found`

### Requirement: User names are unique
`POST /users` SHALL reject a request whose trimmed `name` matches an existing user's name case-insensitively, returning `409 Conflict` and creating no new user.

#### Scenario: A duplicate name is rejected

- **GIVEN** a user named `"Ada"` already exists
- **WHEN** a client sends `POST /users` with `{ "name": "ada" }`
- **THEN** the server responds with `409 Conflict`
- **AND** no new user is created

