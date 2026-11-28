## MODIFIED Requirements

### Requirement: A finished demo session is stored with its action log

`DemoRunService` SHALL store one `PentixGame` for every game of a run. It SHALL
store one `SessionActionLog` for every engine's session when that session reaches
`game-over`. The game SHALL be written before a session log that references it.
The log SHALL carry the session id, the engine's AI user id as `userId`, the game
id, the opening level as `level`, the seed column as `seedColumn`, and `pieces`.
`pieces` SHALL hold every code that playback applied, including `T`. The service
SHALL write each log once, after that session ends. It SHALL submit one
high-score row for that session after the log write. It SHALL NOT write a log or
a high-score row for a session that has not ended. A log write failure SHALL
fail the run, SHALL publish no standings, and SHALL keep the rows that earlier
finished sessions wrote. A high-score submission failure SHALL fail the run in
the same way and SHALL keep the session log that it already wrote.

#### Scenario: One game seeds one log per engine

- **GIVEN** two stub engines and a run of `1` game
- **WHEN** the run completes
- **THEN** the store holds one new game row
- **AND** it holds two new session logs
- **AND** each log reports its engine's AI user as `userId`

#### Scenario: A log is written once, when the session ends

- **GIVEN** a run with a stub engine that plays to `game-over`
- **WHEN** the run completes
- **THEN** each session id appears in the store exactly once
- **AND** no session row existed while the run was queued

#### Scenario: The log carries actions and ticks

- **GIVEN** a stored demo session log
- **WHEN** its `pieces` are inspected
- **THEN** every action is one of `T`, `L`, `R`, `C`, `A`, and `H`
- **AND** at least one `T` code appears for a piece that fell under gravity

#### Scenario: Every finished demo session reaches the AI table

- **GIVEN** a run of `1` game over two stub engines
- **WHEN** the run completes
- **THEN** the high-score table holds one `ai` row per finished session
- **AND** each row carries that session's `statistics.score`

#### Scenario: A storage failure fails the run

- **GIVEN** a session repository whose `create` rejects
- **WHEN** a run reaches its first finished session
- **THEN** the run reports `failed`
- **AND** the snapshot carries the storage error message

#### Scenario: A high-score failure fails the run

- **GIVEN** a high-score repository whose `submit` rejects
- **WHEN** a run reaches its first finished session
- **THEN** the run reports `failed`
- **AND** the snapshot carries the storage error message
- **AND** the session log for that session is still stored
