## Why

The attract/demo mode's destination planner (`planDemoDestination` in `packages/pentix-core/src/demo.ts`) can produce several placements with exactly equal scores and Delphi tie-breaks. When that happens the planner currently settles the tie by scan order, which can leave the placed piece floating away from the existing stack or the walls — creating avoidable gaps and making the self-play look less tidy than the classic client.

## What Changes

- Extend the demo destination planner so each candidate records a single **contacts** count: orthogonal neighbor cells (up/down/left/right) of its settled cells that touch an already-occupied mino or lie outside the board bounds (side walls, floor, ceiling).
- Add contacts to the tie-break after the depth tie-breaks, so among equal-score destinations the planner prefers the placement with the most contacts, then a placement that does not touch a side wall, then a random choice.
- Plan the destination once per spawned piece and reuse it while steering, so a random tie between equal destinations does not make the falling piece jitter; recompute only when a new piece spawns or the demo session changes.
- Preserve the existing score formula (`row + round((holesBefore − holesAfter) × 1.5) + fullLines²`); only tie resolution changes.
- Add core and web tests covering the higher-contact preference, the non-wall preference when contacts tie, and the random tie-break.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `demo-mode`: The destination-planner requirement gains a contact-based tie-break — among placements with equal score, the planner SHALL prefer the one with more orthogonal contacts with settled minos or the board walls, then a placement that does not touch a side wall, and choose randomly between the remaining ties.

## Impact

- Affected code: `packages/pentix-core/src/demo.ts` (the planner only) and `tests/pentix-core.test.mjs`. The public `planDemoDestination` signature and the `DemoDestination` type are unchanged.
- Affected systems (teams/areas): the shared engine surface (`pentix-core`) that the browser demo consumes. No `pentix-web`, `pentix-server`, storage, or `session-replay` changes; the demo remains purely local and records no replay actions.
- Dependencies: none — no new runtime packages.
- Rollback plan: remove the `contacts` score and the new tie-break from `DemoChoice`/`preferCandidate` and revert the added test cases. Since the planner's public contract is unchanged and the change only affects demo self-play behavior, it can be reverted without touching any other subsystem.