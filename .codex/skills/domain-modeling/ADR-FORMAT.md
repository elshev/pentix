# Decision record format

A decision record in this repository is the `design.md` of an openspec change. There is no `docs/adr/` directory and no numbered record files.

## Where a record lives

| State of the change | Path of the record |
| --- | --- |
| In flight | `openspec/changes/<change>/design.md` |
| Shipped | `openspec/changes/archive/<yyyy-mm-dd>-<change>/design.md` |
| Standing, outlives its change | A section of `docs/foundation.md` |

`docs/decisions/README.md` indexes every record with its date, its scope, and its status.

## Sections a record carries

A record follows the sections that `openspec instructions design` returns:

- `## Context` — the problem, the constraints, and what the code does today.
- `## Goals / Non-Goals` — what the change will and will not do.
- `## Decisions` — one `### D<n> — <title>` per decision, each with the alternative it beat and the reason.
- `## Risks / Trade-offs` — what the decision costs.
- `## Migration Plan` — the order of work, when the change needs one.

## Adding the index row

Add the row in the same session as the archive step:

```md
| 2026-11-26 | [<change>](../../openspec/changes/archive/2026-11-26-<change>/design.md) | <scope in one line> | Accepted |
```

The status is `Accepted`, `Partly superseded by <record>`, or `Superseded by <record>`. A status needs evidence in a later record. A guess is not a status.

## When to offer a record

All three conditions must hold:

1. **Hard to reverse.** The cost of changing the mind later is real.
2. **Surprising without context.** A future reader looks at the code and asks why.
3. **A real trade-off.** There were genuine alternatives, and one won for a stated reason.

If a condition is missing, skip the record. The change proposal and the spec delta still describe the work.
