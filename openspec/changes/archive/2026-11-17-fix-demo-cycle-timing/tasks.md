## 1. Reducer: split the demo step into a tick and a steering step

- [x] 1.1 In `apps/pentix-web/src/engine/gameReducer.ts`, replace the `demoStep` member of `GameAction` with `{ type: 'demoTick'; boardId: string }` and `{ type: 'demoAction'; boardId: string; action: DemoAction | null; sessionId: string; pieceIndex: number }`.
- [x] 1.2 Turn `applyDemoStep` into a steering-only pass: apply exactly one action code through the shared engine and drop the trailing `gameSessionEngine.tick`.
- [x] 1.3 Rename the code-to-engine-step mapper (`demoActionToStep`) so it no longer collides with the `demoAction` action name, and rename the per-code helper so `applyDemoAction` means "apply one log code".
- [x] 1.4 Add the `demoTick` branch: resolve the main session or the addressed rail slot, ignore a missing board, a non-`demo` phase for the main board, or a session that is not `active`, and apply exactly one `gameSessionEngine.tick` through `applyAdvance` (main) or the merge-and-replace path (rail).
- [x] 1.5 Add the `demoAction` branch with the same board resolution, keep the `isCurrentDemoStep` guard for both targets, keep the `demo-over` transition when a steering step ends the main demo, and leave the other boards untouched.
- [x] 1.6 Update the comments in `apps/pentix-web/src/engine/demo.ts` so they describe one replayed code per steering step instead of an action-plus-tick pair.

## 2. Reducer: attract-cycle gate and restart

- [x] 2.1 Export `isDemoCycleOver(state: GameState): boolean` returning `phase === 'demo-over'` and every `state.demoBoards` session `game-over`.
- [x] 2.2 Delete `restartDemoSession` and make the `demoRestart` branch delegate to `startSession(state, deps, 'demo')`, guarded by `isDemoCycleOver`, so the whole board set restarts with the main engine kept and the rail reassigned in registry order.
- [x] 2.3 Confirm the `demo` branch still starts a fresh board set from `demo-over` without the gate (the manual Space restart) and still honours the game-over cooldown.
- [x] 2.4 Confirm `swapBoard` still derives `phase` from the arriving session's status, so the gate is re-evaluated after a swap.

## 3. Hooks and screen

- [x] 3.1 Rewrite `useDemoStepper` in `apps/pentix-web/src/games/pentix/useDemoController.ts` to one `window.setInterval(getTickInterval(level) / 2)` that alternates a phase ref between `demoAction` (first) and `demoTick`, keeping the `planRef`, the session/dispatch refs, the `active` guard, and the `[active, level, boardId, engine]` deps.
- [x] 3.2 Document in `useDemoStepper` that the action lands at the interval midpoint, that a locking tick is followed by the next piece's action half an interval later, and that the reducer drops stale steps.
- [x] 3.3 Keep the `useDemoController` and `useDemoBoard` signatures and refresh their comments to match the new cadence.
- [x] 3.4 Point `useDemoRestart` at the new gate (comment plus the flag it receives) and keep its `GAME_OVER_COOLDOWN_MS` timer dispatching `demoRestart`.
- [x] 3.5 In `apps/pentix-web/src/games/pentix/Game.tsx`, pass `isDemoCycleOver(state)` to `useDemoRestart` and render `Demo — press Space to play` for `demo` and `Demo over — press Space for the next demo` for `demo-over`.

## 4. Key map

- [x] 4.1 In `apps/pentix-web/src/engine/keyMap.ts`, map Space in `demo-over` to `{ type: 'demo' }`, keep Enter mapped to `start` in `demo`, `demo-over`, and `game-over`, keep Space mapped to `start` in `demo`, and rewrite the key comment.

## 5. Tests (`tests/pentix-web.test.mjs`)

- [x] 5.1 Replace the `demoStepAction`/`demoBoardStepAction` helpers with a tick helper and a steering-step helper, and update every demo test to dispatch the two in the order the hook sends them.
- [x] 5.2 Add a test that a steering step applies its action and no gravity tick, and that a tick applies gravity and no action.
- [x] 5.3 Add a test that a hard-dropping steering step leaves the piece on the floor until a later tick locks it, and that the spawned piece is unchanged until its own steering step.
- [x] 5.4 Add tests for `isDemoCycleOver`: false while any rail session is `active`, true once every board is `game-over`, false outside `demo-over`.
- [x] 5.5 Add tests for `demoRestart`: ignored while a rail board is still `active`, and, once every board is over, starting a fresh main session plus fresh rail sessions from one new game with the main engine kept and the rail in registry order.
- [x] 5.6 Add a test that the `demo` action from `demo-over` starts a fresh board set while a rail board is still playing.
- [x] 5.7 Update the tests that pin the old behaviour: `a demo step that ends the demo game keeps the final board until the delay elapses`, `the attract demo restart leaves the demo boards untouched`, `a finished demo board can be swapped in and restarts after the delay`, and `a swapped-in main demo still restarts after its game over delay`.
- [x] 5.8 Update the key-map test so Space in `demo-over` expects `{ type: 'demo' }` and Enter in `demo-over` still expects `{ type: 'start' }`.

## 6. Documentation

- [x] 6.1 Rewrite the "How the caller executes your string" section of `docs/demo-engine-task.md`: one tick every interval, the action halfway through it, the drop plus its side-step in one step, the locking tick half an interval later, plus the updated consequences list (each action still costs one interval, a blocked action is ignored, leftovers are discarded on lock).
- [x] 6.2 Update the last-tick section of the same brief so the side-step is described as happening right after the drop and half an interval before the lock, keeping the worked pocket example.
- [x] 6.3 Update the demo paragraph in `docs/foundation.md` and the demo sentences in `README.md` to the tick-then-action cadence and the whole-board-set restart.

## 7. Verification

- [x] 7.1 Run `npm run lint` and fix any new warnings.
- [x] 7.2 Run `npm test` (it builds core and server first) and confirm every web test passes.
- [x] 7.3 Run `npm run build:web` to confirm the client still type-checks and bundles.
- [x] 7.4 Run `npx openspec validate "fix-demo-cycle-timing"` and confirm the change still validates after the implementation.
- [ ] 7.5 Watch a demo cycle in the browser (`npm run dev:web`): each piece steers between ticks, a dropped piece rests a full tick (its side-step lands half a tick after the drop) before the next piece appears, and a new cycle starts when the last rail board ends or on Space.

## 8. Follow-up: a drop restarts the demo's rhythm

- [x] 8.1 Apply one log code per steering step: drop `lastTickAction` from `GameAction`, from `applyDemoActionStep`, and from both step helpers in the web tests.
- [x] 8.2 Add `nextDemoSlot(action)` to `apps/pentix-web/src/engine/demo.ts` and use it in `useDemoStepper`, so a hard drop schedules the next slot as an action again.
- [x] 8.3 Replace `nextDemoStep`/`DemoStepPlan` with `nextDemoAction` + `advanceDemoPlan` in the hook, and pin `nextDemoSlot` with a test.
- [x] 8.4 Rework the reducer tests: the side-step is its own step, the dropped piece stays unlocked until the tick, and a settling drop leaves the side-step to the next piece only.
- [x] 8.5 Update `docs/demo-engine-task.md`, `docs/foundation.md`, `README.md`, and the change's proposal, specs, and design to the drop-restarts-the-rhythm rule.

