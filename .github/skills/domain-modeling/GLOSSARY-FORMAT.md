# GLOSSARY.md format

## Location

One file at the repository root: `GLOSSARY.md`. This repository has a single context, so no `GLOSSARY-MAP.md` exists. `README.md` links to `GLOSSARY.md` and does not repeat an entry.

Two files state that rule. `.clinerules/rules.md` states it, and `openspec/specs/repository-documentation/spec.md` requires it.

## Entry format

```md
**Term** (`CodeName`) — One or two sentences that define what the term is. A second sentence may name the rule that a reader gets wrong.
Avoid: synonym, near-miss term, retired name.
```

A term with no code counterpart drops the parentheses:

```md
**Mino** — One square of a piece.
Avoid: block, cell, box, square.
```

## Rules

- **Name the code.** The code name goes in parentheses and in backticks. It is the name a reader types, for example `GameSessionEngine`.
- **Define what the term is.** Do not describe what it does. Two sentences is the cap.
- **State the words to avoid.** One `Avoid:` line follows each entry. This is where a retired name and a synonym die.
- **Use one term for one thing.** Bold another glossary term when a definition needs it, and let the sentence state the relation.
- **Group the terms.** Use one `##` heading per area. The current areas are Game objects, Board and pieces, Play loop, Session and replay, Demo mode, Server and storage, and Process artifacts.
- **Keep behavior out.** A spec states behavior. The glossary states the name of a thing. When the two disagree, the spec wins and the glossary entry changes.
- **Keep implementation detail out.** A private function name and a CSS class are not domain terms.
- **Keep counts named with `Count`.** Write `gameCount`, not `games`. `.clinerules/rules.md` holds the full rule.

## Checks

Run the linter after an edit:

```bash
python .cline/skills/asd-ste100/scripts/ste-lint.py GLOSSARY.md
```

A hard violation fails the check. A soft passive-voice finding is a signal, not a failure.
