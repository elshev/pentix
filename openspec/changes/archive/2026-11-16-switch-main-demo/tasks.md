## 1. Reducer state: engine ids and rail slots

- [x] 1.1 In `apps/pentix-web/src/engine/gameReducer.ts`, export `MAIN_DEMO_ENGINE_ID: DemoEngineId = 'random'` and `PLAYER_NAME = 'Player01'`, each with a doc comment stating that `random` drives the main board's attract demo and that `Player01` is the temporary placeholder for a real user name.
- [x] 1.2 Add `readonly mainEngineId: DemoEngineId` to `GameState` and set it to `MAIN_DEMO_ENGINE_ID` in `createInitialState` and in `createBoardSet`'s returned board set.
- [x] 1.3 Change `demoBoardId` to derive the rail slot (`demo-slot-1`, `demo-slot-2`) instead of the engine id, update `DEMO_BOARD_ENGINES`' doc comment to describe it as the initial per-slot engine assignment, and keep `engineId` a per-board field.
- [x] 1.4 Make `startSession` re-apply `MAIN_DEMO_ENGINE_ID` on every fresh board set and `restartDemoSession` keep the current `mainEngineId`, so the swap survives the automatic demo restart but a new game resets it.
- [x] 1.5 Add `{ type: 'swapBoard'; boardId: string }` to `GameAction` and implement its reducer case: return the state unchanged unless `phase` is `demo` or `demo-over` and the board exists, exchange `session`/`mainEngineId` with that board's `session`/`engineId`, set the phase from the arriving session's status (`active` → `demo`, `game-over` → `demo-over`), and leave `game`, `settings`, `gravityEpoch`, board order, and the other demo board untouched.
- [x] 1.6 Add and export `mainBoardName(state: GameState): string`, returning `getDemoEngine(state.mainEngineId).name` for the `demo` and `demo-over` phases and `PLAYER_NAME` otherwise.

## 2. Demo engine wiring

- [x] 2.1 In `apps/pentix-web/src/engine/demo.ts`, delete `DEMO_ENGINE_OVERRIDE`, `ACTIVE_DEMO_ENGINE_ID`, and `activeDemoEngine`; make `resolveDemoPlan`'s `engine` argument required and `nextDemoAction`'s `destination` argument required, so no default engine remains in the module.
- [x] 2.2 In `apps/pentix-web/src/games/pentix/useDemoController.ts`, replace the `activeDemoEngine` import with `getDemoEngine`, change `useDemoController` to accept the main board's `engineId: DemoEngineId` and pass the resolved engine to `useDemoStepper`, keeping the existing interval deps so an engine change rebuilds the timer.
- [x] 2.3 In `apps/pentix-web/src/games/pentix/Game.tsx`, read `mainEngineId` from the reducer state, call `useDemoController(phase === 'demo' && !statsOpen, level, session, mainEngineId, dispatch)`, compute `mainBoardName(state)`, pass `canSwap={phase === 'demo' || phase === 'demo-over'}` to each `DemoBoard`, and pass the name to `Hud`.

## 3. Main-board name and the double-click affordance

- [x] 3.1 In `apps/pentix-web/src/games/pentix/Hud.tsx`, add a required `name: string` prop and render one `hud__player` line above `.hud__stats` showing it, leaving the statistics row, the next-piece preview position, and the pieces toggle unchanged.
- [x] 3.2 In `apps/pentix-web/src/games/pentix/DemoBoard.tsx`, add a required `canSwap: boolean` prop, dispatch `{ type: 'swapBoard', boardId: board.id }` from `onDoubleClick`, and when `canSwap` is true render the `demo-board--swap` modifier class plus the `title` hint `Double-click to move to the main board`.
- [x] 3.3 In `apps/pentix-web/src/App.css`, add the `.hud__player` rule above the statistics styling and a `.demo-board--swap` rule (pointer cursor plus a subtle hover border) next to `.demo-board`, keeping the compact card layout and the rail slot width unchanged.

## 4. Tests in `tests/pentix-web.test.mjs`

- [x] 4.1 Update the existing demo-board assertions to the slot ids (`demo-slot-1`, `demo-slot-2`), the initial per-slot engines, and `mainEngineId === 'random'` in a fresh state.
- [x] 4.2 Add a test that `swapBoard` in the `demo` phase exchanges sessions and engines both ways, keeps the main session id equal to the clicked board's previous id, and leaves the other demo board's session and engine identical by reference.
- [x] 4.3 Add a test that `swapBoard` is a no-op in `playing`, `paused`, and `game-over`, and for an unknown board id.
- [x] 4.4 Add a test that swapping in a `game-over` demo board enters `demo-over` with that final board, that `demoRestart` then starts a fresh main session planned by the swapped-in engine, and that the active main session now playing in the rail slot keeps its id and piece index.
- [x] 4.5 Add a test that `start` and `restart` restore `mainEngineId` to `random` and the initial per-slot engines after a swap, while `demoRestart` keeps the swapped engine.
- [x] 4.6 Add a test that a `demoStep`/`demoBoardStep` planned before a swap is ignored for both boards after the swap, and that a step planned for the swapped-in session advances only the addressed board.
- [x] 4.7 Add a test that a level change during the attract demo after a swap retunes the main session and both demo boards and keeps each slot's engine.
- [x] 4.8 Add a test that a main demo game over still enters `demo-over` and that the delay's `demoRestart` produces a fresh `active` session — the existing demo restart behaviour — now with the swapped engine.
- [x] 4.9 Add a test for `mainBoardName`: `Player01` in `playing`/`paused`/`game-over`, `Random` in `demo`/`demo-over`, and `Delphi 5` after swapping the `delphi5` slot onto the main board.

## 5. Documentation

- [x] 5.1 Update `README.md`'s browser-client description so the current scope names the `random` engine on the main board's attract demo, the main-board name line (`Player01` for a player game, the demo engine's name during the demo), the two rail slots `demo-slot-1`/`demo-slot-2` with their initial `delphi5`/`random` engines, and the double-click swap between the main board and a slot (`repository-documentation`).

## 6. Verification

- [x] 6.1 Run `npm run lint` and fix any findings.
- [x] 6.2 Run `npm run test:web` and confirm the new reducer tests pass alongside the existing suite.
- [x] 6.3 Run `npm run build:web` to confirm the reducer, hook, and JSX changes compile under the strict TypeScript config.
- [x] 6.4 Spot-check `npm run dev:web`: the name line reads `Random` on load and `Player01` after starting a game, a double-click swaps both boards and both keep playing, a swapped demo restarts after the `700` ms delay, and no swap happens during a player game. (Automated here: `npm run dev:web` served `/` and the transformed `Game.tsx`, `Hud.tsx`, `DemoBoard.tsx`, and `gameReducer.ts` with HTTP 200 and the expected `mainBoardName`/`canSwap`/`hud__player`/`swapBoard`/`demo-slot-` content; the visual double-click pass is left for a manual check.)

## 7. Follow-up fixes from manual testing

- [x] 7.1 Fix the attract-demo deadlock in `apps/pentix-web/src/engine/gameReducer.ts`: extract `applyDemoAction`, and when a resting piece's steering step leaves the session unchanged, lock the piece through `gameSessionEngine.tick` so the demo keeps advancing instead of waiting on an unreachable placement.
- [x] 7.2 Add the regression test in `tests/pentix-web.test.mjs`: a resting piece whose planned last-tick move is blocked locks and spawns the next piece.
- [x] 7.3 Align the gameplay area with the PENTIX header in `apps/pentix-web/src/App.css`: `.game__layout` spans `calc(100% + 8px)` with `margin-inline: -4px`, `.game` stops centering, and `.shell` clips the overhang (`overflow-x: clip`) so narrow viewports never scroll sideways.
- [x] 7.4 Verify in headless Edge via CDP: `demo → demo-over (~720 ms) → demo` cycles with a fresh session after every game over, and the measured layout deltas are `-4px` left and `+4px` right at 1280/1000/800 px with `scrollWidth === clientWidth`.
## 8. Demo-wall sizing from the four-per-row constraint

- [x] 8.1 Compute the largest demo mino that keeps four boards per row inside the rail (a slot is `12 * cell + 31` px of chrome, plus three `0.6rem + 0.25rem` gaps, inside the measured `735.31` px rail): `11` px at the `1100` px shell.
- [x] 8.2 In `apps/pentix-web/src/App.css`, set `--demo-cell-size: 11px` and add the exact falloff breakpoints (`1089`/`1041`/`993`/`945`/`800` px to `10`/`9`/`8`/`7`/`6` px), replacing the old `1000` px and `900` px demo-size rules.
- [x] 8.3 Increase the rail gap horizontally by `0.25rem` (`--demo-rail-gap: calc(0.6rem + 0.25rem)`, i.e. `4` px at the default root, applied as `column-gap`) while the `0.6rem` row gap and the slot-width formula stay unchanged.
- [x] 8.4 Measure in headless Edge at 16 widths from `1440` to `360` px: four slots plus three gaps fit the rail at every four-column width (two slots below `480` px), with no horizontal page scroll.