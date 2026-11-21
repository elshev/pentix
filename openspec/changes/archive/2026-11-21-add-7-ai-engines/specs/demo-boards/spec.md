## MODIFIED Requirements

### Requirement: A board set pairs the main session with one demo board per registered engine

Alongside the main board's session, the browser gameplay client SHALL keep one demo board per engine registered in the shared demo engine registry, in registration order, addressed by the stable rail-slot ids `demo-slot-1`, `demo-slot-2`, and so on. The number of demo boards SHALL NOT exceed the rail's capacity of `12` boards; engines registered beyond that capacity SHALL NOT add boards. Every demo board's engine SHALL be resolved from the registry, so with the built-in engines slot 1 plays `delphi5`, slot 2 plays `random`, and slots 3 to 9 play the seven AI-authored engines in catalog order. Every board SHALL own its own `PentixGameSession`, and all sessions created for one board set SHALL be created from one and the same `PentixGame`. The client SHALL identify a demo board by its slot id — never by its engine id — and SHALL address auto-play and engine operations to one board at a time, so a demo board keeps its slot id when the engine assigned to it changes. The main board's attract-demo engine SHALL be part of the board set: it SHALL start as `delphi5` on the initial board set, and every later board set the client creates SHALL keep the engine the game state already holds, so the demo engine a double-click brought to the main board survives the player's next game, a restart, and the demo that follows. The rail SHALL always be reassigned in registration order and SHALL NOT be derived from the main board's engine, so the main board and a rail slot can end up playing the same engine.

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
- **AND** `demo-slot-3` uses the registry engine with id `claude-opus-5-5-extra` and display name `Claude Opus 5.5 Extra`
- **AND** `demo-slot-9` uses the registry engine with id `qwen-4-max` and display name `Qwen 4 Max`
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

### Requirement: A demo board shows only the primary statistics

Each demo board SHALL render its own session's board at the session's stored `width`-by-`height` grid with its cells colored by `pieceKey` and its active piece overlaid. The demo-board minos SHALL be as large as the rail's four-column wall allows: four board slots plus the three horizontal gaps SHALL fit inside the rail column, with no cell smaller than `4` px and no cell larger than `11` px. Concretely, four boards of the stored `12` columns with `1` px cell gaps, `4` px board padding, `4` px card padding, and `2` px of borders per board occupy `12` times the mino size plus `31` px each, so the mino is `11` px at desktop widths, steps through `10`, `9`, `8`, and `7` px as the shell narrows, and is `6` px once four `7` px boards no longer fit side by side; the rail switches to two boards per row below `480` px. The horizontal gap between rail boards SHALL be the row gap plus `0.25rem` (`4` px at the default root). The card's header SHALL have two rows and no more. The first row SHALL show only the display name of the engine currently assigned to that board, read from the registry and not limited to a fixed list of engines, next to an `i` info icon. The info icon SHALL reveal that engine's display name and its `description` together — the name repeated above the description — while the pointer hovers over the icon or the icon has keyboard focus, and the panel SHALL close when the pointer and the focus leave it; the description SHALL NOT be printed anywhere else on the card. The second row SHALL show exactly three values read from the board's own session statistics on one line that never wraps: `S` for `statistics.score`, `L` for `statistics.clearedLines`, and `P` for `statistics.blocks`, separated by commas, with the full words `Score`, `Lines`, and `Pieces` exposed as the abbreviated labels' tooltips, and rendered at a slightly larger font than the previous `0.56rem` card line (`0.66rem`). When the session's status is `game-over`, the card SHALL keep the final locked board visible and SHALL draw a `Game over` overlay over the board area, following the main board's game-over overlay (a dimmed backdrop with a `Game over` title) without its buttons. The overlay SHALL repeat the board's final `Score`, `Lines`, and `Pieces` values read from that session and SHALL render its title and values at a slightly larger font than the card statistics (`0.9rem` title, `0.7rem` values), and the header SHALL NOT carry a separate game-over marker. The card SHALL NOT render a next-piece preview, a pieces statistics popup, action counters, a level selector, on-screen controls, or a pause overlay, and SHALL read every value from the session snapshot rather than keeping client-side copies.

#### Scenario: The primary statistics match the board's session

- **GIVEN** a demo board whose session has a known score, cleared line count, and locked-piece count
- **WHEN** the board renders
- **THEN** its first header row shows the engine display name
- **AND** its second header row shows those three values as `S`, `L`, and `P`
- **AND** it renders no other statistic

#### Scenario: The engine name and description are revealed by the info icon

- **GIVEN** a demo board whose engine has a non-empty description in the registry
- **WHEN** the pointer hovers over the card's `i` info icon
- **THEN** a panel shows the engine's display name and that description together
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
