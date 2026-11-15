## Why

The attract demo plans a destination when a piece spawns and then steers that piece to it, but the moment the piece can no longer fall it is locked exactly where it came to rest. The last gravity tick before a lock is therefore wasted: a single rotation or one-column slide at that moment often lets the piece fall further into a deeper, cheaper placement (typically right after the hard drop, when the piece is already parked on top of the stack). The current demo also loses that opportunity entirely whenever the shared gravity loop settles the piece before the steering interval fires, because two independent timers (gravity loop + demo controller) race for the same piece.

## What Changes

- Extend the shared **destination planner** in `pentix-core` so every candidate settled placement is compared with the placements one column to its left and right: a side-step is a legal continuation of the plan because the demo can make it on its last tick. A side-step whose result can still move down is scored at its further landing, so a side-step that keeps the piece falling is prioritized over one that merely parks it. The returned destination stays the column the piece must be *dropped* in, i.e. the column the winning placement is reached from.
- Teach the demo to take that side-step ("last tick move") instead of locking: when the active piece can no longer move down, compare its resting placement with the placements one column left/right and move when the neighbour is better, even when the piece cannot fall any further (for example parking a mino under an overhang). The check runs again on every later last tick, and it never takes a step that is not a strict improvement, so the piece cannot shuffle back and forth.
- Make the demo advance as a **single tick per gravity interval** (gravity step plus one steering step, mirroring Delphi's `TimerExpired`), so a last-tick side-step can never be pre-empted by a concurrent gravity lock. The demo's gravity no longer comes from the player's animation-frame loop.
- Keep the score formula (`row + (holesBefore − holesAfter) × 1.5 + fullLines²`) and the tie-break precedence unchanged; the side-step positions are compared with exactly the same scoring and tie-breaks.
- Guard the new demo step against stale snapshots with the same session/piece identity check that the existing demo action uses, extended with the placement the step was planned for.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `demo-mode`: The destination planner now evaluates each candidate placement together with its one-column side-steps, and the demo no longer locks a resting piece without comparing it with its side-steps — two new requirements cover the side-step-aware planning and the last-tick side-step. The "imitates player actions within the shared engine" requirement is updated so the destination is re-targeted by those side-steps (not only re-planned on spawn/session change), and a new requirement fixes the demo cadence to one combined gravity-plus-steering step per interval.

## Impact

- Affected code:
  - `packages/pentix-core/src/demo.ts` — factor the candidate scoring and the tie-break chain into shared helpers, score each candidate together with its side-steps, and add `canDemoPieceMoveDown(session)` plus `planDemoLastTickMove(session): DemoDestination | null`.
  - `packages/pentix-core/src/index.ts` — export the two new functions (`planDemoDestination` and `DemoDestination` keep their signatures).
  - `apps/pentix-web/src/engine/demo.ts` — make `resolveDemoPlan` re-target the cached destination when the piece takes a last-tick side-step.
  - `apps/pentix-web/src/engine/gameReducer.ts` — replace the `demoAction` action with a `demoStep` action that applies the gravity step and the steering step together, with a placement-aware stale guard.
  - `apps/pentix-web/src/games/pentix/useDemoController.ts` — dispatch `demoStep` on the level cadence.
  - `apps/pentix-web/src/games/pentix/Game.tsx` — run `useGameLoop` only while playing; the demo's cadence comes from the demo step.
  - `tests/pentix-core.test.mjs`, `tests/pentix-web.test.mjs` — new planner and reducer coverage.
- Affected teams/areas: the browser gameplay client (`apps/pentix-web`) and the shared demo planner (`pentix-core` demo surface). `pentix-server`, storage, `session-replay`, and the shared `GameSessionEngine` operations are untouched; the demo remains local and non-persisted.
- Dependencies: none — no new runtime packages, no API/HTTP changes.
- Rollback plan: delete `planDemoLastTickMove`/`canDemoPieceMoveDown` and their exports, drop the side-step comparison from `planDemoDestination`, restore the single-purpose `demoAction` case in `gameReducer.ts` (steering only, no gravity step), restore `useGameLoop(loopActive, ...)` in `Game.tsx`, revert `resolveDemoPlan` to the spawn-only cache and drop the new tests. Because the demo is local and its public planner contract is unchanged, the revert touches no other subsystem.
