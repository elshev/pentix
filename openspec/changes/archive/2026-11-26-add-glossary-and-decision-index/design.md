## Context

The repository has three documentation layers. `openspec/specs/<capability>/spec.md` states what must stay true. `openspec/changes/<name>/design.md` states why one option won for one change. `docs/foundation.md` states the standing architecture and the decisions that outlive their change.

Two files were added outside that structure. `GLOSSARY.md` holds the vocabulary, and `docs/decisions/README.md` holds an index of the archived design records. No spec names either file. The root documentation also carried a second copy of the glossary terms, so the repository had two places to edit for one term.

## Goals / Non-Goals

**Goals:**

- Give the glossary one home and name that home in the spec.
- Give a developer one page that lists every decision record with its date, scope, and status.
- Keep the index short. A reader opens the design record for the reason.
- Record a status only when the evidence is in the records.

**Non-Goals:**

- No new ADR file per decision. The archived `design.md` stays the record.
- No rewrite of the 29 archived design records.
- No change to the spec/change workflow beyond one archive step.
- No code change.

## Decisions

### D1 — The glossary is `GLOSSARY.md` at the repository root

The glossary moves out of `README.md` into `GLOSSARY.md`. Each entry gives the term, the code name in parentheses, the definition, and an `Avoid:` list. `README.md` keeps a `## Glossary` section with one sentence and a link.

A root file wins over a README section because an agent or a reviewer can load one file for vocabulary. A README section cannot grow past about 60 terms without burying the product description.

### D2 — The decision index is a table over the archive, not a new store

`docs/decisions/README.md` holds one row per archived change with the date, the record link, the scope, and the status. It does not copy the decision text, and it does not create a second record file.

The archived `design.md` files already carry `## Context`, `## Decisions`, and `## Risks / Trade-offs`. A second store would need a sync rule, and the two copies would drift. A table cannot drift from a file it links.

### D3 — Three status values

A status is `Accepted`, `Partly superseded by <record>`, or `Superseded by <record>`. There is no `Proposed` value because the archive holds only shipped changes.

`Partly superseded` exists because many changes replace one decision and leave the rest. A single `Superseded` value would hide the decisions that still stand.

### D4 — A status needs evidence in the records

A status comes from the later record itself, for example the sentence "the main board's attract demo now starts on `delphi5` instead of `random`". A guess is not a status. When no record names the older decision, the status stays `Accepted`.

### D5 — The project rules carry the archive step

`.clinerules/rules.md` states that an archived change adds its index row. The rule lives in project rules, not in the generated `opsx-archive` skill files, because `openspec` regenerates those files and an edit would disappear.

## Risks / Trade-offs

- The index drifts when a change is archived without the step. The mitigation is D5 and the row check in the archive workflow.
- A link breaks when a change folder is renamed. The archive folder names carry a date prefix and the archive step does not rename them, so the risk is low.
- The glossary repeats spec vocabulary. The glossary defines a term once, and the spec cites the term. When the two disagree, the spec wins and the glossary entry changes.

## Migration Plan

1. Move the README glossary into `GLOSSARY.md`, and leave a link in `README.md`.
2. Add `docs/decisions/README.md` with one row per archived change.
3. Add the index step to the archive workflow.
4. Point `docs/foundation.md` at both files.

## Open Questions

None.
