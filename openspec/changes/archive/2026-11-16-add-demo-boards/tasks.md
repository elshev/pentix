## 1. Reducer board set

- [x] 1.1 In `apps/pentix-web/src/engine/gameReducer.ts`, add `DemoBoardState` (`{ readonly id: string; readonly engineId: DemoEngineId; readonly session: PentixGameSession }`), the engine table `DEMO_BOARD_ENGINES = ['delphi5', 'random'] as const`, and `demoBoards: readonly DemoBoardState[]` on `GameState`; keep `game`/`session` as the main board's.
- [x] 1.2 Add `mergeGame(shared, next)` that returns whichever game has more `pieceIds`, and route every `applyAdvance` result through it so `state.game` stays the one piece list for every board.
- [x] 1.3 Replace `createSessionBundle` with `createBoardSet(deps, level)`: create one `PentixGame`, then the main session and one session per `DEMO_BOARD_ENGINES` entry from that same game (board id `demo-${engineId}`, deps `userId`), apply the starting level to all three, and return `{ game, session, demoBoards }`.
- [x] 1.4 Use `createBoardSet` in `createInitialState` and in `startSession`, and add a `resetDemoBoards` option so `start`, `restart`, `demo`, and the game-over level pick create a new board set while `demoRestart` starts only the main demo session.
- [x] 1.5 Confirm `tick`, `move`, `rotate`, `drop`, `pause`, `resume`, and the settings actions keep touching only the main `game`/`session` and leave `demoBoards` untouched.

## 2. Per-board demo steps

- [x] 2.1 Define a `DemoStepAction` union (`{ type: 'move'; direction }` | `{ type: 'rotate' }` | `{ type: 'drop' }`) and use it for `demoStep.action`.
- [x] 2.2 Add `{ type: 'demoBoardStep'; boardId: string; action: DemoStepAction; sessionId: string; pieceIndex: number; angle: RotationAngle; column: number }` to `GameAction`.
- [x] 2.3 Extract the existing `demoStep` body into an internal `runDemoStep(session, game, step, selectPieceId)` that applies the gravity descent when `canDemoPieceMoveDown` and then the steering action through `gameSessionEngine`, and reuse it for the main board's `demoStep`.
- [x] 2.4 Handle `demoBoardStep`: resolve the board by `boardId`, ignore an unknown board, a non-active session, or a payload whose session id, piece index, angle, or column no longer matches, and otherwise store only that board's advanced session plus the merged game.
- [x] 2.5 Keep a demo board that reaches `status` `'game-over'` exactly as it is (final board and statistics) and ignore further steps for it until a new board set replaces it.

## 3. Demo stepper hook

- [x] 3.1 In `apps/pentix-web/src/games/pentix/useDemoController.ts`, extract `useDemoStepper({ boardId, engine, level, session, dispatch, active })` holding the `DemoPlan` cache and dispatching one step per `getTickInterval(level)`; reimplement `useDemoController` as a wrapper that uses `activeDemoEngine` and dispatches `demoStep`.
- [x] 3.2 Add `apps/pentix-web/src/games/pentix/useDemoBoard.ts` exporting `useDemoBoard(board, dispatch)`: resolve the engine with `getDemoEngine(board.engineId)`, gate on `board.session.status === 'active'`, derive the interval from `board.session.statistics.level`, and dispatch `demoBoardStep` with the board id.

## 4. Rendering and layout

- [x] 4.1 In `apps/pentix-web/src/games/pentix/BoardView.tsx`, add an optional `compact` prop that renders `className="board board--mini"` while keeping the grid tracks derived from `session.board.width`/`height`.
- [x] 4.2 Add `apps/pentix-web/src/games/pentix/DemoBoard.tsx`: an `article` showing the engine `name`, `Score`/`Lines`/`Pieces` from `session.statistics`, a compact `BoardView`, a game-over marker when `status` is `'game-over'`, and no `Hud`, popup, level buttons, controls, or overlays; call `useDemoBoard` inside it.
- [x] 4.3 In `apps/pentix-web/src/games/pentix/Game.tsx`, wrap the existing column in `.game__layout` and render each `state.demoBoards` entry as a `DemoBoard` inside `<aside className="demo-rail" aria-label="Demo boards">`; keep `useDemoController`/`useGameLoop` gated exactly as today so the popup still pauses only the main board.
- [x] 4.4 In `apps/pentix-web/src/App.css`, add `--demo-cell-size` (`8px`, `6px` in the `900px` breakpoint) and `--demo-slot-width` derived from it, style `.game__layout` as a bottom-aligned two-track grid, `.demo-rail`/`.demo-rail__grid` as a right-aligned 4-column grid reserving three rows, and `.demo-board` plus `.board--mini` (tighter gap, padding, radius) for the small boards.
- [x] 4.5 Add a `760px` media query that collapses `.game__layout` to one column and stacks the rail under the main column without changing the main board's cell size.

## 5. Tests

- [x] 5.1 In `tests/pentix-web.test.mjs`, assert a fresh state has two demo boards with ids `demo-delphi5` and `demo-random`, distinct active sessions, and the same `gameId` as the main session.
- [x] 5.2 Assert the shared sequence: boards at the same `nextPieceIndex` report the same active/next keys, a main `drop` that extends `state.game.pieceIds` keeps one game, and a later `demoBoardStep` reads pieces from that list.
- [x] 5.3 Assert the lifecycle: `start`, `restart`, and a game-over level pick replace both demo sessions (new ids, empty boards, zeroed statistics, applied level), while `demoRestart`, `tick`, `drop`, `move`, and `pause` leave them unchanged.
- [x] 5.4 Assert step targeting: `demoBoardStep` advances only the addressed board, ignores a stale session id, piece index, angle, or column, and ignores a board whose session is `game-over`.
- [x] 5.5 Run `npm run lint`, `npm run build:web`, and `npm test` and fix any failure they report.

## 6. Visual verification

- [x] 6.1 Run `npm run dev:web` and check the two small boards sit bottom-right of the main column with the rail reserving room for twelve, at desktop, `900px`, and mobile widths.
- [x] 6.2 Verify the engines behave differently (`Random` never side-steps, `Delphi 5` can), the small-board statistics update, the main game over leaves the small boards running, and a finished small board keeps its final board with a marker.
- [x] 6.3 Verify starting/restarting a game resets all three boards while the attract demo's automatic restart does not, and that opening the pieces popup pauses only the main board.

## 7. Documentation

- [x] 7.1 Update `README.md` so the browser-client capability lines mention the two parallel demo boards driven by the `delphi5` and `random` engines over the shared piece sequence, leaving the "not implemented yet" list unchanged.

## 8. Review refinements

- [x] 8.1 In `apps/pentix-web/src/App.css`, align the rail with the top of the main column (`align-items: start`) and fill it from its top-left corner (`align-content/justify-content: start`), so the first row sits level with the statistics line.
- [x] 8.2 Enlarge the demo boards to `9px` minos (with a `7px` step at `1000px` and the existing `6px` at `900px`) and widen the rail gap from `0.5rem` to `0.6rem`.
- [x] 8.3 In `apps/pentix-web/src/engine/gameReducer.ts`, retune every demo board when the level changes in the `demo` and `demo-over` phases, keeping each board's session, board, statistics, and piece index, while leaving the player-game path unchanged.
- [x] 8.4 Assert the level retune in `tests/pentix-web.test.mjs`: level button, `+`/`-`, the demo delay, and the unchanged rail during a player-game raise.
- [x] 8.5 Re-run `npm run lint`, `npm run build:web`, and `npm test`, and re-check the layout with headless screenshots at desktop, `1000px`, `900px`, and mobile widths.

## 9. Temporary engine override for testing

- [x] 9.1 In `apps/pentix-web/src/engine/demo.ts`, add `DEMO_ENGINE_OVERRIDE = 'random'` so the main board's attract demo plays the `random` engine while it is evaluated; `ACTIVE_DEMO_ENGINE_ID` falls back to `DEFAULT_DEMO_ENGINE_ID` (`delphi5`) when the override is `null`.
- [x] 9.2 Confirm the demo boards keep their own engines (`delphi5` and `random`) and that `npm run lint`, `npm run build:web`, and `npm test` still pass with the override active.
- [ ] 9.3 After testing, set `DEMO_ENGINE_OVERRIDE` back to `null` so the attract demo returns to the registry default engine.