## ADDED Requirements

### Requirement: A board set pairs the main session with two demo boards

Alongside the main board's session, the browser gameplay client SHALL keep exactly two demo boards: the second board driven by the demo engine with id `delphi5` and the third board driven by the demo engine with id `random`, each resolved from the shared demo engine registry by id. Every board SHALL own its own `PentixGameSession`, and all three sessions created for one board set SHALL be created from one and the same `PentixGame`. The client SHALL identify a board by a stable board id and SHALL address auto-play and engine operations to one board at a time.

#### Scenario: The page load starts the main session and both demo boards

- **GIVEN** a freshly loaded page with no player game in progress
- **WHEN** the client initializes
- **THEN** the main board enters the attract demo with its own session
- **AND** two demo boards exist with distinct sessions
- **AND** both demo-board sessions have `status` `active`

#### Scenario: The engine assignment follows the registry

- **GIVEN** a board set
- **WHEN** the client resolves the engine of each demo board
- **THEN** the second board uses the registry engine with id `delphi5` and display name `Delphi 5`
- **AND** the third board uses the registry engine with id `random` and display name `Random`

#### Scenario: Every board has its own session

- **GIVEN** a board set
- **WHEN** the client compares the main session with the demo-board sessions
- **THEN** every session has a different session id
- **AND** each demo board has its own board snapshot and its own statistics

### Requirement: Every board draws from one shared piece sequence

The client SHALL keep a single `PentixGame` for a board set and SHALL pass it to every session operation of every board. When an operation returns a game with additional piece ids, the client SHALL keep that extended game as the board set's game, so all boards continue from one piece list. Two boards at the same `nextPieceIndex` SHALL therefore hold the same active piece key and the same next piece key.

#### Scenario: Boards at the same index hold the same pieces

- **GIVEN** a main board and a demo board whose sessions both have `nextPieceIndex` `n`
- **WHEN** both boards render
- **THEN** they draw the same `activePiece.key`
- **AND** they draw the same `nextPieceKey`

#### Scenario: Extending the sequence on one board extends it for all

- **GIVEN** a board set at piece index `n`
- **WHEN** the main board locks a piece and its session operation returns a game with a piece at index `n + 1`
- **THEN** the board set keeps that extended game as its single game
- **AND** a demo board that later needs a piece at index `n + 1` reads it from that game instead of generating an independent piece

#### Scenario: The sessions stay independent

- **GIVEN** a board set whose main session has locked pieces and scored
- **WHEN** the client reads the demo-board sessions
- **THEN** each demo board has its own board snapshot, statistics, piece index, and level
- **AND** no demo board shares a session id or a board snapshot with the main board

### Requirement: A new main session starts the demo boards in parallel

When the main board starts a new session — on the initial page load, on `start`, on `restart`, on a level selection that starts a game from the game-over screen, and on choosing the attract demo from the game-over screen — the client SHALL create a fresh session for the main board and a fresh session for each demo board in the same state change, all from the new board set's game. Each new demo-board session SHALL open at the starting level applied to the main session. Player actions on the main board (`tick`, `move`, `rotate`, `drop`, `pause`, `resume`) SHALL NOT create or reset demo-board sessions.

#### Scenario: Starting a player game starts both demo boards

- **GIVEN** the attract demo with a board set
- **WHEN** the player starts a game
- **THEN** the main session is new and in the playing phase
- **AND** both demo-board sessions are new and `active`
- **AND** all three sessions belong to the new board set's game

#### Scenario: Restarting replaces the demo-board sessions

- **GIVEN** a running board set whose demo boards have locked pieces and scored
- **WHEN** the player restarts the game
- **THEN** each demo board receives a session with a new session id
- **AND** its board snapshot is empty and its statistics are zeroed
- **AND** its previous session is no longer rendered

#### Scenario: The demo boards open at the applied starting level

- **GIVEN** a configured starting level of `4`
- **WHEN** the player starts a game
- **THEN** the main session reports level `4`
- **AND** both demo-board sessions report level `4`

#### Scenario: A level pick on the game-over screen starts a fresh board set

- **GIVEN** a game-over screen whose cooldown has elapsed and a configured level of `2`
- **WHEN** the player activates the `6` level button
- **THEN** a fresh player game starts at level `6`
- **AND** both demo boards receive fresh sessions at level `6`

#### Scenario: Player actions leave the demo boards alone

- **GIVEN** a running board set
- **WHEN** the player moves, rotates, hard-drops, pauses, or resumes
- **THEN** each demo-board session keeps the same session id, board snapshot, and statistics

### Requirement: The attract demo's automatic restart keeps the demo boards running

When the main attract demo reaches game over and restarts itself after its `700` ms delay, the client SHALL start only a fresh main demo session and SHALL leave every demo-board session untouched, so the demo boards keep their boards, statistics, and piece indices.

#### Scenario: The automatic demo restart does not reset the demo boards

- **GIVEN** an attract demo that has reached its final board while the demo boards are mid-game
- **WHEN** the `700` ms delay elapses and a fresh main demo session starts
- **THEN** the main session id changes
- **AND** each demo-board session keeps its previous session id, board snapshot, statistics, and piece index

### Requirement: The demo boards keep running while the main board does not

The demo boards SHALL advance independently of the main board's phase and of any player action on it. When the main board is game over, paused, showing its finished attract demo during the post-game-over delay, or running its attract demo, each demo board whose session is still `active` SHALL keep advancing on its own timer. Opening the pieces statistics popup SHALL pause the main board only.

#### Scenario: The main game over does not stop the demo boards

- **GIVEN** a board set whose main session has reached game over and whose demo boards are mid-game
- **WHEN** the demo boards' gravity intervals elapse
- **THEN** each demo board applies its next step to its own session
- **AND** the main board's final board is unchanged

#### Scenario: The main pause does not stop the demo boards

- **GIVEN** a player game paused with the Pause control
- **WHEN** the demo boards' gravity intervals elapse
- **THEN** each demo board applies its next step
- **AND** the main session stays paused

#### Scenario: The pieces popup pauses only the main board

- **GIVEN** an open pieces statistics popup over a running player game
- **WHEN** the demo boards' gravity intervals elapse
- **THEN** the main board applies no gravity tick
- **AND** each demo board applies its next step

#### Scenario: The attract demo and its delay leave the demo boards running

- **GIVEN** the main board in the attract demo or in its post-game-over delay
- **WHEN** the demo boards' gravity intervals elapse
- **THEN** each active demo board applies its next step

### Requirement: A demo board auto-plays through its own engine and the shared session engine

Each demo board SHALL advance once per gravity interval with a single step that applies the gravity descent, when its active piece can move down, followed by one steering step toward a destination planned by that board's own demo engine. The destination SHALL be planned once per spawned piece and reused across steering steps, and SHALL be re-targeted when that engine returns a last-tick side-step. Steering SHALL rotate toward the destination angle, then move laterally toward the destination column, then hard-drop once aligned. Every movement, rotation, lock, and game-over detection SHALL go through the shared `GameSessionEngine`; the demo boards SHALL NOT re-implement those operations, and a demo board SHALL plan only with its own engine. The interval SHALL follow that board's own `session.statistics.level`.

#### Scenario: Each demo board plans with its own engine

- **GIVEN** a demo board and the engine assigned to it
- **WHEN** the board plans a destination for its active piece
- **THEN** it calls that engine's destination operation
- **AND** it does not consult another engine's planner for that piece

#### Scenario: The random board never side-steps

- **GIVEN** the `random` demo board whose active piece can no longer move down
- **WHEN** the board's step is planned
- **THEN** the `random` engine declines a last-tick move
- **AND** the piece locks through the shared engine

#### Scenario: The Delphi 5 board may side-step on the last tick

- **GIVEN** the `delphi5` demo board whose resting piece has a strictly better placement one column away
- **WHEN** the board's step is planned
- **THEN** the board moves the piece that one column instead of locking it
- **AND** its cached destination becomes the side-step column

#### Scenario: A falling demo piece descends and steers in the same step

- **GIVEN** a demo board whose active piece can move down
- **WHEN** its gravity interval elapses
- **THEN** the piece moves down one row and applies one steering step in that same interval

#### Scenario: Each demo board keeps its own cadence

- **GIVEN** two demo boards whose sessions have different levels
- **WHEN** the client compares their gravity intervals
- **THEN** each interval is derived from that board's own `session.statistics.level`

### Requirement: A demo-board step applies to one board and stale steps are ignored

Every auto-play step SHALL name its board plus the session id, piece index, angle, and column it was planned for. The client SHALL apply a step only to a board whose session matches all of those values and whose status is `active`; otherwise it SHALL leave the whole board set unchanged. A demo board whose session has reached `status` `game-over` SHALL ignore further steps and keep its final board.

#### Scenario: Only the addressed board advances

- **GIVEN** a board set with two active demo boards
- **WHEN** a step addressed to the `random` board is applied
- **THEN** only the `random` board's session advances
- **AND** the `delphi5` board's session and the main session are unchanged

#### Scenario: A stale step is ignored

- **GIVEN** a step planned for a session id, piece index, angle, or column that no longer matches the addressed demo board
- **WHEN** that step is applied
- **THEN** the addressed board's session is unchanged
- **AND** no other board changes

#### Scenario: A finished demo board holds its final board

- **GIVEN** a demo board whose session has reached game over while the main board keeps playing
- **WHEN** further steps addressed to that board are applied
- **THEN** its final locked board and statistics stay rendered
- **AND** no fresh session is created for it until the main board starts a new session

### Requirement: A demo board shows only the primary statistics

Each demo board SHALL render its own session's board at the session's stored `width`-by-`height` grid with its cells colored by `pieceKey` and its active piece overlaid, using demo-board minos of `9` by `9` pixels at desktop widths, `7` by `7` pixels at a viewport `1000px` wide or narrower, and `6` by `6` pixels at a viewport `900px` wide or narrower. Above the board it SHALL render the display name of its engine and exactly three values read from its own session statistics: `Score` (`statistics.score`), `Lines` (`statistics.clearedLines`), and `Pieces` (`statistics.blocks`). It SHALL NOT render a next-piece preview, a pieces statistics popup, action counters, a level selector, on-screen controls, a pause overlay, or a game-over overlay, and SHALL read every value from the session snapshot rather than keeping client-side copies.

#### Scenario: The primary statistics match the board's session

- **GIVEN** a demo board whose session has a known score, cleared line count, and locked-piece count
- **WHEN** the board renders
- **THEN** it shows the engine display name and those three values
- **AND** it renders no other statistic

#### Scenario: A demo board renders no secondary statistics or controls

- **GIVEN** any demo-board session, including one whose engine recorded moves and rotations
- **WHEN** the board renders
- **THEN** it renders no next-piece preview, no pieces statistics popup, no action counters, no level selector, and no on-screen controls
- **AND** it renders no pause or game-over overlay

#### Scenario: The demo-board minos use the reduced cell size

- **GIVEN** a demo board with a default `12` x `22` session board
- **WHEN** it renders at a desktop width, at a viewport `1000px` wide or narrower, and at a viewport `900px` wide or narrower
- **THEN** every cell is laid out at `9` by `9` pixels, `7` by `7` pixels, and `6` by `6` pixels respectively
- **AND** the grid still renders exactly `12` columns and `22` rows

#### Scenario: The values follow the session as it advances

- **GIVEN** a demo board whose session locks a piece and scores during auto-play
- **WHEN** the board re-renders
- **THEN** its shown score, lines, and pieces reflect the updated session statistics

#### Scenario: A finished demo board shows a game-over marker

- **GIVEN** a demo board whose session reached `status` `game-over`
- **WHEN** the board renders
- **THEN** it keeps the final locked board visible
- **AND** it shows a game-over marker naming the board's status


### Requirement: Changing the level during the attract demo retunes every demo board

While the main board runs its attract demo, every level change that applies to the live demo session — a level button, the `+`/`-` keys, or a `0`-`9` key — SHALL also apply to every demo-board session, so the whole rail changes its gravity cadence together with the main demo. Such a change SHALL keep each demo board's session id, board snapshot, statistics, and piece index, changing only the level. Level changes during a player game SHALL apply to the main session only, and a level chosen during the demo's post-game-over delay SHALL be applied to the main session and to every demo board by the next demo restart.

#### Scenario: A demo level change retunes both demo boards

- **GIVEN** an attract demo whose main session and demo boards all report level `2`
- **WHEN** the player activates the `5` level button
- **THEN** the main session reports level `5`
- **AND** both demo-board sessions report level `5`
- **AND** every session keeps its id, board snapshot, statistics, and piece index

#### Scenario: The level step keys retune the rail too

- **GIVEN** an attract demo at level `3`
- **WHEN** the player presses `+` and then `-`
- **THEN** every demo-board session reports level `4` and then level `3`

#### Scenario: A player-game level change leaves the demo boards alone

- **GIVEN** a running player game at level `2` with both demo boards playing
- **WHEN** the player raises the level to `4`
- **THEN** the main session reports level `4`
- **AND** both demo-board sessions keep the level and the session state they had

#### Scenario: A level chosen during the demo delay applies on the next restart

- **GIVEN** a finished attract demo at level `2` whose delay is running, with the configured level set to `6`
- **WHEN** the delay elapses and a fresh demo session starts
- **THEN** the main demo session starts at level `6`
- **AND** every demo board reports level `6`

