# repository-documentation Specification

## Purpose

Describe the repository documentation that explains Pentix goals, glossary terms, repository layout, and the scope of the current implementation increment.
## Requirements
### Requirement: Repository documentation describes Pentix and the capabilities that ship

The repository SHALL document Pentix for a developer who has never seen it. That documentation SHALL include the glossary, the shared-code layout, the capabilities that exist today, and the work that is deliberately absent.

The documentation SHALL describe:

- the glossary terms `Mino`, `Piece`, `Board`, `BoardCell`, `GameLevel`, `Tick`, `PentixGame`, `PentixGameSession`, `User`, and `Next piece`, using the vocabulary of `shared-game-primitives`, `game-piece-set`, and `game-session-start` (a piece has a single `key` and no `name` field),
- the shared-code direction: `apps/pentix-web` (browser client), `apps/pentix-server` (`PentixServer`), and `packages/pentix-core`, which both applications consume,
- the capabilities as built: the shared primitives and `GameSessionEngine`, the REST endpoints and their persistence, and the browser client. That client has a board, a statistics popup, a level selector, an attract demo, and a demo-board rail. The rail holds one board per engine registered in the demo engine registry. Nine built-in engines fill it: the classic `delphi5` and `random` engines followed by the seven AI-authored engines `claude-opus-5-5-extra`, `claude-sonnet-5-5-extra`, `deepseek-v4-flash-1107-max`, `deepseek-v4-pro-max`, `glm-5-3-flash-extra`, `minimax-m3-1-flash-extra`, and `qwen-4-max`. The capabilities also cover the one-module-per-engine convention that the registry loads, and the file-naming grammar `<vendor>-<version>[-<variant>]-<mode>-demo-engine.ts` that an AI-authored engine follows. That grammar makes the vendor, version, variant, and mode readable from the file name,
- and the capabilities that are not built yet, stated as such rather than as finished work.

The documentation SHALL NOT describe shipped behaviour as future work. It SHALL NOT describe contracts that were removed. It SHALL NOT present a historical increment as the current scope.

#### Scenario: A new developer can place shared code

- **GIVEN** a developer is new to the repository
- **WHEN** they read the root documentation
- **THEN** they can identify where shared game-domain code belongs
- **AND** they can distinguish the browser application from the `PentixServer` application
- **AND** they can look up every glossary term the codebase uses

#### Scenario: The documentation matches the shipped client

- **GIVEN** the browser client that ships today
- **WHEN** a developer reads the documentation
- **THEN** the board, the statistics popup, the level selector, the attract demo, and the demo-board rail are described as present
- **AND** no shipped feature is listed as not implemented

#### Scenario: The demo rail is documented as a registry-driven capability

- **GIVEN** the browser client that renders one demo board per registered engine
- **WHEN** a developer reads the browser-client section of the documentation
- **THEN** the rail, its registry-driven engine assignment, its rail capacity, and its shared piece sequence are described as present
- **AND** the documentation does not describe the rail as exactly two hard-coded engines

#### Scenario: The AI-authored engines and their naming convention are documented

- **GIVEN** a developer reading how demo engines are structured
- **WHEN** they look for the built-in catalog and the engine module convention
- **THEN** the documentation lists the nine built-in engines, the classic two first and the seven AI-authored ones after them
- **AND** it states the `<vendor>-<version>[-<variant>]-<mode>-demo-engine.ts` grammar and what each segment means, and that the bracketed run note is not part of the id
- **AND** it states that an authored plan function is wrapped by the shared adapter

#### Scenario: The remaining gaps are stated explicitly

- **GIVEN** the current implementation
- **WHEN** a developer reads the "not implemented yet" section
- **THEN** durable history endpoints, a PostgreSQL repository, multiplayer orchestration, and the missing browser-to-server connection are listed there
- **AND** nothing else is listed as missing

#### Scenario: The glossary keeps the current vocabulary

- **GIVEN** the glossary entries for pieces and games
- **WHEN** a developer reads them
- **THEN** a catalog piece is described by its single `key`
- **AND** no entry mentions a piece `name` field or the legacy `bi*` keys

### Requirement: The repository documents how to author a demo engine

The repository SHALL contain `docs/demo-engine-task.md`, a self-contained authoring brief that can be handed unchanged to an AI with no access to this repository. The brief SHALL ask only for the planning function, not for an engine id, name, description, file path, imports, or registration. The brief SHALL state the exact `plan(board, piece, position): string` signature and result type. It SHALL define `board` as rows of `0` (free) and `1` (occupied). It SHALL define `piece` as the active piece's reachable orientations, each a list of cells relative to its rotation point, whose point is `{ row: 0, column: 0 }`. It SHALL define `position` as the rotation point on the board. It SHALL explain that an absolute cell is `position + cell`. The brief SHALL explain the game and the action alphabet: `L` move left, `R` move right, `C` rotate clockwise, `A` rotate anticlockwise, and `H` hard drop. It SHALL state the rule that only `L`, `R`, `C`, `A`, and `H` are accepted. It SHALL explain the driving rhythm: a piece appears, then one tick follows every action and moves the piece down or locks it. One more action is allowed at the last position before the locking tick. The brief SHALL explain the rotation and wall-kick rules, with the advice to rotate before moving. It SHALL explain what the function may and may not do. The brief SHALL list every block of the shared catalog, all 29 pieces, with key, rotation mode, and cell offsets. Each block SHALL have a shape diagram that marks the rotation point. An author can then reason about the whole piece set without repository access. The brief SHALL state which rotation mode gives how many reachable orientations. The brief SHALL explain the scoring the caller applies, because the score is the goal of a plan. Locking a piece scores `minos × level`. The hard drop scores `floor(minos × (height − dropRow) × level ÷ 10)`, so a piece dropped earlier, while it is higher up, is worth more. Each row the lock clears scores `clearedIndex × (10 + (height − row)) × level`. Emptying the board scores a flat `1000`. The level multiplier rises by one every 30 locked pieces up to `9`. The brief SHALL state that the plan's goal is the highest score and SHALL connect the placement advice to it. The brief SHALL explain the last-tick move after the hard drop. One `L` or `R` placed after `H` is applied as the action after the drop, before the tick that locks the piece. That tick then locks the piece in the shifted column or lets it fall further. No rotation or second drop may follow `H`. The brief SHALL include a worked pocket example with a settled mino on the row before last. The brief SHALL require a TypeScript answer. The returned function SHALL be TypeScript with annotated parameters. Every example in the brief SHALL be TypeScript. The brief SHALL NOT admit plain JavaScript answers. The brief SHALL NOT assume a particular AI, model, editor, or chat tool. It SHALL NOT require the author to modify any other file. It SHALL be the same text for every engine, with only the strategy idea supplied by the requester. `docs/foundation.md` SHALL summarize the engine module convention, the last-tick move after the drop, and point at the brief.

#### Scenario: The brief is enough without other context

- **GIVEN** an author who has never seen the repository
- **WHEN** they read only `docs/demo-engine-task.md`
- **THEN** they can state the `plan(board, piece, position)` signature, the types and meaning of `board`, `piece`, and `position`, the action alphabet, the driving rules, and the answer format. They need no repository access.

#### Scenario: The brief states the action-then-tick rule and the accepted characters

- **GIVEN** an author reading only `docs/demo-engine-task.md`
- **WHEN** they write the engine's plan
- **THEN** the brief has told them a piece appears, then every action is followed by one tick that moves it down or locks it
- **AND** that one more action is allowed at the last position, before the tick that locks the piece
- **AND** that only `L`, `R`, `C`, `A`, and `H` are accepted, and any other character is ignored
- **AND** that ticks alone continue after the string ends

#### Scenario: The brief lists every block

- **GIVEN** an author reading only `docs/demo-engine-task.md`
- **WHEN** they look up the piece set
- **THEN** all 29 catalog blocks appear with their key, rotation mode, offsets, and a shape diagram
- **AND** every diagram marks the rotation point
- **AND** the brief maps each rotation mode to its reachable orientation count

#### Scenario: The brief explains the scoring rules

- **GIVEN** an author reading only `docs/demo-engine-task.md`
- **WHEN** they plan a piece
- **THEN** the brief states that the plan's goal is the highest score
- **AND** it gives the points for locking a piece, for the hard drop, for each cleared row, and for emptying the board
- **AND** it explains that a piece dropped earlier, while it is higher up, scores more for the fall
- **AND** it explains that the level multiplies those points and how the level rises

#### Scenario: The brief explains the move after the drop

- **GIVEN** an author reading only `docs/demo-engine-task.md`
- **WHEN** they decide whether to side-step after a hard drop
- **THEN** the brief explains that one `L` or `R` after `H` is applied as the action after the drop, before the tick that locks the piece
- **AND** it shows a worked pocket example under a settled mino on the row before last
- **AND** it forbids a rotation or a second drop after `H`

#### Scenario: The brief advises rotating before moving

- **GIVEN** an author reading only `docs/demo-engine-task.md`
- **WHEN** they plan a rotation next to a wall or a tall stack
- **THEN** the brief explains that a blocked rotation is kicked sideways, or up against the top, and can leave the piece a column away
- **AND** it advises rotating while the piece is still high and steering it into the column afterwards

#### Scenario: The brief requires TypeScript

- **GIVEN** an author reading only `docs/demo-engine-task.md`
- **WHEN** they write the answer
- **THEN** the brief requires one TypeScript `plan` function with annotated parameters
- **AND** every code example in the brief is TypeScript
- **AND** no part of the brief offers a plain JavaScript answer

#### Scenario: The brief is identical for every engine

- **GIVEN** two requests for different demo engines
- **WHEN** their briefs are compared
- **THEN** the instructions, rules, and self-checks are the same text
- **AND** only the supplied strategy idea differs

#### Scenario: An engine authored from the brief fits the convention

- **GIVEN** a plan function authored strictly from the brief
- **WHEN** it is wrapped in a `<engine-id>-demo-engine.ts` module that adds `id`, `name`, and `description`
- **THEN** the strict TypeScript build accepts it without edits to the function
- **AND** the catalog can register it with no new registry or browser-client code

#### Scenario: The foundation notes point at the brief

- **GIVEN** a developer reading `docs/foundation.md`
- **WHEN** they look for how demo engines are structured
- **THEN** they find the one-module-per-engine convention, the post-drop last-tick rule, and a reference to `docs/demo-engine-task.md`

### Requirement: The authoring brief demands a self-contained answer with an algorithm note

`docs/demo-engine-task.md` SHALL require the author to answer from that document alone. The reply SHALL be produced fresh for the request. It SHALL NOT reuse or quote code, notes, or context from another chat. It SHALL NOT import a helper from another answer. It SHALL contain only the complete TypeScript `function plan(...)` that the request asks for. The brief SHALL also require a short comment block above the function that describes the algorithm in a few lines. The comment SHALL state what the plan enumerates, how it scores a placement, and why it ends where it does. The brief SHALL make clear that this leading comment is required, while prose after the function is not. The brief SHALL state that the log ends at `H` whenever the chosen placement is reachable by a straight drop. It SHALL state that the single post-drop side-step is a last resort for a pocket under an overhang. Its last-tick section, worked pocket example, and self-check list SHALL all express that rule.

#### Scenario: The brief asks for a fresh, self-contained answer

- **GIVEN** an author reading only `docs/demo-engine-task.md`
- **WHEN** they prepare the answer
- **THEN** the brief tells them to produce it from this document alone
- **AND** it forbids reusing code, notes, or context from another chat
- **AND** it asks for the complete function with nothing but the required algorithm comment around it

#### Scenario: The algorithm comment is part of the answer format

- **GIVEN** a returned TypeScript answer
- **WHEN** the brief's answer-format section is applied to it
- **THEN** the answer carries a short comment above `function plan` describing the algorithm
- **AND** the brief does not forbid that comment
- **AND** it still forbids prose after the function

#### Scenario: The brief prefers a drop to a side-step

- **GIVEN** an author choosing between a placement reached by a straight drop and one reached by a side-step
- **WHEN** they read the brief's last-tick section and self-check
- **THEN** the brief says the log ends at `H` when a straight drop reaches the placement
- **AND** it reserves the one post-drop `L` or `R` for placements a drop cannot reach
- **AND** its worked pocket example is presented as the exception, not the default

#### Scenario: The brief's checks reject an unnecessary side-step

- **GIVEN** an answer whose log always appends a lateral move after `H`
- **WHEN** the brief's self-check list is applied to it
- **THEN** the answer fails at least one check
- **AND** the failing check names the side-step that the placement did not need

### Requirement: The documentation describes the server demo batches

The repository documentation SHALL describe the server-side demo batches as a shipped capability. That capability is `POST /demo-runs` with its `gameCount` parameter, default `1` and maximum `256`. It includes the background execution and the retrievable status. It includes the run result with two sections, `engines` and `games`. It SHALL state that `engines` lists one line per engine, ordered winner to loser. Each line carries `engineId`, `name`, `totalPoints`, `totalLines`, `totalPieces`, planning time, and time per `1000` pieces over every game, and no `description`. It SHALL state that `games` lists one entry per finished game, ordered by `index`. It SHALL state that each entry carries the zero-based `index`, the stored game `id`, and its own `standings`. It SHALL state that a game's `standings` is ordered by points, then lines, then pieces, then shorter planning time, then engine id. It SHALL state that a game row carries `engineId`, points, lines, pieces, and planning time, and no engine name and no rate. It SHALL state that the time per `1000` pieces is `null` when `totalPieces` is `0`. The documentation SHALL state that a run record is in memory only and that a restart forgets its id. It SHALL state that each finished demo session is stored as an action log under its engine's AI user, in the `PENTIX_DATA_FILE` store. It SHALL state that the browser attract demo stays local and stores nothing. The documentation SHALL also describe the shared demo playback in `pentix-core`, which covers seeded demo sessions, Action-then-Tick replay, the recorded log, and plan-time measurement. It SHALL NOT present demo games as something that can only be watched in the browser.

#### Scenario: The Server API section lists the demo endpoints

- **GIVEN** a developer reading `README.md`
- **WHEN** they look up the server API
- **THEN** `POST /demo-runs` and `GET /demo-runs/{id}` are documented
- **AND** the `gameCount` default and maximum are stated
- **AND** the `engines` and `games` sections are named

#### Scenario: The result fields name the per-game breakdown

- **GIVEN** a developer reading the `GET /v1/demo-runs/{id}` paragraph
- **WHEN** they look for the game of a score
- **THEN** the paragraph names the `engines` list with `engineId`, `name`, and the `total*` fields
- **AND** it names the `games` list with `index`, `id`, and `standings`
- **AND** it names `playingTimePer1000PiecesMs` on an engine line and states that a game row omits it
- **AND** it states the `null` value for a line without total pieces

#### Scenario: The shipped demo batches are not listed as missing

- **GIVEN** the "not implemented yet" section of the root documentation
- **WHEN** a developer reads it
- **THEN** server demo runs are not listed there
- **AND** the absence of a UI for them is stated
- **AND** the in-memory run record and the durable demo sessions are both stated
- **AND** the missing browser-to-server connection is stated

#### Scenario: The foundation notes explain the shared playback

- **GIVEN** a developer reading `docs/foundation.md`
- **WHEN** they look for how a demo is played without a browser
- **THEN** they find the shared playback module in `pentix-core`, its seeded session and Action-then-Tick rules, and the plan-time measurement
- **AND** they find the recorded session log that the playback returns
- **AND** they find the demo-run service in `apps/pentix-server`, its in-memory run record, and its durable demo sessions
- **AND** they find the engine ranking, the per-game standings, and the time per `1000` pieces rule

### Requirement: The repository names its glossary and its decision index

The repository SHALL keep the glossary in `GLOSSARY.md` at the repository root. Each glossary entry SHALL give the term, the code name in parentheses, a definition, and the words to avoid. The glossary SHALL hold one entry for each term that the code and the specs use. Those terms include the piece, board, session, demo, server, and process terms.

The repository SHALL keep a decision index at `docs/decisions/README.md`. The index SHALL list every archived design record under `openspec/changes/archive/` with its date, its scope, and its status. A status SHALL be `Accepted`, `Partly superseded by <record>`, or `Superseded by <record>`. The index SHALL name the design record and `docs/foundation.md` as the two places where a decision and its reason live.

`README.md` SHALL name `GLOSSARY.md` and `docs/decisions/README.md` in its repository layout block, and SHALL link to both. `README.md` SHALL NOT repeat the glossary entries.

#### Scenario: A developer looks up a term

- **GIVEN** a developer who reads the root documentation
- **WHEN** they follow the glossary link to `GLOSSARY.md`
- **THEN** each entry gives the term, the code name, the definition, and the words to avoid
- **AND** the entry names the code spelling to use, for example `GameSessionEngine`

#### Scenario: A developer finds why a decision was made

- **GIVEN** a developer who reads `docs/decisions/README.md`
- **WHEN** they look for a decision
- **THEN** every archived design record appears with its date, its scope, and its status
- **AND** each row links to its design record
- **AND** a replaced decision names the record that replaced it

#### Scenario: The glossary has one home

- **GIVEN** the root documentation
- **WHEN** a developer looks for a glossary entry
- **THEN** `README.md` links to `GLOSSARY.md` and does not list the entries again
- **AND** `docs/foundation.md` points at `GLOSSARY.md` for the vocabulary that it uses

### Requirement: The documentation names the AI users and the stored demo sessions

The repository documentation SHALL state that a `User` has a `type` of `human` or `ai`. It SHALL state that every registered demo engine owns one AI `User` row with an `engineId`, and that a client filters on `type` to read only human users. `GLOSSARY.md` SHALL define `User type`, `AI user`, and `Demo session log`. The foundation note SHALL name the four added storage columns and the in-place migration. `docs/decisions/README.md` SHALL gain one row for this design record when `openspec archive` moves it.

#### Scenario: A developer looks up the user type

- **GIVEN** a developer who reads `GLOSSARY.md`
- **WHEN** they look for the user type
- **THEN** the entry names `User type`, the values `human` and `ai`, and the `engineId` binding
- **AND** it states that `README.md` does not repeat the entry

#### Scenario: The documentation describes the stored demo sessions

- **GIVEN** a developer who reads the storage section
- **WHEN** they look for demo persistence
- **THEN** the text names the AI user per engine
- **AND** it names the stored game and session log per finished demo session
- **AND** it names the `PENTIX_DATA_FILE` setting

#### Scenario: The decision index gains the record

- **GIVEN** this design record is archived
- **WHEN** a developer reads `docs/decisions/README.md`
- **THEN** one row links this design record
- **AND** the row states the date, the scope, and the status

### Requirement: The documentation states where the server stores and backs up its data

The repository documentation SHALL name the app settings file, the data file, the backup directory, and the backup command.

`README.md` SHALL state that `apps/pentix-server/settings.json` holds `dataFile` and `backupDirectory`. It SHALL state that the shipped values are `C:\db\pentix\pentix.db` and `C:\db\Backups\pentix`, and that `PENTIX_SERVER_SETTINGS_FILE`, `PENTIX_DATA_FILE`, and `PENTIX_BACKUP_DIRECTORY` override them. It SHALL state that a missing or invalid settings file fails startup. Its command list SHALL hold `npm run backup:server` with the `<yyyyMMddHHmm>-pentix.db` name and the refusal to replace an existing file.

`docs/foundation.md` SHALL state the same settings precedence in its persistence section. It SHALL state that a backup file is a full SQLite database, and that a restore copies it back as a data file.

`GLOSSARY.md` SHALL define the terms `App settings`, `Data file`, `Backup directory`, and `Storage backup`, each with its code name and its avoid list.

No document SHALL name `data/pentix.db` as the default data file after this change.

#### Scenario: A developer finds the data file from the documentation

- **GIVEN** a developer who reads `README.md` and `docs/foundation.md`
- **WHEN** they look for where the server keeps its data
- **THEN** both documents name `apps/pentix-server/settings.json` and the `dataFile` key
- **AND** both state the `C:\db\pentix\pentix.db` default
- **AND** neither names `data/pentix.db` as the default

#### Scenario: The documentation covers the backup command and its file name

- **GIVEN** a developer who reads the `README.md` command list
- **WHEN** they look for the backup command
- **THEN** the list holds `npm run backup:server`
- **AND** the entry states the `<yyyyMMddHHmm>-pentix.db` name and the backup directory
- **AND** it states that an existing file is never replaced

#### Scenario: The glossary holds the new terms

- **GIVEN** a developer who opens `GLOSSARY.md`
- **WHEN** they look for the storage terms
- **THEN** the file defines `App settings`, `Data file`, `Backup directory`, and `Storage backup`
- **AND** every entry carries a code name and an avoid list

