## Purpose

Describe the repository documentation that explains Pentix goals, glossary terms, repository layout, and the scope of the current implementation increment.

## Requirements

### Requirement: Repository documentation reflects Pentix goals and the first bootstrap scope
The repository SHALL replace the default starter documentation with Pentix-specific documentation that explains the project glossary, the long-term goals for `PentixServer` and the browser application, and the limited scope of the first implementation increment.

The documentation SHALL describe:

- the glossary terms `Mino`, `Piece`, `Board`, `BoardCell`, `GameLevel`, `Tick`, `PentixGame`, and `PentixGameSession`,
- the fact that Pentix and PentixServer share common code,
- the intended repository structure for the browser app, server app, and shared package,
- and the fact that the first implementation increment is limited to repository bootstrap, the empty server application, and shared piece/board primitives.

#### Scenario: Starter documentation is replaced with project documentation
- **GIVEN** the repository previously contained the default React + Vite starter README
- **WHEN** the first foundation change is implemented
- **THEN** the root documentation describes Pentix instead of the starter template
- **AND** the documentation includes the project glossary and high-level goals
- **AND** the documentation identifies the first increment as a foundation step rather than a full game implementation

#### Scenario: Documentation explains the shared-code direction
- **GIVEN** a developer is new to the repository
- **WHEN** they read the initial documentation
- **THEN** they can identify where shared game-domain code belongs
- **AND** they can distinguish the future browser application from the PentixServer application
