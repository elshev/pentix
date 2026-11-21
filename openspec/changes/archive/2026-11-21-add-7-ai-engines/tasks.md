## 1. Authored-plan adapter

- [x] 1.1 In `packages/pentix-core/src/demo-engine-toolkit.ts`, add `AuthoredPlan` (`(board: number[][], piece: { row: number; column: number }[][], position: { row: number; column: number }) => string`) and `adaptAuthoredPlan(plan: AuthoredPlan): DemoEngine['plan']`, which deep-copies the board rows, piece cells, and position into fresh mutable values, calls the authored plan inside `try`/`catch`, returns `''` on a throw, and normalizes the result with a local `toDemoActionLog` that keeps only `L`, `R`, `C`, `A`, `H`, keeps at most one `L`/`R` after the first `H`, and drops the rest.
- [x] 1.2 Export `adaptAuthoredPlan` and the `AuthoredPlan` type from `packages/pentix-core/src/index.ts`, next to the other toolkit helpers.
- [x] 1.3 In `tests/pentix-core.test.mjs`, add adapter tests: a plan that mutates its arguments leaves the caller's board/piece untouched; `"LLXH!"` becomes `"LLH"`; `"RHHLC"` becomes `"RHL"`; a throwing plan returns `''`; `"CLRHR"` passes through unchanged.
- [x] 1.4 Run `npm run build:core` and the core test file; fix the adapter until both pass.

## 2. Authored engine modules

Each task pastes the authored body from the named file in `c:\ai\temp` verbatim as a local `authoredPlan` (after the fix-up request in 3.4 has been applied), adds `id`, `name`, and a `description` that repeats the name in more detail and includes the bracketed note, exports `plan = adaptAuthoredPlan(authoredPlan)`, and compiles under the strict build without changing the strategy. `GigaChat.ts` is not wrapped and gets no module.

- [x] 2.1 Add `claude-opus-5-5-extra-demo-engine.ts` (`id` `claude-opus-5-5-extra`, name `Claude Opus 5.5 Extra`, 40 min thinking) from `Claude Opus 5.5 Extra (40 min thingking).ts`; description covers its breadth-first search over reachable placements, board heuristic, and 29-block one-piece lookahead.
- [x] 2.2 Add `claude-sonnet-5-5-extra-demo-engine.ts` (`id` `claude-sonnet-5-5-extra`, name `Claude Sonnet 5.5 Extra`, 40 min thinking) from `Claude Sonnet 5.5 Extra ((40 min thingking).ts`; description covers its exact-replay reachability, twelve-feature weight vector, and lookahead.
- [x] 2.3 Add `deepseek-v4-flash-1107-max-demo-engine.ts` (`id` `deepseek-v4-flash-1107-max`, name `DeepSeek v4 Flash 1107 Max`, 13 min thinking) from `DeepSeek v4 Flash 1107 Max (13 min thinking).ts`; description covers candidate generation, faithful replay with wall kicks, and its board judgement terms.
- [x] 2.4 Add `deepseek-v4-pro-max-demo-engine.ts` (`id` `deepseek-v4-pro-max`, name `DeepSeek v4 Pro Max`, 12 min thinking) from `DeepSeek v4 Pro Max (12 min thinking).ts`; description covers exact replay of every orientation/column/side-step, immediate points, and holes/height/bumpiness penalties.
- [x] 2.5 Add `glm-5-3-flash-extra-demo-engine.ts` (`id` `glm-5-3-flash-extra`, name `GLM 5.3 Flash Extra`, 15 min thinking) from `GLM-5.3-Flash Extra (15 min thinking).ts`; description covers the exhaustive candidate search, kick-free rotation placement, and immediate-points-minus-penalties ranking.
- [x] 2.6 Add `minimax-m3-1-flash-extra-demo-engine.ts` (`id` `minimax-m3-1-flash-extra`, name `MiniMax M3.1 Flash Extra`, 3-4 hours thinking) from `MinMax-M3.1-Flash Extra (3-4 hours thinking, many credits has gone).ts`; description covers the reachable-state breadth-first search, exact caller points, and tuned stack-quality weights.
- [x] 2.7 Add `qwen-4-max-demo-engine.ts` (`id` `qwen-4-max`, name `Qwen 4 Max`, bracketed note `Chat`) from `Qwen4 Max (Chat).ts`; description covers replaying every orientation/column/side-step candidate and ranking with clear/drop points minus survival penalties.
- [x] 2.8 In `packages/pentix-core/src/demo-engines/index.ts`, import the seven modules and export one named constant per engine (`claudeOpus55ExtraDemoEngine` and the matching names), then append them to `builtInDemoEngines` after `delphi5` and `random` in the order 2.1-2.7; add the same named exports to `packages/pentix-core/src/index.ts`. No `gigachat` entry is added anywhere.
- [x] 2.9 Run `npm run build:core` and fix only compile blockers (unused locals/params, missing annotations) in the pasted bodies, leaving every authored decision intact.

## 3. Authoring brief and the fix-up request

- [x] 3.1 In `docs/demo-engine-task.md`, add the self-contained-answer rule to the rules and answer-format sections: answer from this document only, reuse nothing from another chat or answer, and return the complete pure `plan` function.
- [x] 3.2 Require a short algorithm comment above `function plan` (what it enumerates, how it scores, why it ends where it does); narrow the "no explanation outside the code" line to "no prose after the function" and update the example answer and the self-check list accordingly.
- [x] 3.3 Rewrite the last-tick section as a rule: end at `H` when the placement is reachable by a straight drop; allow exactly one `L`/`R` after `H` only for a pocket a drop cannot enter; reframe the worked pocket example as the exception and add the matching self-check bullet ("the side-step appears only when a drop cannot reach the placement").
- [ ] 3.4 Re-request the seven plans with the fix-up request recorded in `design.md` D6, so each returned log ends at `H` unless a side-step is genuinely required; replace the authored bodies in the modules from 2.1-2.7 with the fixed versions, keeping the metadata unchanged. The delivered bodies still fail this: on an empty board only `deepseek-v4-pro-max` ends at `H`, and the other six append `R` after the drop.
- [x] 3.5 Re-read the brief and confirm it still lists all 29 blocks, the scoring table, the tick rhythm, the TypeScript-only requirement, and no repository access.

## 4. Catalog tests

- [x] 4.1 In `tests/pentix-core.test.mjs`, change the registry-order assertion to expect `delphi5`, `random`, then the seven authored ids in the order 2.1-2.7 (nine in total), assert the first two are still `Delphi 5` and `Random`, and assert `gigachat` is not registered.
- [x] 4.2 Update the module-name test to expect exactly the nine module file names (no `gigachat-demo-engine.ts`) and to assert each module's `id` equals its `-demo-engine.ts` prefix.
- [x] 4.3 Add a test that every registered engine plans a fixed mid-game board into a log containing only `L`, `R`, `C`, `A`, `H`, with at most one lateral code after the first `H`, and leaves the board, piece, and position unchanged.
- [ ] 4.4 Once the re-authored plans from 3.4 land, add a test that on an empty board — where every placement is drop-reachable — every registered engine's log ends at `H` and carries no post-drop lateral. Do not weaken it to fit the delivered bodies.
- [x] 4.5 Run `npm run build:core` and the core test file; confirm the new engines are resolvable by id and the registry still rejects unknown and duplicate ids.

## 5. Default engine and rail tests

- [x] 5.1 In `apps/pentix-web/src/engine/gameReducer.ts`, change `MAIN_DEMO_ENGINE_ID` from `'random'` to `'delphi5'` and refresh its doc comment to say the main board's attract demo opens on the classic heuristic; leave `DEFAULT_DEMO_ENGINE_ID` as `'delphi5'` and the swap/restart paths untouched.
- [x] 5.2 In `tests/pentix-web.test.mjs`, rewrite `a fresh state starts one demo board per registered engine` to derive the expected engine list from the registry, assert the rail length is `min(registered, MAX_DEMO_BOARDS)` (nine today), keep the `demo-slot-N` id check, assert the session-id set holds every board plus the main session, and assert `mainEngineId` is `delphi5`.
- [x] 5.3 Replace the `[delphi, random]` destructuring and slot-2-by-index assumptions with lookups by engine id (`state.demoBoards.find((board) => board.engineId === 'random')`) in the shared-piece-list, swap, default-engine, and stale-step tests.
- [x] 5.4 Re-run `npm run test:web` and fix the remaining index-based or `random`-default assumptions until the rail, swap, level, and restart suites pass.

## 6. Demo-board card

- [x] 6.1 In `apps/pentix-web/src/games/pentix/DemoBoard.tsx`, make the header's first row the engine name plus an `i` info icon (`role="img"`, `tabIndex={0}`, `aria-label="About <name>"`) whose `.demo-board__about` panel renders the name in `<strong>` and the description below; keep the article's `aria-label` and swap `title`.
- [x] 6.2 Replace the three `Score`/`Lines`/`Pieces` stats with `S`/`L`/`P` on one line at the larger font, each label carrying the full word as `title` and in its accessible name, and drop the header's `Game over` paragraph.
- [x] 6.3 Wrap `BoardView` in `.demo-board__stage` and render, when `status === 'game-over'`, `<div className="overlay overlay--mini">` containing the `Game over` title and the final `Score`, `Lines`, and `Pieces` values from the same `statistics` snapshot.
- [x] 6.4 In `apps/pentix-web/src/App.css`, add `position: relative` to `.demo-board`, styles for `.demo-board__info` and `.demo-board__about` (hidden by default, shown on `:hover`, `:focus-visible`, and `:focus-within`, `pointer-events: none`), `.demo-board__stage` (`position: relative`), and `.overlay--mini` (inset `var(--demo-board-pad)`, radius `10px`, `0.9rem` title, `0.7rem` values); raise `.demo-board__stats` from `0.56rem` to `0.66rem`, keep it nowrap with tabular numerals and a `,` separator, and delete the `.demo-board__status` rule.
- [x] 6.5 Confirm no remaining reference to `demo-board__status` and that `npm run build:web` passes with the new markup.

## 7. Documentation

- [x] 7.1 Update `docs/foundation.md` to list the nine built-in engines, document the `<vendor>-<version>[-<variant>]-<mode>-demo-engine.ts` grammar (note excluded from the id, reproduction note in the description), state that an authored plan is wrapped by the shared adapter, and state that the main board's attract demo opens on `delphi5`.
- [x] 7.2 Update `README.md`'s capability summary so the demo-board rail names the classic two engines plus the seven AI-authored ones, the count reads nine, and the main board's demo engine reads `delphi5`.
- [x] 7.3 Re-read `README.md`, `docs/foundation.md`, and `docs/demo-engine-task.md` together and confirm they agree: no document still claims two engines, an eight-engine addition, `random` as the initial engine, or the old side-step allowance.

## 8. Verification

- [x] 8.1 Run `npm run lint` and fix any finding in the new modules or components.
- [x] 8.2 Run `npm test` (core, server, and web suites) and confirm every suite passes.
- [x] 8.3 Run `npm run build` and confirm the core, server, and web builds succeed.
- [ ] 8.4 Start `npm run dev:web` and check by hand: the page opens on Delphi 5, the rail shows nine cards within its four-by-three wall, each card's first row is the name beside the `i` icon, hovering or focusing the icon reveals name and description, `S`/`L`/`P` stays on one line at the larger font while a session advances, a finished card shows the `Game over` overlay with its final score, lines, and pieces at the larger font, a log never side-steps after the drop unless the pocket requires it, and a double-click still swaps a card with the main board.
