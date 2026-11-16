# session-replay Specification

## Purpose
Define how a `PentixGameSession` is recorded as a compact action log (each played piece's numeric ID plus its ordered actions) and reconstructed by replaying those actions through the deterministic engine, without storing every intermediate board state.
## Requirements
### Requirement: A session action alphabet defines recorded play

The system SHALL define a session action alphabet: `T` for a gravity tick, `L` for left, `R` for right, `C` for clockwise rotation, `A` for anticlockwise rotation, and `H` for hard drop. Soft drop SHALL NOT be represented.

#### Scenario: The alphabet covers every recorded operation

- **GIVEN** a session being recorded
- **WHEN** a piece settles or an action is applied
- **THEN** every recorded entry is one of `T`, `L`, `R`, `C`, `A`, or `H`
- **AND** no soft-drop action appears in the log

### Requirement: A session is recorded as piece ID plus ordered actions

A session's recorded representation SHALL consist of the active piece's numeric ID and the ordered sequence of actions applied to it. The system SHALL NOT require storing the full board state after every action.

#### Scenario: The log is minimal

- **GIVEN** a session that has been played
- **WHEN** its recorded representation is inspected
- **THEN** it contains the piece ID and the ordered actions, not a per-action board snapshot

### Requirement: Replay reconstructs the session state

Given a game's piece sequence and a session's action log, the system SHALL reproduce the session state by applying the recorded actions in order through the deterministic engine.

#### Scenario: Replay matches live play

- **GIVEN** a game piece sequence and a recorded action log
- **WHEN** the actions are replayed in order
- **THEN** the reconstructed session state equals the state reached by live play

### Requirement: The server records every gameplay request in the session action log

`PentixServer` SHALL append one action code to the session's `SessionActionLog` for every gameplay request it accepts: `L` or `R` for a move, `C` or `A` for a rotation (clockwise or anticlockwise), `T` for a gravity tick, and `H` for a hard drop. A request the engine rejects SHALL still be recorded, because replaying it is a no-op and the log must stay an exact transcript of what the player did.

The codes SHALL be grouped under the numeric ID of the piece that was active when the request arrived, and a new entry SHALL start when that piece ID changes. The log SHALL carry the `sessionId`, `userId`, and `gameId` of the session it belongs to and SHALL be persisted through the session repository on every gameplay request, so the log — not a per-action board snapshot — is the retained form of the session. On startup the server SHALL rebuild each retained session by replaying its log through the deterministic shared engine against the parent game's piece sequence, extending that sequence when the log needs pieces the game does not yet hold.

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

