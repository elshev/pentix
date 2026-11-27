## MODIFIED Requirements

### Requirement: A batch plays one session per registered engine per game

Each game of a run SHALL create one `PentixGame` through the server's id and piece-selection seams. The service SHALL store that game through the game repository. The game SHALL create one demo session for every engine registered in the shared demo engine registry, in registration order. All sessions of one game SHALL belong to that one game. In this way the engines at the same `nextPieceIndex` hold the same pieces. A playback that extends the sequence SHALL extend it for the engines that follow. Each session SHALL be created through the shared demo-session factory, seeded with one settled mino and opened at the run's demo starting level. Each session SHALL use the AI user of its engine as `userId`. The run's engine set SHALL be fixed when the run starts and reported in the snapshot. In this way a registry change during a batch does not add or remove a competitor mid-run. When a session reaches `game-over`, the service SHALL store its action log through the session repository.

#### Scenario: Every registered engine competes

- **GIVEN** the built-in registry with its nine engines
- **WHEN** a run starts
- **THEN** the snapshot lists those nine engine ids in registration order
- **AND** every one of them receives a session in every game
- **AND** every session names its engine's AI user

#### Scenario: One game, one piece sequence

- **GIVEN** a batch game whose engines have reached the same `nextPieceIndex`
- **WHEN** their sessions are compared
- **THEN** they report the same `gameId`
- **AND** they hold the same active and next piece keys

#### Scenario: Sessions keep their own play

- **GIVEN** two engines in the same batch game
- **WHEN** the game is played out
- **THEN** each session has a different session id
- **AND** each keeps its own board, statistics, and piece index
- **AND** each session is stored under its own id when it ends

#### Scenario: A new engine joins the field without server code changes

- **GIVEN** a registry that lists an additional engine module
- **WHEN** a run starts
- **THEN** the snapshot lists the extra engine id
- **AND** it receives a session in every game
- **AND** no `apps/pentix-server` code names that engine

## REMOVED Requirements

### Requirement: Runs live in memory only

**Reason**: A demo run now stores its games and its per-engine session logs. The rule that no run touches storage contradicts the purpose of this change.

**Migration**: Keep run snapshots, status, and standings in server memory as before. Read the new durable rows through the existing storage repositories. Treat a run id that a restart forgot as `404`, as the rule already states.

## ADDED Requirements

### Requirement: A run record lives in memory and its demo sessions are durable

A run's own record SHALL stay in server memory. That record holds `status`, `gameCount`, `completedGameCount`, `engines`, and `standings`. Finished runs SHALL remain bounded to the `32` most recent completions. A restart SHALL forget every run id, so a forgotten or evicted id SHALL answer `404`. The run's `PentixGame` rows and its per-engine `SessionActionLog` rows SHALL be durable in the storage that the server was started with. The run SHALL NOT create, update, or remove a human user, a retained human game, or a retained human session.

#### Scenario: A restart forgets the run but keeps its sessions

- **GIVEN** a completed run on a server with durable storage
- **WHEN** the server restarts
- **THEN** the run id answers `404`
- **AND** the run's game row and session logs are still in the store

#### Scenario: Human state is untouched

- **GIVEN** a server with durable storage holding a human user, game, and session
- **WHEN** a demo run completes
- **THEN** the human user, game, and session rows are unchanged
- **AND** the only new rows are the run's games, its session logs, and the seeded AI users

#### Scenario: Retention is bounded

- **GIVEN** more than `32` completed runs on one server instance
- **WHEN** the oldest run id is fetched
- **THEN** the response status is `404`
- **AND** the most recent completions are still readable
