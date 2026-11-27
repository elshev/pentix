## MODIFIED Requirements

### Requirement: The server records every gameplay request in the session action log

`PentixServer` SHALL append one action code to the session's `SessionActionLog` for every gameplay request it accepts. The code SHALL be `L` or `R` for a move, and `C` or `A` for a rotation (clockwise or anticlockwise). A `T` code SHALL record a gravity tick, and an `H` code SHALL record a hard drop. The server SHALL still record a request that the engine rejects. Replaying that request is a no-op, and the log must stay an exact transcript of what the player did.

The codes SHALL be grouped under the numeric ID of the piece that was active when the request arrived. A new entry SHALL start when that piece ID changes. The log SHALL carry the `sessionId`, `userId`, and `gameId` of the session it belongs to. The server SHALL persist the log through the session repository on every gameplay request. In this way the log — not a per-action board snapshot — is the retained form of the session. On startup the server SHALL rebuild each retained session by replaying its log through the deterministic shared engine against the parent game's piece sequence. The server SHALL extend that sequence when the log needs pieces the game does not yet hold.

The gameplay requests arrive at `POST /v1/game-sessions/{id}/move`, `POST /v1/game-sessions/{id}/rotate`, `POST /v1/game-sessions/{id}/tick`, and `POST /v1/game-sessions/{id}/drop`.

#### Scenario: A move appends its direction code

- **GIVEN** a retained session whose log ends with an entry for the active piece
- **WHEN** a client sends `POST /v1/game-sessions/{id}/move` with `left` and then with `right`
- **THEN** the log's last entry for that piece ends with `LR`

#### Scenario: Rotation and drop codes follow the request

- **GIVEN** a retained session whose active piece has not changed
- **WHEN** a client sends a clockwise rotation, an anticlockwise rotation, and a hard drop
- **THEN** the log's entry for that piece ends with `CAH`

#### Scenario: A tick is recorded

- **GIVEN** a retained session whose active piece can still move down
- **WHEN** a client sends `POST /v1/game-sessions/{id}/tick`
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
