# repository-documentation Specification

## Purpose

Describe the repository documentation that explains Pentix goals, glossary terms, repository layout, and the scope of the current implementation increment.
## Requirements
### Requirement: Repository documentation describes Pentix and the capabilities that ship

The repository SHALL document Pentix for a developer who has never seen it: the glossary, the shared-code layout, the capabilities that exist today, and the work that is deliberately absent.

The documentation SHALL describe:

- the glossary terms `Mino`, `Piece`, `Board`, `BoardCell`, `GameLevel`, `Tick`, `PentixGame`, `PentixGameSession`, `User`, and `Next piece`, using the vocabulary of `shared-game-primitives`, `game-piece-set`, and `game-session-start` (a piece has a single `key` and no `name` field),
- the shared-code direction: `apps/pentix-web` (browser client), `apps/pentix-server` (`PentixServer`), and `packages/pentix-core`, which both applications consume,
- the capabilities as built: the shared primitives and `GameSessionEngine`, the REST endpoints and their persistence, the browser client with its board, statistics popup, level selector, and attract demo,
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
- **THEN** the board, the statistics popup, the level selector, and the attract demo are described as present
- **AND** no shipped feature is listed as not implemented

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

