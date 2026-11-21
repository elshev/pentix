## MODIFIED Requirements

### Requirement: Repository documentation describes Pentix and the capabilities that ship

The repository SHALL document Pentix for a developer who has never seen it: the glossary, the shared-code layout, the capabilities that exist today, and the work that is deliberately absent.

The documentation SHALL describe:

- the glossary terms `Mino`, `Piece`, `Board`, `BoardCell`, `GameLevel`, `Tick`, `PentixGame`, `PentixGameSession`, `User`, and `Next piece`, using the vocabulary of `shared-game-primitives`, `game-piece-set`, and `game-session-start` (a piece has a single `key` and no `name` field),
- the shared-code direction: `apps/pentix-web` (browser client), `apps/pentix-server` (`PentixServer`), and `packages/pentix-core`, which both applications consume,
- the capabilities as built: the shared primitives and `GameSessionEngine`, the REST endpoints and their persistence, the browser client with its board, statistics popup, level selector, attract demo, and demo-board rail — one board per engine registered in the demo engine registry, nine built-in engines in all: the classic `delphi5` and `random` engines followed by the seven AI-authored engines `claude-opus-5-5-extra`, `claude-sonnet-5-5-extra`, `deepseek-v4-flash-1107-max`, `deepseek-v4-pro-max`, `glm-5-3-flash-extra`, `minimax-m3-1-flash-extra`, and `qwen-4-max` — the one-module-per-engine convention the registry loads, and the file-naming grammar `<vendor>-<version>[-<variant>]-<mode>-demo-engine.ts` that an AI-authored engine follows so its vendor, version, variant, and mode are readable from the file name,
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

## ADDED Requirements

### Requirement: The authoring brief demands a self-contained answer with an algorithm note

`docs/demo-engine-task.md` SHALL require the author to answer from that document alone: the reply SHALL be produced fresh for the request, SHALL NOT reuse or quote code, notes, or context from another chat, SHALL NOT import a helper from another answer, and SHALL contain only the complete TypeScript `function plan(...)` the request asks for. The brief SHALL also require a short comment block above the function that describes the algorithm in a few lines — what the plan enumerates, how it scores a placement, and why it ends where it does — and it SHALL make clear that this leading comment is required while prose after the function is not. The brief SHALL state that the log ends at `H` whenever the chosen placement is reachable by a straight drop, and that the single post-drop side-step is a last resort for a pocket under an overhang; its last-tick section, worked pocket example, and self-check list SHALL all express that rule.

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
