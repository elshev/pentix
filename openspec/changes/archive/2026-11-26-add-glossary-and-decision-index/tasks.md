## 1. Glossary

- [x] 1.1 Create `GLOSSARY.md` at the repository root with the usage rules and the grouped sections. Add one entry per term, with the code name and the `Avoid:` list.
- [x] 1.2 Replace the `## Glossary` list in `README.md` with one sentence and a link to `GLOSSARY.md`, and add `GLOSSARY.md` and `openspec/` to the repository layout block.
- [x] 1.3 Point `docs/foundation.md` at `GLOSSARY.md` for the vocabulary that the note uses.

## 2. Decision Index

- [x] 2.1 Read the `## Decisions` section of every archived `design.md` and list each record with its date, its scope, and its status.
- [x] 2.2 Create `docs/decisions/README.md` with the status vocabulary and the table of the 29 archived records. Add the standing decisions from `docs/foundation.md` and the rule for what counts as evidence for a status.
- [x] 2.3 Add the index row rule to `.clinerules/rules.md`, so an archived change cannot miss the index. The generated archive skill files are left alone, because regeneration would drop the edit.

## 3. Spec

- [x] 3.1 Name `GLOSSARY.md` as the glossary location in the `repository-documentation` capability.
- [x] 3.2 Name `docs/decisions/README.md` as the decision index in the same capability, with the status values and the link rule.

## 4. Verification

- [x] 4.1 Run `python .cline/skills/asd-ste100/scripts/ste-lint.py GLOSSARY.md docs/decisions/README.md` and confirm no hard violation.
- [x] 4.2 Run `openspec validate --change add-glossary-and-decision-index --strict` and confirm the change passes.
- [x] 4.3 Confirm every link in the two new files resolves, and confirm `npm run lint` still passes.
