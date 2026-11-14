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

### Requirement: Recorded actions flush in bounded batches

The client SHALL retain recorded actions locally and flush them to the server after `SOME_CACHE_PIECE_COUNT` pieces have settled or when the session finishes, whichever comes first.

#### Scenario: A full cache flushes
- **GIVEN** an active session accumulating actions
- **WHEN** `SOME_CACHE_PIECE_COUNT` pieces have settled
- **THEN** the accumulated actions are flushed to the server

#### Scenario: Finishing flushes immediately
- **GIVEN** a session that reaches `game-over` with unflushed actions
- **WHEN** the session finishes
- **THEN** the remaining actions are flushed to the server
