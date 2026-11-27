## MODIFIED Requirements

### Requirement: A session is recorded as piece ID plus ordered actions

A session's recorded representation SHALL consist of the active piece's numeric ID and the ordered sequence of actions applied to it. The system SHALL NOT require storing the full board state after every action. The record SHALL carry an optional `level`, which is the session's opening level, and an optional `seedColumn`, which is the column of a demo seed mino. A human session log SHALL omit both fields. A demo session log SHALL carry both fields.

#### Scenario: The log is minimal

- **GIVEN** a session that has been played
- **WHEN** its recorded representation is inspected
- **THEN** it contains the piece ID and the ordered actions, not a per-action board snapshot

#### Scenario: A demo log names its opening state

- **GIVEN** a demo session that started at level `9` with a seed mino in column `7`
- **WHEN** its log is inspected
- **THEN** the log reports `level` `9` and `seedColumn` `7`

#### Scenario: A human log carries no demo fields

- **GIVEN** a human session that a player played
- **WHEN** its log is inspected
- **THEN** the log reports neither `level` nor `seedColumn`

### Requirement: Replay reconstructs the session state

Given a game's piece sequence and a session's action log, the system SHALL reproduce the session state. The system SHALL apply the recorded actions in order through the deterministic engine. When the log carries `level`, replay SHALL open the session at that level. When the log carries `seedColumn`, replay SHALL place the demo seed mino before it applies the recorded actions. When a field is absent, replay SHALL keep the default opening state.

#### Scenario: Replay matches live play

- **GIVEN** a game piece sequence and a recorded action log
- **WHEN** the actions are replayed in order
- **THEN** the reconstructed session state equals the state reached by live play

#### Scenario: A demo log replays its opening state

- **GIVEN** a demo log with `level` `9` and `seedColumn` `7`
- **WHEN** the log is replayed against its game
- **THEN** the reconstructed session opened at level `9`
- **AND** its opening board held the seed mino in column `7` of the row before last
- **AND** the final state equals the state that live demo playback reached

#### Scenario: A log without demo fields replays as before

- **GIVEN** a human session log without `level` and without `seedColumn`
- **WHEN** the log is replayed
- **THEN** the session opens at level `1` with no seed mino
- **AND** the recorded actions produce their earlier state
