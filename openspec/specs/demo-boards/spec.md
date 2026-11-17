# demo-boards Specification

## Purpose

Define the demo-board rail beside the main board: one slot-addressed board per registered demo engine (`demo-slot-1`, `demo-slot-2`, and so on up to the rail's twelve slots) that auto-play their own sessions by replaying their engine's action log, keep running while the main board does not, follow the attract demo's level, show only their engine name, description, and primary statistics at the mino size computed from the four-per-row wall, and can trade places with the main board on a double-click during the attract demo.
## Requirements
### Requirement: A board set pairs the main session with one demo board per registered engine

Alongside the main board's session, the browser gameplay client SHALL keep one demo board per engine registered in the shared demo engine registry, in registration order, addressed by the stable rail-slot ids `demo-slot-1`, `demo-slot-2`, and so on. The number of demo boards SHALL NOT exceed the rail's capacity of `12` boards; engines registered beyond that capacity SHALL NOT add boards. Every demo board's engine SHALL be resolved from the registry, so with the built-in engines slot 1 plays `delphi5` and slot 2 plays `random`. Every board SHALL own its own `PentixGameSession`, and all sessions created for one board set SHALL be created from one and the same `PentixGame`. The client SHALL identify a demo board by its slot id — never by its engine id — and SHALL address auto-play and engine operations to one board at a time, so a demo board keeps its slot id when the engine assigned to it changes. The main board's attract-demo engine SHALL be part of the board set: it SHALL start as `random` on the initial board set, and every later board set the client creates SHALL keep the engine the game state already holds, so the demo engine a double-click brought to the main board survives the player's next game, a restart, and the demo that follows. The rail SHALL always be reassigned in registration order and SHALL NOT be derived from the main board's engine, so the main board and a rail slot can end up playing the same engine.

#### Scenario: The page load starts the main session and every demo board

- **GIVEN** a freshly loaded page with no player game in progress
- **WHEN** the client initializes
- **THEN** the main board enters the attract demo with its own session
- **AND** one demo board exists per registered engine with a distinct session each
- **AND** every demo-board session has `status` `active`

#### Scenario: The engine assignment follows the registry order

- **GIVEN** a freshly created board set and the registry's built-in engines
- **WHEN** the client resolves the engine of each demo board
- **THEN** `demo-slot-1` uses the registry engine with id `delphi5` and display name `Delphi 5`
- **AND** `demo-slot-2` uses the registry engine with id `random` and display name `Random`
- **AND** the main board uses the registry engine with id `random`

#### Scenario: A later board set keeps the main board's engine

- **GIVEN** a main board running the `delphi5` engine after a double-click
- **WHEN** the player starts a game and later returns to the attract demo
- **THEN** the main board's attract demo is planned by `delphi5`
- **AND** `demo-slot-1` and `demo-slot-2` are assigned in registration order again
- **AND** the main board may play the same engine as one of the rail slots

#### Scenario: Registering another engine adds another rail board

- **GIVEN** a registry that lists `delphi5`, `random`, and a third engine
- **WHEN** a board set is created
- **THEN** the rail contains `demo-slot-1`, `demo-slot-2`, and `demo-slot-3`
- **AND** `demo-slot-3` plays the third engine
- **AND** no browser-client code names that engine

#### Scenario: The rail capacity bounds the board count

- **GIVEN** a registry with more engines than the rail's capacity of `12`
- **WHEN** a board set is created
- **THEN** the rail contains exactly `12` boards
- **AND** they play the first `12` registered engines in registration order

#### Scenario: A board id names its rail slot, not its engine

- **GIVEN** a board set whose demo boards run `delphi5` and `random`
- **WHEN** the client enumerates the demo boards
- **THEN** their ids are `demo-slot-1` and `demo-slot-2`
- **AND** each id stays the same whatever engine that slot currently plays

#### Scenario: Every board has its own session

- **GIVEN** a board set
- **WHEN** the client compares the main session with the demo-board sessions
- **THEN** every session has a different session id
- **AND** each demo board has its own board snapshot and its own statistics

- **AND** no action from the old log is replayed

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

When the main board starts a new session — on the initial page load, on `start`, on `restart`, on a level selection that starts a game from the game-over screen, and on choosing the attract demo from the game-over screen — the client SHALL create a fresh session for the main board and a fresh session for each demo board in the same state change, all from the new board set's game. Each new demo-board session SHALL open at the starting level applied to the main session, and each slot SHALL return to the engine the registry assigns to its position (with the built-in engines `delphi5` in slot 1 and `random` in slot 2) while the main board returns to `random` as well. Player actions on the main board (`tick`, `move`, `rotate`, `drop`, `pause`, `resume`) SHALL NOT create or reset demo-board sessions.

#### Scenario: Starting a player game starts every demo board

- **GIVEN** the attract demo with a board set
- **WHEN** the player starts a game
- **THEN** the main session is new and in the playing phase
- **AND** every demo-board session is new and `active`
- **AND** all sessions belong to the new board set's game

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
- **AND** every demo-board session reports level `4`

#### Scenario: A level pick on the game-over screen starts a fresh board set

- **GIVEN** a game-over screen whose cooldown has elapsed and a configured level of `2`
- **WHEN** the player activates the `6` level button
- **THEN** a fresh player game starts at level `6`
- **AND** every demo board receives a fresh session at level `6`

#### Scenario: Player actions leave the demo boards alone

- **GIVEN** a running board set
- **WHEN** the player moves, rotates, hard-drops, pauses, or resumes
- **THEN** each demo-board session keeps the same session id, board snapshot, and statistics

#### Scenario: A fresh board set re-applies the registry assignment

- **GIVEN** a board set whose slots were exchanged by a double-click, so slot 1 plays `random` and slot 2 plays `delphi5`
- **WHEN** the player starts or restarts a game
- **THEN** slot 1 plays `delphi5` with a fresh session and slot 2 plays `random` with a fresh session
- **AND** the main board's attract demo is planned by `random`

### Requirement: The attract demo's automatic restart keeps the demo boards running

When the main attract demo reaches game over and restarts itself after its `700` ms delay, the client SHALL start only a fresh main demo session and SHALL leave every demo-board session untouched, so the demo boards keep their boards, statistics, piece indices, and engines. The fresh main demo session SHALL be planned by the engine currently assigned to the main board.

#### Scenario: The automatic demo restart does not reset the demo boards

- **GIVEN** an attract demo that has reached its final board while the demo boards are mid-game
- **WHEN** the `700` ms delay elapses and a fresh main demo session starts
- **THEN** the main session id changes
- **AND** each demo-board session keeps its previous session id, board snapshot, statistics, and piece index

#### Scenario: The main board keeps its swapped engine

- **GIVEN** a main board that received the `delphi5` engine and session from a demo board and has reached game over
- **WHEN** the `700` ms delay elapses and a fresh main demo session starts
- **THEN** the fresh main demo session is planned by `delphi5`
- **AND** each demo board keeps its session and its engine

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

Each demo board SHALL plan once per spawned piece with the engine assigned to it: that engine returns a `DemoActionLog` for the board's active piece, and the board SHALL replay the log one action per gravity interval, applying the next action through the shared `GameSessionEngine` and then exactly one gravity tick, so the cadence from the piece's spawn is Action, Tick, Action, Tick. Each demo board's session SHALL start with the demo's seeded mino — one settled cell on the row before last, in a column chosen when that board's session starts — and SHALL keep it until its row is cleared. When the applied code is `H` and the log carries one code after it, the board SHALL also apply that last-tick move (`L` or `R`) in the same interval, after the drop and before that interval's gravity tick; when that drop settles the board's piece instead, the board SHALL discard the last-tick move and SHALL NOT apply it to the spawned piece. Once the log is exhausted the board SHALL apply ticks only until its piece locks. An action the board blocks SHALL leave the placement unchanged while its paired tick still applies, and any unplayed actions SHALL be dropped when the piece locks. Every movement, rotation, hard drop, side-step, lock, and game-over detection SHALL go through the shared `GameSessionEngine`; the demo boards SHALL NOT re-implement those operations, and a demo board SHALL plan only with its own engine. The interval SHALL follow that board's own `session.statistics.level`.

#### Scenario: Each demo board plans with its own engine

- **GIVEN** a demo board and the engine assigned to it
- **WHEN** a piece spawns on that board
- **THEN** the board calls that engine's `plan` with the board, the piece's orientations, and its rotation point, and receives the piece's action log
- **AND** it does not consult another engine's planner for that piece

#### Scenario: A demo board starts with its seeded mino

- **GIVEN** a freshly created demo board
- **WHEN** its session starts
- **THEN** its board holds exactly one settled cell, on the row before last
- **AND** that cell stays until its row is cleared
- **AND** the board reports no locked pieces for it

#### Scenario: A demo board replays its log as Action then Tick

- **GIVEN** a demo board whose engine returned the log `"LH"` for its current piece
- **WHEN** its next two gravity intervals elapse
- **THEN** the first interval moves the piece left and then steps gravity once
- **AND** the second interval hard-drops the piece and then steps gravity once

#### Scenario: A demo board takes its last-tick move after the drop

- **GIVEN** a demo board whose log reaches `H` followed by one `R`, and a piece that can still be placed one row lower
- **WHEN** that interval elapses
- **THEN** the board hard-drops the piece, moves it one column right, and then applies one gravity tick
- **AND** only the addressed board advances

#### Scenario: A settling drop drops the last-tick move

- **GIVEN** a demo board whose piece cannot move down and whose log's next codes are `H` and `R`
- **WHEN** that interval elapses
- **THEN** the hard drop settles the piece through the shared engine
- **AND** the following `R` is discarded instead of moving the spawned piece

#### Scenario: The random board lets gravity finish the piece

- **GIVEN** the `random` demo board whose log has been fully replayed and whose piece has not locked
- **WHEN** further intervals elapse
- **THEN** each interval applies one gravity tick and no action
- **AND** the piece locks through the shared engine

#### Scenario: The Delphi 5 board steers with its log

- **GIVEN** the `delphi5` demo board and a placed active piece
- **WHEN** the board replays the engine's log
- **THEN** the log rotates and moves the piece toward the engine's chosen destination
- **AND** it contains a hard drop, followed by the engine's last-tick move when the destination needs one
- **AND** every step goes through the shared `GameSessionEngine`

#### Scenario: A blocked action still ticks

- **GIVEN** a demo board whose next action the board blocks
- **WHEN** its interval elapses
- **THEN** the placement stays unchanged for the action
- **AND** the paired gravity tick still applies

#### Scenario: A new piece drops the old log

- **GIVEN** a demo board whose piece locked with unplayed actions still in its log
- **WHEN** the next piece spawns
- **THEN** the board plans a fresh log for the new piece

### Requirement: A demo-board step applies to one board and stale steps are ignored

Every auto-play step SHALL name its board by slot id plus the session id and piece index it was planned for. The client SHALL apply a step only to a board whose session matches those values and whose status is `active`; otherwise it SHALL leave the whole board set unchanged. A demo board whose session has reached `status` `game-over` SHALL ignore further steps and keep its final board. Steps planned for one slot SHALL NOT be applied to another slot, whatever engines the slots play.

#### Scenario: Only the addressed board advances

- **GIVEN** a board set with several active demo boards
- **WHEN** a step addressed to `demo-slot-2` is applied
- **THEN** only the `demo-slot-2` session advances
- **AND** the `demo-slot-1` session and the main session are unchanged

#### Scenario: A stale step is ignored

- **GIVEN** a step planned for a session id or piece index that no longer matches the addressed demo board
- **WHEN** that step is applied
- **THEN** the addressed board's session is unchanged
- **AND** no other board changes

#### Scenario: A step planned before a swap is ignored

- **GIVEN** a step planned for the session that a double-click moved from a demo board to the main board
- **WHEN** that step is applied to its original demo-board slot
- **THEN** the slot's session is unchanged
- **AND** the main board is unchanged

#### Scenario: A finished demo board holds its final board

- **GIVEN** a demo board whose session has reached game over while the main board keeps playing
- **WHEN** further steps addressed to that board are applied
- **THEN** its final locked board and statistics stay rendered
- **AND** no fresh session is created for it until the main board starts a new session

### Requirement: A demo board shows only the primary statistics

Each demo board SHALL render its own session's board at the session's stored `width`-by-`height` grid with its cells colored by `pieceKey` and its active piece overlaid. The demo-board minos SHALL be as large as the rail's four-column wall allows: four board slots plus the three horizontal gaps SHALL fit inside the rail column, with no cell smaller than `4` px and no cell larger than `11` px. Concretely, four boards of the stored `12` columns with `1` px cell gaps, `4` px board padding, `4` px card padding, and `2` px of borders per board occupy `12` times the mino size plus `31` px each, so the mino is `11` px at desktop widths, steps through `10`, `9`, `8`, and `7` px as the shell narrows, and is `6` px once four `7` px boards no longer fit side by side; the rail switches to two boards per row below `480` px. The horizontal gap between rail boards SHALL be the row gap plus `0.25rem` (`4` px at the default root). Above the board each demo board SHALL render the display name of the engine currently assigned to that board and SHALL expose that engine's `description` as the label's tooltip, both read from the registry; the name SHALL NOT be limited to a fixed list of engines. Next to the name it SHALL render exactly three values read from its own session statistics: `Score` (`statistics.score`), `Lines` (`statistics.clearedLines`), and `Pieces` (`statistics.blocks`). It SHALL NOT render a next-piece preview, a pieces statistics popup, action counters, a level selector, on-screen controls, a pause overlay, or a game-over overlay, and SHALL read every value from the session snapshot rather than keeping client-side copies.

#### Scenario: The primary statistics match the board's session

- **GIVEN** a demo board whose session has a known score, cleared line count, and locked-piece count
- **WHEN** the board renders
- **THEN** it shows the engine display name and those three values
- **AND** it renders no other statistic

#### Scenario: The engine description is exposed by the board

- **GIVEN** a demo board whose engine has a non-empty description in the registry
- **WHEN** the board renders
- **THEN** the engine label carries that description as its tooltip

#### Scenario: A demo board renders no secondary statistics or controls

- **GIVEN** any demo-board session, including one whose engine recorded moves and rotations
- **WHEN** the board renders
- **THEN** it renders no next-piece preview, no pieces statistics popup, no action counters, no level selector, and no on-screen controls
- **AND** it renders no pause or game-over overlay

#### Scenario: Four demo boards fill one rail row

- **GIVEN** the rail's four-column grid with the planned wall of three rows
- **WHEN** the rail renders at a desktop width
- **THEN** every demo-board mino is `11` by `11` pixels
- **AND** four board slots of `163` px plus three `0.85rem` (`13.6` px) horizontal gaps fit inside the rail column
- **AND** every mini board still renders exactly `12` columns and `22` rows

#### Scenario: The wall steps down with the shell

- **GIVEN** the rail's four-column grid
- **WHEN** the viewport narrows through `1089`, `1041`, `993`, `945`, and `800` px
- **THEN** the demo-board minos are `10`, `9`, `8`, `7`, and `6` pixels respectively
- **AND** four board slots plus three horizontal gaps still fit inside the rail at each of those widths

#### Scenario: The rail gap is wider horizontally

- **GIVEN** the demo-board rail
- **WHEN** its grid gaps are measured
- **THEN** the horizontal gap is `0.25rem` wider than the `0.6rem` row gap (`4` px at the default root)
- **AND** the reserved slot width and the rail's four-column layout are unchanged by the extra gap

#### Scenario: The values follow the session as it advances

- **GIVEN** a demo board whose session locks a piece and scores during auto-play
- **WHEN** the board re-renders
- **THEN** its shown score, lines, and pieces reflect the updated session statistics

#### Scenario: A finished demo board shows a game-over marker

- **GIVEN** a demo board whose session reached `status` `game-over`
- **WHEN** the board renders
- **THEN** it keeps the final locked board visible
- **AND** it shows a game-over marker naming the board's status

#### Scenario: The engine name follows the swapped engine

- **GIVEN** a demo board that received the `random` engine and session from the main board
- **WHEN** the board renders
- **THEN** its engine label reads `Random`
- **AND** its statistics come from the session it received

### Requirement: Changing the level during the attract demo retunes every demo board

While the main board runs its attract demo, every level change that applies to the live demo session — a level button, the `+`/`-` keys, or a `0`-`9` key — SHALL also apply to every demo-board session, so the whole rail changes its gravity cadence together with the main demo. Such a change SHALL keep each demo board's session id, engine, board snapshot, statistics, and piece index, changing only the level. Level changes during a player game SHALL apply to the main session only, and a level chosen during the demo's post-game-over delay SHALL be applied to the main session and to every demo board by the next demo restart.

#### Scenario: A demo level change retunes every demo board

- **GIVEN** an attract demo whose main session and demo boards all report level `2`
- **WHEN** the player activates the `5` level button
- **THEN** the main session reports level `5`
- **AND** every demo-board session reports level `5`
- **AND** every session keeps its id, board snapshot, statistics, and piece index

#### Scenario: The level step keys retune the rail too

- **GIVEN** an attract demo at level `3`
- **WHEN** the player presses `+` and then `-`
- **THEN** every demo-board session reports level `4` and then level `3`

#### Scenario: A player-game level change leaves the demo boards alone

- **GIVEN** a running player game at level `2` with every demo board playing
- **WHEN** the player raises the level to `4`
- **THEN** the main session reports level `4`
- **AND** every demo-board session keeps the level and the session state it had

#### Scenario: A level chosen during the demo delay applies on the next restart

- **GIVEN** a finished attract demo at level `2` whose delay is running, with the configured level set to `6`
- **WHEN** the delay elapses and a fresh demo session starts
- **THEN** the main demo session starts at level `6`
- **AND** every demo board reports level `6`

#### Scenario: A swapped rail still retunes as one

- **GIVEN** an attract demo after a double-click that exchanged the main board with `demo-slot-1`
- **WHEN** the player activates the `7` level button
- **THEN** the main session reports level `7`
- **AND** every demo-board session reports level `7`
- **AND** each slot keeps the engine it received from the swap

### Requirement: Double-clicking a demo board moves it to the main board

While the main board runs its attract demo or shows its finished demo before the restart delay elapses, a double-click on a demo board SHALL exchange the two boards: the clicked board's session and engine SHALL become the main board's session and engine, and the main board's session and engine SHALL take that board's slot. The exchange SHALL keep both sessions unchanged — same session id, board snapshot, statistics, piece index, status, and level — SHALL NOT create a session, SHALL NOT touch any other demo board, and SHALL keep the single shared `PentixGame` as the board set's game. After the exchange the main board SHALL take the phase that matches the arriving session's status: `demo` for an `active` session and `demo-over` for a `game-over` session. A double-click SHALL be ignored while the main board runs a player game, and the rail SHALL NOT reorder its slots.

#### Scenario: The clicked demo board takes over the main board

- **GIVEN** an attract demo whose main session and `demo-slot-1` session are both `active`
- **WHEN** the player double-clicks `demo-slot-1`
- **THEN** the main board renders `demo-slot-1`'s previous session and level
- **AND** the main board's engine becomes the engine `demo-slot-1` was playing
- **AND** `demo-slot-1` renders the previous main session and its engine
- **AND** the main session id equals the clicked board's previous session id

#### Scenario: Both boards keep playing after the swap

- **GIVEN** the attract demo immediately after a double-click exchange
- **WHEN** each board's gravity interval elapses
- **THEN** the main board advances the arriving session with the arriving engine
- **AND** the demo-board slot advances the session it received with that session's engine
- **AND** no session is created or reset by the exchange

#### Scenario: The swap leaves the other demo boards untouched

- **GIVEN** an attract demo with several demo boards that have locked pieces
- **WHEN** the player double-clicks `demo-slot-2`
- **THEN** `demo-slot-1` keeps the same session id, board snapshot, statistics, and engine
- **AND** every other slot that was not clicked keeps its session and engine

#### Scenario: The swap is ignored during a player game

- **GIVEN** a playing, paused, or game-over player game on the main board
- **WHEN** the player double-clicks a demo board
- **THEN** the main session and every demo-board session stay unchanged

#### Scenario: A finished demo can be swapped in

- **GIVEN** an attract demo whose `demo-slot-2` session reached `status` `game-over`
- **WHEN** the player double-clicks `demo-slot-2`
- **THEN** the main board shows that finished board in the `demo-over` phase
- **AND** the previous main session, still `active`, appears in `demo-slot-2` and keeps advancing

#### Scenario: The swapped sessions keep drawing from one piece list

- **GIVEN** a board set whose game has an extended piece list
- **WHEN** the player double-clicks a demo board
- **THEN** both exchanged sessions keep their piece indices in the same `PentixGame`
- **AND** the board set keeps one game with the same piece ids

