## MODIFIED Requirements

### Requirement: The server starts demo batches on demand

`PentixServer` SHALL expose `POST /v1/demo-runs` that starts a demo batch in the background and answers `202 Accepted` with the new run's snapshot. The request body SHALL be optional and SHALL accept one field, `gameCount`, which is the number of games the batch plays. An absent field SHALL mean `1`. A supplied value SHALL be an integer from `1` to `256`. The server SHALL reject any other value with `400 Bad Request` and a message that names the accepted range. Zero, a negative number, a fraction, a string, `null`, or a value more than `256` are such other values. The endpoint SHALL NOT play a game before it responds, SHALL NOT require a user, game, or session id, and SHALL have no UI counterpart.

#### Scenario: A run starts with the default game count

- **GIVEN** a running `PentixServer` and a request body without `gameCount`
- **WHEN** a caller posts to `/v1/demo-runs`
- **THEN** the response status is `202`
- **AND** its snapshot reports `gameCount` `1`
- **AND** the snapshot id is a UUIDv7

#### Scenario: The maximum batch is accepted

- **GIVEN** a request body of `{ "gameCount": 256 }`
- **WHEN** a caller posts to `/v1/demo-runs`
- **THEN** the response status is `202`
- **AND** the snapshot reports `gameCount` `256`

#### Scenario: An invalid game count is rejected

- **GIVEN** a request body whose `gameCount` is `0`, `257`, `1.5`, or `"3"`
- **WHEN** a caller posts to `/v1/demo-runs`
- **THEN** the response status is `400`
- **AND** the message names the accepted `1` to `256` range
- **AND** no run is created

#### Scenario: The response arrives before the games are played

- **GIVEN** a fresh run of `2` games
- **WHEN** the `POST /v1/demo-runs` response is received
- **THEN** the reported status is `queued` or `running`
- **AND** its `completedGameCount` is less than `2`

### Requirement: A run reports its status while it plays

`GET /v1/demo-runs/{id}` SHALL return `200 OK` with the run's snapshot, `404 Not Found` for a run id that is unknown, and `400 Bad Request` for an id that is not a UUIDv7 value. The snapshot SHALL carry `id`, `status`, `gameCount`, `completedGameCount`, `engines`, and `standings`, plus `error` only when the status is `failed`. `status` SHALL be `queued`, `running`, `completed`, or `failed`. `completedGameCount` SHALL count only fully played games, SHALL never decrease, and SHALL be `0` until the first game ends. `standings` SHALL be an empty array until the status becomes `completed`. A failed run SHALL carry a message naming the cause and SHALL publish no standings.

#### Scenario: A fresh run is queued

- **GIVEN** a run that was just created
- **WHEN** its id is fetched immediately
- **THEN** the status is `queued` or `running`
- **AND** `standings` is empty

#### Scenario: Progress is visible

- **GIVEN** a run of `2` games still playing
- **WHEN** its id is fetched after the first game ends
- **THEN** `completedGameCount` is `1`
- **AND** the status is `running`
- **AND** `standings` is still empty

#### Scenario: A completed run publishes its standings

- **GIVEN** a run whose last game ended
- **WHEN** its id is fetched
- **THEN** the status is `completed`
- **AND** `completedGameCount` equals `gameCount`
- **AND** `standings` holds one line per engine

#### Scenario: Unknown and malformed ids are rejected

- **GIVEN** an id that no run uses, and an id that is not a UUID
- **WHEN** either is fetched
- **THEN** the response status is `404` for the unknown id
- **AND** `400` for the malformed id

#### Scenario: Runs execute one at a time

- **GIVEN** two runs started back to back
- **WHEN** both are fetched while the first is still playing
- **THEN** only the first reports `running`
- **AND** the second reports `queued`
