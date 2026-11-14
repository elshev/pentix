## 1. Shared core: demo destination planner

- [ ] 1.1 Extract the placement/collision helpers (`checkPlacement`, `canPlace`, `getOccupiedCells`, `getActivePiece`) from `session-engine.ts` into an internal `placement.ts`, preserving signatures; run the existing core tests to confirm no behavior change.
- [ ] 1.2 Add `packages/pentix-core/src/demo.ts` with `planDemoDestination(session)` porting the Delphi `CalcDemoDest` heuristic (iterate rows bottom-up × columns × valid angles; find the lowest reachable row; score `row + (holesBefore − holesAfter) × 1.5 + fullLines²` with the Delphi tie-breaks; return `{ angle, column }` or `null`).
- [ ] 1.3 Export `planDemoDestination` and its result type from `packages/pentix-core/src/index.ts`.
- [ ] 1.4 Add core tests in `tests/pentix-core.test.mjs`: the planner returns a valid, reachable destination and prefers hole-filling plus line-clearing placements.

## 2. Web game state: demo phase and actions

- [ ] 2.1 Change `GamePhase` to `demo | playing | paused | game-over`, add a `demo` action and a `startDemo` reducer helper (fresh session, `phase: 'demo'`), and default `createInitialState` to `'demo'`.
- [ ] 2.2 Update `keyMap.ts`: Space in `game-over` → `demo`; Enter/Space in `demo` → `start` (fresh player game); keep Enter/R and the "Play again" button for a fresh player game.
- [ ] 2.3 Auto-restart the demo in the reducer: when `phase === 'demo'` and a `tick`/`drop` result has `status: 'game-over'`, return a fresh demo session instead of the `game-over` phase.
- [ ] 2.4 Update `tests/pentix-web.test.mjs`: initial phase is `'demo'`; the `demo` action creates a fresh session; Space in `game-over` starts the demo; starting from `demo` enters `playing`; a demo game-over auto-restarts.

## 3. Web demo steering and loop

- [ ] 3.1 Add `apps/pentix-web/src/engine/demo.ts` with `nextDemoAction(session)` (a port of the Delphi `TimerExpired` demo branch) returning `rotate` / `move` / `drop` toward `planDemoDestination`.
- [ ] 3.2 Add a `useDemoController` hook that applies one steering action per gravity interval while `phase === 'demo'`.
- [ ] 3.3 Run the gravity loop for `phase === 'playing' || phase === 'demo'` (adjust `useGameLoop` usage in `Game.tsx`).
- [ ] 3.4 Add tests for `nextDemoAction` in `tests/pentix-web.test.mjs`: rotates when the angle differs, moves when the column differs, drops when aligned, and returns `undefined` when no destination exists.

## 4. Game-over board presentation

- [ ] 4.1 Stop overlaying the active piece in `buildRenderGrid`/`BoardView` when `session.status === 'game-over'` (do not draw the failed spawn piece).
- [ ] 4.2 Replace the blocking game-over overlay with a compact/translucent indicator that keeps the final board visible and shows "Space — demo" / "Enter — play again"; add a subtle indicator while `phase === 'demo'` ("Demo — press Space to play").
- [ ] 4.3 Update the in-app hint copy (`Settings.tsx`) and the `App.tsx` lede to mention demo mode.

## 5. Verification

- [ ] 5.1 Run `npm run lint` and `npm test`; fix regressions (notably the changed default-phase assertion).
- [ ] 5.2 Manually verify via `npm run dev:web` that load auto-plays, starting exits the demo, game-over preserves the board, Space re-enters the demo, and the demo loops continuously.