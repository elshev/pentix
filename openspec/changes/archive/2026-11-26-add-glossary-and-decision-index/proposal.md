## Why

The repository now has two document families that the specs do not name. `GLOSSARY.md` holds the only glossary, and the archived `design.md` files hold the decision records. A reader cannot tell from the specs which file is authoritative for vocabulary. A reader also cannot find a decision without scanning all 29 archive folders.

## What Changes

- State in the repository documentation requirement that `GLOSSARY.md` is the glossary location. State that each entry carries the code name and the words to avoid.
- State in the same requirement that `docs/decisions/README.md` is the decision index, and that it lists every archived design record with its date, scope, and status.
- Point the root documentation at both files from the repository layout block.
- Name `GLOSSARY.md` and `docs/decisions/README.md` in `docs/foundation.md` where a reader looks first.
- No code change. No API change. No gameplay change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `repository-documentation`: the requirement names `GLOSSARY.md` as the glossary location, and adds `docs/decisions/README.md` as the decision index.

## Impact

- `openspec/specs/repository-documentation/spec.md` gains one requirement and two scenarios.
- `README.md` and `docs/foundation.md` change only in their links and their layout block.
- `GLOSSARY.md` and `docs/decisions/README.md` are documentation files. No package, endpoint, or test changes.
- Rollback plan: revert the documentation commit. The spec delta is additive, so a revert removes one requirement and restores the earlier text. No stored data and no runtime state are involved.
- Affected teams: the repository maintainer only.

## Open Questions

None.
