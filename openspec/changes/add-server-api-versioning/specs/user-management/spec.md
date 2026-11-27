## MODIFIED Requirements

### Requirement: PentixServer manages users through REST

`PentixServer` SHALL expose `POST /v1/users` to create and retain a user, `GET /v1/users` to list retained users, and `GET /v1/users/{id}` to fetch a single user.

`POST /v1/users` SHALL require a JSON object body with a non-empty string `name`. It SHALL return `201 Created` with the user JSON (`id` and `name`) on success. It SHALL return `400 Bad Request` for invalid JSON, a non-object body, or a missing, empty, or non-string `name`.

`GET /v1/users` SHALL return `200 OK` with an object whose `users` array contains all retained users, and SHALL return an empty `users` array when none exist.

`GET /v1/users/{id}` SHALL return `200 OK` with the user JSON for a known user. It SHALL return `400 Bad Request` for a malformed id. It SHALL return `404 Not Found` for a well-formed id that does not identify a retained user.

#### Scenario: A client creates a user

- **GIVEN** `PentixServer` is running
- **WHEN** a client sends `POST /v1/users` with `{ "name": "Ada" }`
- **THEN** the server responds with `201 Created`
- **AND** the response has a UUIDv7 `id` and `name` `"Ada"`

#### Scenario: User creation requires a name

- **GIVEN** `PentixServer` is running
- **WHEN** a client sends `POST /v1/users` without a `name`, with an empty or whitespace-only `name`, or with a non-string `name`
- **THEN** the server responds with `400 Bad Request`
- **AND** no user is created

#### Scenario: A client lists users

- **GIVEN** two users have been created
- **WHEN** a client sends `GET /v1/users`
- **THEN** the server responds with `200 OK`
- **AND** the response `users` array contains both retained users

#### Scenario: A client fetches a known user

- **GIVEN** a user has been created
- **WHEN** a client sends `GET /v1/users/{id}` with that user's id
- **THEN** the server responds with `200 OK` and that user's JSON

#### Scenario: An unknown user is not found

- **GIVEN** no retained user has the well-formed UUIDv7 supplied by a client
- **WHEN** the client sends `GET /v1/users/{id}` with that id
- **THEN** the server responds with `404 Not Found`

### Requirement: User names are unique

`POST /v1/users` SHALL reject a request whose trimmed `name` matches an existing user's name case-insensitively, returning `409 Conflict` and creating no new user.

#### Scenario: A duplicate name is rejected

- **GIVEN** a user named `"Ada"` already exists
- **WHEN** a client sends `POST /v1/users` with `{ "name": "ada" }`
- **THEN** the server responds with `409 Conflict`
- **AND** no new user is created
