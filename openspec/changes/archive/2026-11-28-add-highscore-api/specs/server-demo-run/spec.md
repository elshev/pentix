## MODIFIED Requirements

### Requirement: A run record lives in memory and its demo sessions are durable

A run's own record SHALL stay in server memory. That record holds `status`,
`gameCount`, `completedGameCount`, `engines`, and `standings`. Finished runs
SHALL remain bounded to the `32` most recent completions. A restart SHALL forget
every run id, so a forgotten or evicted id SHALL answer `404`. The run's
`PentixGame` rows, its per-engine `SessionActionLog` rows, and its per-session
high-score rows SHALL be durable in the storage that the server was started
with. A high-score submission failure SHALL fail the run. The run SHALL NOT
create, update, or remove a human user, a retained human game, a retained human
session, or a human high-score row.

#### Scenario: A restart forgets the run but keeps its sessions

- **GIVEN** a completed run on a server with durable storage
- **WHEN** the server restarts
- **THEN** the run id answers `404`
- **AND** the run's game row and session logs are still in the store

#### Scenario: Human state is untouched

- **GIVEN** a server with durable storage holding a human user, game, and session
- **WHEN** a demo run completes
- **THEN** the human user, game, and session rows are unchanged
- **AND** the only new rows are the run's games, its session logs, its AI
  high-score rows, and the seeded AI users

#### Scenario: The AI scores survive the run

- **GIVEN** a completed run over two engines on durable storage
- **WHEN** the server restarts
- **THEN** the AI high-score table holds one row per finished engine session
- **AND** each row keeps its score and achievement date

#### Scenario: Retention is bounded

- **GIVEN** more than `32` completed runs on one server instance
- **WHEN** the oldest run id is fetched
- **THEN** the response status is `404`
- **AND** the most recent completions are still readable
