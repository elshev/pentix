# session-replay Specification

## Purpose
Define how the system records a `PentixGameSession` as a compact action log. Each played piece's numeric ID plus its ordered actions form that log. The system reconstructs the session by replaying those actions through the deterministic engine, without storing every intermediate board state.
## Requirements
### Requirement: A session action alphabet defines recorded play

The system SHALL define a session action alphabet. `T` stands for a gravity tick, `L` for left, and `R` for right. `C` stands for clockwise rotation, `A` for anticlockwise rotation, and `H` for hard drop. Soft drop SHALL NOT be represented.

#### Scenario: The alphabet covers every recorded operation

- **GIVEN** a session being recorded
- **WHEN** a piece settles or an action is applied
- **THEN** every recorded entry is one of `T`, `L`, `R`, `C`, `A`, or `H`
- **AND** no soft-drop action appears in the log

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

### Requirement: The server records every gameplay request in the session action log

`PentixServer` SHALL append one action code to the session's `SessionActionLog` for every gameplay request it accepts. The code SHALL be `L` or `R` for a move, and `C` or `A` for a rotation (clockwise or anticlockwise). A `T` code SHALL record a gravity tick, and an `H` code SHALL record a hard drop. The server SHALL still record a request that the engine rejects. Replaying that request is a no-op, and the log must stay an exact transcript of what the player did.

The codes SHALL be grouped under the numeric ID of the piece that was active when the request arrived. A new entry SHALL start when that piece ID changes. The log SHALL carry the `sessionId`, `userId`, and `gameId` of the session it belongs to. The server SHALL persist the log through the session repository on every gameplay request. In this way the log — not a per-action board snapshot — is the retained form of the session. On startup the server SHALL rebuild each retained session by replaying its log through the deterministic shared engine against the parent game's piece sequence. The server SHALL extend that sequence when the log needs pieces the game does not yet hold.

#### Scenario: A move appends its direction code

- **GIVEN** a retained session whose log ends with an entry for the active piece
- **WHEN** a client sends `POST /game-sessions/{id}/move` with `left` and then with `right`
- **THEN** the log's last entry for that piece ends with `LR`

#### Scenario: Rotation and drop codes follow the request

- **GIVEN** a retained session whose active piece has not changed
- **WHEN** a client sends a clockwise rotation, an anticlockwise rotation, and a hard drop
- **THEN** the log's entry for that piece ends with `CAH`

#### Scenario: A tick is recorded

- **GIVEN** a retained session whose active piece can still move down
- **WHEN** a client sends `POST /game-sessions/{id}/tick`
- **THEN** the log's entry for that piece ends with `T`

#### Scenario: Settling a piece starts a new log entry

- **GIVEN** a retained session whose log has an entry for the active piece
- **WHEN** a request settles that piece and spawns the next one
- **THEN** the log gains a new entry whose `pieceId` is the newly active piece
- **AND** the previous entry's actions are unchanged

#### Scenario: A reloaded session is rebuilt from its log

- **GIVEN** a persisted session log
- **WHEN** a new server instance loads its sessions from the repository
- **THEN** the session it serves equals the state reached by live play
- **AND** no board snapshot was needed to reconstruct it

