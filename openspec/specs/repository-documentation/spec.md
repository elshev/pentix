# repository-documentation Specification

## Purpose

Describe the repository documentation that explains Pentix goals, glossary terms, repository layout, and the scope of the current implementation increment.
## Requirements
### Requirement: Repository documentation describes Pentix and the capabilities that ship

The repository SHALL document Pentix for a developer who has never seen it: the glossary, the shared-code layout, the capabilities that exist today, and the work that is deliberately absent.

The documentation SHALL describe:

- the glossary terms `Mino`, `Piece`, `Board`, `BoardCell`, `GameLevel`, `Tick`, `PentixGame`, `PentixGameSession`, `User`, and `Next piece`, using the vocabulary of `shared-game-primitives`, `game-piece-set`, and `game-session-start` (a piece has a single `key` and no `name` field),
- the shared-code direction: `apps/pentix-web` (browser client), `apps/pentix-server` (`PentixServer`), and `packages/pentix-core`, which both applications consume,
- the capabilities as built: the shared primitives and `GameSessionEngine`, the REST endpoints and their persistence, the browser client with its board, statistics popup, level selector, attract demo, and demo-board rail — one board per engine registered in the demo engine registry, including the built-in `delphi5` and `random` engines — and the one-module-per-engine convention the registry loads,
- and the capabilities that are not built yet, stated as such rather than as finished work.

The documentation SHALL NOT describe shipped behaviour as future work, SHALL NOT describe contracts that were removed, and SHALL NOT present a historical increment as the current scope.

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

The repository SHALL contain `docs/demo-engine-task.md`, a self-contained authoring brief that can be handed unchanged to an AI with no access to this repository. The brief SHALL ask only for the planning function - not for an engine id, name, description, file path, imports, or registration - and SHALL state the exact `plan(board, piece, position): string` signature and result type. It SHALL define `board` (rows of `0` free and `1` occupied), `piece` (the active piece's reachable orientations, each a list of cells relative to its rotation point, whose point is `{ row: 0, column: 0 }`), and `position` (the rotation point on the board), and SHALL explain that an absolute cell is `position + cell`. The brief SHALL explain the game, the action alphabet (`L` move left, `R` move right, `C` rotate clockwise, `A` rotate anticlockwise, `H` hard drop), the rule that `T` (tick) must never appear, the Action-then-Tick driving rule, the rotation and wall-kick rules, and what the function may and may not do. The brief SHALL NOT assume a particular AI, model, editor, or chat tool, SHALL NOT require the author to modify any other file, and SHALL be the same text for every engine, with only the strategy idea supplied by the requester. `docs/foundation.md` SHALL summarize the engine module convention and point at the brief.

#### Scenario: The brief is enough without other context

- **GIVEN** an author who has never seen the repository
- **WHEN** they read only `docs/demo-engine-task.md`
- **THEN** they can state the `plan(board, piece, position)` signature, the types and meaning of `board`, `piece`, and `position`, the action alphabet, the driving rules, and the answer format, without any repository access

#### Scenario: The brief states the Action-Tick rule and forbids ticks

- **GIVEN** an author reading only `docs/demo-engine-task.md`
- **WHEN** they write the engine's plan
- **THEN** the brief has told them the demo applies Action then Tick from the piece's spawn
- **AND** that `T` must not appear in the returned log
- **AND** that ticks alone continue after the log ends

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
- **THEN** they find the one-module-per-engine convention and a reference to `docs/demo-engine-task.md`

