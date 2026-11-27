## ADDED Requirements

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
