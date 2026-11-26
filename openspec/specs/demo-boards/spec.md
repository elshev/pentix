# demo-boards Specification

## Purpose

Define the demo-board rail beside the main board. The rail holds one slot-addressed board per registered demo engine (`demo-slot-1`, `demo-slot-2`, and so on up to the rail's twelve slots). Each board auto-plays its own session by replaying its engine's action log. The boards keep running while the main board does not. They follow the attract demo's level. They show only their engine name, description, and primary statistics, at the mino size computed from the four-per-row wall. A double-click during the attract demo can trade a board's place with the main board.
## Requirements
### Requirement: A board set pairs the main session with one demo board per registered engine

Alongside the main board's session, the browser gameplay client SHALL keep one demo board per engine registered in the shared demo engine registry. The boards follow registration order and use the stable rail-slot ids `demo-slot-1`, `demo-slot-2`, and so on. The number of demo boards SHALL NOT exceed the rail's capacity of `12` boards. Engines registered beyond that capacity SHALL NOT add boards. The client SHALL resolve every demo board's engine from the registry. With the built-in engines, slot 1 plays `delphi5` and slot 2 plays `random`. Slots 3 to 9 play the seven AI-authored engines in catalog order. Every board SHALL own its own `PentixGameSession`. All sessions created for one board set SHALL come from one and the same `PentixGame`. The client SHALL identify a demo board by its slot id, never by its engine id. The client SHALL address auto-play and engine operations to one board at a time. A demo board therefore keeps its slot id when the engine assigned to it changes. The main board's attract-demo engine SHALL be part of the board set. It SHALL start as `delphi5` on the initial board set. Every later board set the client creates SHALL keep the engine the game state already holds. The demo engine a double-click brought to the main board therefore survives the player's next game, a restart, and the demo that follows. The rail SHALL always be reassigned in registration order. The rail SHALL NOT be derived from the main board's engine. The main board and a rail slot can therefore end up playing the same engine.

#### Scenario: The page load starts the main session and every demo board

- **GIVEN** a freshly loaded page with no player game in progress
- **WHEN** the client initializes
- **THEN** the main board enters the attract demo with its own session
- **AND** one demo board exists per registered engine with a distinct session each
- **AND** every demo-board session has `status` `active`

#### Scenario: The engine assignment follows the registry order

- **GIVEN** a freshly created board set and the registry's built-in engines
- **WHEN** the client resolves the engine of each demo board
- **THEN** `demo-slot-1` uses the registry engine with id `delphi5` and name `Delphi 5`
- **AND** `demo-slot-2` uses the registry engine with id `random` and name `Random`
- **AND** `demo-slot-3` uses the registry engine with id `claude-opus-5-5-extra` and name `Claude Opus 5.5 Extra`
- **AND** `demo-slot-9` uses the registry engine with id `qwen-4-max` and name `Qwen 4 Max`
- **AND** the main board uses the registry engine with id `delphi5`

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

### Requirement: Every board draws from one shared piece sequence

The client SHALL keep a single `PentixGame` for a board set and SHALL pass it to every session operation of every board. When an operation returns a game with additional piece ids, the client SHALL keep that extended game as the board set's game. All boards therefore continue from one piece list. Two boards at the same `nextPieceIndex` SHALL therefore hold the same active piece key and the same next piece key.

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

The client SHALL create a fresh session for the main board and a fresh session for each demo board in one state change. The triggers are the initial page load, `start`, `restart`, and a level selection that starts a game from the game-over screen. Choosing the attract demo from the game-over screen also triggers it. All these sessions come from the new board set's game. Each new demo-board session SHALL open at the starting level applied to the main session. Each slot SHALL return to the engine the registry assigns to its position (with the built-in engines `delphi5` in slot 1 and `random` in slot 2). The main board SHALL return to `random` as well. Player actions on the main board (`tick`, `move`, `rotate`, `drop`, `pause`, `resume`) SHALL NOT create or reset demo-board sessions.

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

### Requirement: The demo boards keep running while the main board does not

The demo boards SHALL advance independently of the main board's phase and of any player action on it. The main board can be game over or paused. It can also hold its finished attract demo until the whole board set ends, or run its attract demo. In each case, every demo board whose session is still `active` SHALL keep advancing on its own timer. Opening the pieces statistics popup SHALL pause the main board only.

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

#### Scenario: The finished attract demo leaves the demo boards running

- **GIVEN** the main board holding its finished attract demo while the demo boards still play
- **WHEN** the demo boards' gravity intervals elapse
- **THEN** each active demo board applies its next step
- **AND** the main board keeps its finished session

### Requirement: A demo board auto-plays through its own engine and the shared session engine

Each demo board SHALL plan once per spawned piece with the engine assigned to it. That engine returns a `DemoActionLog` for the board's active piece. The board SHALL replay the log one action per gravity interval. It SHALL apply exactly one gravity tick at each interval boundary. It SHALL apply exactly one action through the shared `GameSessionEngine` halfway between two consecutive ticks. From the piece's spawn, the cadence is therefore half an interval, Action, the rest of the interval, Tick. Each demo board's session SHALL start with the demo's seeded mino. That mino is one settled cell on the row before last, in a column chosen when that board's session starts. The board SHALL keep that cell until its row is cleared. When the applied code is `H`, the board SHALL treat the code after it as the next action step. That step comes half an interval after the drop, and that code is the piece's last-tick move (`L` or `R`). The board SHALL restart its interval rhythm. The tick that locks the dropped piece and spawns the next one then comes a full interval after the drop. When that drop settles the board's piece instead, the following code SHALL be dropped with the finished piece's log. That code SHALL NOT steer the spawned piece. Once the log is exhausted, the board SHALL apply ticks only until its piece locks. An action the board blocks SHALL leave the placement unchanged while that interval's tick still applies. Any unplayed actions SHALL be dropped when the piece locks. Every movement, rotation, hard drop, side-step, lock, and game-over detection SHALL go through the shared `GameSessionEngine`. The demo boards SHALL NOT re-implement those operations, and a demo board SHALL plan only with its own engine. The interval SHALL follow that board's own `session.statistics.level`. The board's tick and action SHALL run on one timer at half of that interval. A demo-board action therefore never lands in the same instant as its gravity tick.

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

#### Scenario: A demo board replays its log between ticks

- **GIVEN** a demo board whose engine returned the log `"LH"` for its current piece
- **WHEN** its next two gravity intervals elapse
- **THEN** the board moves the piece left at the midpoint of the first interval after it spawned
- **AND** the gravity tick that closes that interval comes half an interval later
- **AND** the board hard-drops the piece at the midpoint of the interval that tick opened
- **AND** the dropped piece stays in place until the next tick locks it

#### Scenario: A demo board takes its last-tick move after the drop

- **GIVEN** a demo board whose log reaches `H` followed by one `R`, and a piece that can still be placed one row lower
- **WHEN** the drop's step and the step after it are applied
- **THEN** the drop's step only hard-drops the piece, which stays where it landed
- **AND** the next step moves it one column right, half an interval later
- **AND** the tick a full interval after the drop locks it, and only the addressed board advances

#### Scenario: A settling drop drops the last-tick move

- **GIVEN** a demo board whose piece cannot move down and whose log's next codes are `H` and `R`
- **WHEN** that steering step is applied
- **THEN** the hard drop settles the piece through the shared engine
- **AND** the following `R` is dropped with the finished piece's log, so it never moves the spawned piece
- **AND** the next gravity step still applies to the spawned piece

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
- **AND** that interval's gravity tick still applies

#### Scenario: A new piece drops the old log

- **GIVEN** a demo board whose piece locked with unplayed actions still in its log
- **WHEN** the next piece spawns
- **THEN** the board plans a fresh log for the new piece
- **AND** the previous piece's unplayed actions are never applied to it

### Requirement: A demo-board step applies to one board and stale steps are ignored

Every auto-play step SHALL name its board by slot id. A steering step SHALL also name the session id and the piece index it was planned for. The client SHALL apply a gravity step only to a board whose session is `active`. It SHALL apply a steering step only to a board whose session matches those values and whose status is `active`. Otherwise it SHALL leave the whole board set unchanged. A demo board whose session has reached `status` `game-over` SHALL ignore further steps and keep its final board. Steps planned for one slot SHALL NOT be applied to another slot, whatever engines the slots play.

#### Scenario: Only the addressed board advances

- **GIVEN** a board set with several active demo boards
- **WHEN** a step addressed to `demo-slot-2` is applied
- **THEN** only the `demo-slot-2` session advances
- **AND** the `demo-slot-1` session and the main session are unchanged

#### Scenario: A stale step is ignored

- **GIVEN** a steering step planned for a session id or piece index that no longer matches the addressed demo board
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
- **AND** no fresh session is created for it until the whole board set restarts

### Requirement: A demo board shows only the primary statistics

Each demo board SHALL render its own session's board at the session's stored `width`-by-`height` grid. The board SHALL color each cell by its `pieceKey` and overlay the active piece. The demo-board minos SHALL be as large as the rail's four-column wall allows. Four board slots plus the three horizontal gaps SHALL fit inside the rail column. No cell SHALL be smaller than `4` px, and no cell SHALL be larger than `11` px. Concretely, each of the four boards in a row uses the stored `12` columns. The measurements are `1` px cell gaps, `4` px board padding, `4` px card padding, and `2` px of borders. Each board therefore occupies `12` times the mino size plus `31` px. The mino is therefore `11` px at desktop widths. It steps through `10`, `9`, `8`, and `7` px as the shell narrows. It is `6` px once four `7` px boards no longer fit side by side. The rail switches to two boards per row below `480` px. The horizontal gap between rail boards SHALL be the row gap plus `0.25rem` (`4` px at the default root). The card's header SHALL have two rows and no more. The first row SHALL show only the name of the engine currently assigned to that board. The client reads that name from the registry, so the row is not limited to a fixed list of engines. The name sits next to an `i` info icon. The info icon SHALL reveal that engine's name and its `description` together — the name repeated above the description. The icon does this while the pointer hovers over it or the icon has keyboard focus. The panel SHALL close when the pointer and the focus leave it. The description SHALL NOT be printed anywhere else on the card. The second row SHALL show exactly three values on one line that never wraps. The client reads these values from the board's own session statistics. The row shows `S` for `statistics.score`, `L` for `statistics.clearedLines`, and `P` for `statistics.blocks`, separated by commas. The full words `Score`, `Lines`, and `Pieces` SHALL be exposed as the abbreviated labels' tooltips. The row SHALL render at a slightly larger font than the previous `0.56rem` card line (`0.66rem`). When the session's status is `game-over`, the card SHALL keep the final locked board visible. The card SHALL draw a `Game over` overlay over the board area. The overlay follows the main board's game-over overlay (a dimmed backdrop with a `Game over` title) without its buttons. The overlay SHALL repeat the board's final `Score`, `Lines`, and `Pieces` values read from that session. The overlay SHALL render its title and values at a slightly larger font than the card statistics (`0.9rem` title, `0.7rem` values). The header SHALL NOT carry a separate game-over marker. The card SHALL NOT render a next-piece preview, a pieces statistics popup, action counters, a level selector, on-screen controls, or a pause overlay. The card SHALL read every value from the session snapshot rather than keeping client-side copies.

#### Scenario: The primary statistics match the board's session

- **GIVEN** a demo board whose session has a known score, cleared line count, and locked-piece count
- **WHEN** the board renders
- **THEN** its first header row shows the engine name
- **AND** its second header row shows those three values as `S`, `L`, and `P`
- **AND** it renders no other statistic

#### Scenario: The engine name and description are revealed by the info icon

- **GIVEN** a demo board whose engine has a non-empty description in the registry
- **WHEN** the pointer hovers over the card's `i` info icon
- **THEN** a panel shows the engine's name and that description together
- **AND** the panel closes when the pointer leaves the icon

#### Scenario: The info icon is keyboard reachable

- **GIVEN** a demo board with its `i` info icon
- **WHEN** the icon receives keyboard focus
- **THEN** the same name-and-description panel appears
- **AND** it disappears when focus leaves the icon

#### Scenario: The statistics row never wraps

- **GIVEN** a demo board whose session reports a five-digit score and three-digit line and piece counts
- **WHEN** the board renders at the rail's narrowest card width
- **THEN** `S`, `L`, and `P` appear on one line
- **AND** the card's height matches the other cards of its rail row

#### Scenario: A demo board renders no secondary statistics or controls

- **GIVEN** any demo-board session, including one whose engine recorded moves and rotations
- **WHEN** the board renders
- **THEN** it renders no next-piece preview, no pieces statistics popup, no action counters, no level selector, and no on-screen controls
- **AND** it renders no pause overlay

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

#### Scenario: A finished demo board shows a game-over overlay

- **GIVEN** a demo board whose session reached `status` `game-over`
- **WHEN** the board renders
- **THEN** it keeps the final locked board visible
- **AND** a `Game over` overlay with a dimmed backdrop covers the board area
- **AND** the overlay carries no buttons
- **AND** the overlay lists the final score, lines, and pieces
- **AND** the card's header carries no separate game-over marker

#### Scenario: The overlay reports the final statistics

- **GIVEN** a demo board whose session ended with a known score, line count, and locked-piece count
- **WHEN** the board renders its game-over overlay
- **THEN** the overlay shows those three values under the `Game over` title
- **AND** its title and values are a little larger than the card's `S`/`L`/`P` line
- **AND** the values come from the same session snapshot as the card line

#### Scenario: The engine name follows the swapped engine

- **GIVEN** a demo board that received the `random` engine and session from the main board
- **WHEN** the board renders
- **THEN** its engine label reads `Random`
- **AND** its info panel reveals the `random` engine's description
- **AND** its statistics come from the session it received

### Requirement: Changing the level during the attract demo retunes every demo board

While the main board runs its attract demo, every level change SHALL also apply to every demo-board session. A level change is a level button, the `+`/`-` keys, or a `0`-`9` key. The whole rail therefore changes its gravity cadence together with the main demo. Such a change SHALL keep each demo board's session id, engine, board snapshot, statistics, and piece index, and SHALL change only the level. Level changes during a player game SHALL apply to the main session only. A level chosen during the demo's post-game-over delay SHALL apply to the main session. The next demo restart SHALL apply it to every demo board as well.

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

While the main board runs its attract demo, or shows its finished demo before the restart delay elapses, a double-click SHALL take effect. A double-click on a demo board SHALL exchange the two boards. The clicked board's session and engine SHALL become the main board's session and engine. The main board's session and engine SHALL take that board's slot. The exchange SHALL keep both sessions unchanged — same session id, board snapshot, statistics, piece index, status, and level. It SHALL NOT create a session, and SHALL NOT touch any other demo board. It SHALL keep the single shared `PentixGame` as the board set's game. After the exchange the main board SHALL take the phase that matches the arriving session's status. That phase is `demo` for an `active` session and `demo-over` for a `game-over` session. A double-click SHALL be ignored while the main board runs a player game, and the rail SHALL NOT reorder its slots.

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

### Requirement: The attract demo restarts only after every board has ended

When the main board's demo session reaches `status` `'game-over'`, the client SHALL keep that finished session on the main board. It does this while any demo board's session is still `active`. The client SHALL keep advancing those demo boards on their own timers. The client SHALL NOT create a fresh main demo session. Once every demo board's session has also reached `game-over`, the client SHALL wait out the same `700` ms game-over delay. The client measures that delay from the last board's end. The client SHALL then start a fresh demo cycle. That cycle has one new `PentixGame`. It also has a fresh main demo session seeded with the demo's mino. Every demo board has a fresh session, and the rail is reassigned in registry order. The fresh main session SHALL be planned by the engine the main board was playing. The client SHALL carry nothing else over from the ended board set except the settings. A manual restart SHALL be possible before that gate. Pressing Space while the main board holds a finished demo SHALL start the same fresh demo cycle at once.

#### Scenario: A finished main demo leaves the rail alone

- **GIVEN** a main demo that has reached its final board and a demo board whose session is still `active`
- **WHEN** the demo board's gravity steps elapse
- **THEN** that demo board keeps advancing the session it already had
- **AND** the main board keeps the finished session's id, board, and statistics
- **AND** no fresh main session exists yet

#### Scenario: The whole board set restarts together

- **GIVEN** a board set whose main demo and demo boards have all reached their final boards
- **WHEN** the `700` ms delay measured from the last board's end elapses
- **THEN** the main board and every demo board receive a new session
- **AND** each board's new session id differs from the one it replaced
- **AND** the rail is assigned in registry order again
- **AND** every new session is `active`

#### Scenario: The restart revives dead rail boards

- **GIVEN** a demos-only board set whose `demo-slot-1` session has been `game-over` for a while
- **WHEN** the whole board set ends and the delay elapses
- **THEN** `demo-slot-1` plays a fresh `active` session seeded with the demo's mino
- **AND** its engine is the registry engine for that slot again

#### Scenario: Space restarts the cycle before the gate

- **GIVEN** a finished main demo while a demo board still plays
- **WHEN** the player presses Space
- **THEN** a fresh board set starts immediately, on the main board and on the rail
- **AND** the demo boards that were still playing are replaced rather than kept

