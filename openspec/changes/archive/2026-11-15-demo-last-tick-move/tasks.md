## 1. Core planner (`packages/pentix-core/src/demo.ts`)

- [x] 1.1 Factor the per-candidate scoring in `planDemoDestination` (holes after, full lines, `priority`, `bottom`, `top`, `touchesWall`, `contacts`) into one internal helper so both planners score placements identically.
- [x] 1.2 Add an internal `descend(board, piece, origin)` helper that walks a piece down from a given origin to its landing row, and reuse it for the existing top-reachability scan in `planDemoDestination`.
- [x] 1.3 Add `canDemoPieceMoveDown(session): boolean` — true while the active piece can be placed one row lower.
- [x] 1.4 Compare every candidate placement in `planDemoDestination` with the placements one column left and right at the candidate's resting row: score each of them after letting the piece fall as far as it can, use the best of the three as that candidate's value, and return the column the piece must be dropped in (the pre-side-step column) for the overall winner. Prefer the placement that needs no side-step when everything else ties.
- [x] 1.5 Add `planDemoLastTickMove(session): DemoDestination | null`: return `null` while the piece can move down; otherwise compare the resting placement with the placements one column left/right (each scored after falling as far as it can) and return the side-step column only when the neighbour is strictly better on score plus the deterministic tie-break chain — a side-step that cannot fall any further is allowed, an indistinguishable one is not taken.
- [x] 1.6 Export `planDemoLastTickMove` and `canDemoPieceMoveDown` from `packages/pentix-core/src/index.ts` (keep `planDemoDestination`/`DemoDestination` unchanged) and rebuild with `npm run build:core`.

## 2. Core tests (`tests/pentix-core.test.mjs`)

- [x] 2.1 Cover `canDemoPieceMoveDown`: true for a piece with free space below, false for a piece resting on the stack or the floor.
- [x] 2.2 Cover `planDemoLastTickMove` returning `null` while the piece can still move down.
- [x] 2.3 Cover the side-step that keeps the piece falling: a resting piece beside a step-down ledge moves into the deeper column.
- [x] 2.4 Cover the side-step that parks the piece: a mino resting on the floor beside a settled mino one row above the side wall steps toward the wall even though it cannot fall further.
- [x] 2.5 Cover the rejecting cases: a side-step that scores worse, an indistinguishable side-step, and a resting piece with no legal side-step all leave the piece where it is.
- [x] 2.6 Cover the destination planner: on the "single mino above the right wall" board the destination is the neighbouring column the side-step starts from (not the far corner), and a placement that needs no side-step wins an exact tie.
- [x] 2.7 Cover repetition: taking the side-step leaves the piece in the better placement, where the next last-tick check finds nothing better, so the loop ends.

## 3. Plan re-targeting (`apps/pentix-web/src/engine/demo.ts`)

- [x] 3.1 Make `resolveDemoPlan` re-target the cached destination when the cached plan still belongs to the current session and piece, the piece is resting, and `planDemoLastTickMove` returns a destination; keep the spawn-time cache otherwise.
- [x] 3.2 Add web tests in `tests/pentix-web.test.mjs` for the re-target and for the cache staying stable once the piece can fall again.

## 4. Demo step driver

- [x] 4.1 In `apps/pentix-web/src/engine/gameReducer.ts`, replace the `demoAction` action with `demoStep` carrying `{ action, sessionId, pieceIndex, angle, column }`.
- [x] 4.2 In the `demoStep` case, ignore the step unless the phase is `demo` and the session id, piece index, angle, and column all match; otherwise apply the gravity step (`canDemoPieceMoveDown` → `gameSessionEngine.tick` through `applyAdvance`) and then the steering action through the existing reducer cases.
- [x] 4.3 In `apps/pentix-web/src/games/pentix/useDemoController.ts`, keep the per-interval plan resolution but dispatch `demoStep` with the computed action plus the active piece's current `angle` and `column`.
- [x] 4.4 In `apps/pentix-web/src/games/pentix/Game.tsx`, pass `phase === 'playing'` to `useGameLoop` so demo gravity comes only from the demo step.

## 5. Web tests (`tests/pentix-web.test.mjs`)

- [x] 5.1 Cover a demo step on a falling piece: it descends one row and applies the steering action.
- [x] 5.2 Cover a demo step on a resting piece with a better side-step: the piece moves one column instead of locking, and the destination is re-targeted.
- [x] 5.3 Cover the parking side-step in the reducer: stepping toward the wall under a settled mino does not lock the piece.
- [x] 5.4 Cover a demo step on a resting piece with no better side-step: the piece settles (and a demo game over still starts a fresh demo).
- [x] 5.5 Cover a stale `demoStep` (session, piece index, or placement mismatch) leaving the state unchanged.
- [x] 5.6 Update the existing demo tests that referenced `demoAction` so they target `demoStep`.

## 6. Verification

- [x] 6.1 Run `npm run lint` and fix any findings.
- [x] 6.2 Run `npm test` (core server + web suites) and fix any failures.
- [x] 6.3 Run `npm run build:web` to confirm the web client type-checks with the new action shape.
- [x] 6.4 Spot-check the demo: the reported board (one mino above the right wall) now steers the piece to the neighbouring column, drops it, side-steps under the mino on the last tick, and locks there — verified by replaying the real planner + reducer step loop headlessly, plus a 5,000-step demo run with no stalls, no dropped steps, and a bounded number of side-steps per piece.
- [x] 6.5 Confirm `pentix-server`, storage, and `session-replay` are untouched (no changed imports or recorded demo actions).
