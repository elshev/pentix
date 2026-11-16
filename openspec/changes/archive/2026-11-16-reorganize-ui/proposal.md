## Why

The board is the whole point of the screen, yet it is the smallest thing on it. Each mino is only 22px, so the 12×22 playfield reads small on a desktop browser, while a full right-hand column of chrome — a "MainStatistics" title above a stats row, an expanded 29-piece panel, a settings block, and the on-screen controls — sits beside it and pushes the player's eye away from the playfield. The hero above the game also repeats marketing copy ("Play the rebuilt classic." plus a paragraph) that a player only ever reads once. Reorganizing the screen into one centered column with statistics above the board and buttons below it, dropping redundant labels, and enlarging every mino by 20% makes the playfield bigger and the screen quieter without changing any gameplay behavior.

## What Changes

- **Board minos render 20% larger.** `--cell-size` changes from `22px` to `calc(22px * 1.2)` (`26.4px`) and the small-screen override from `16px` to `calc(16px * 1.2)` (`19.2px`). The board keeps its stored `width`-by-`height` grid (`12×22` at the default size) — only the per-mino display size grows, not the row or column count.
- **Next-piece preview minos scale with the board** (`--mini-cell-size` `14px` → `calc(14px * 1.2)`), so the preview stays proportional to the larger minos. The 5px per-piece counter minos in the secondary statistics panel are unchanged.
- **Top panel is reduced to a single wordmark.** Remove the `Pentix` eyebrow, the `Play the rebuilt classic.` heading, and the explanatory paragraph from the page header; render only `PENTIX`, larger than before.
- **Main statistics lose their title and move above the board.** The `MainStatistics` title is removed; the row keeps the optional next-piece preview (leftmost), Score, Lines, and Pieces, and is rendered above the board at board width.
- **Level gets its own line above the board, below the statistics.** `statistics.level` leaves the statistics row and is displayed on a dedicated line between the statistics row and the board.
- **The secondary statistics panel collapses by default** and moves above the board, directly under the level line. Its content (moves/rotates/drops plus the 29 per-piece counters) and its collapsed/expanded toggle behavior are unchanged.
- **All on-screen buttons move beneath the board** and are grouped compactly: `◀`, `⟳ Rotate`, `▶`, `Hard drop`, `Pause`/`Resume`, `Restart`, plus the `Rotation: clockwise|anticlockwise`, `Next piece: on|off`, and start-level controls that previously lived in the right-hand settings block.
- **The gameplay area becomes a single centered column**, with the statistics, level line, board, and controls stacked at the same width as the board, so **nothing renders to the right of the board**.
- **BREAKING**: none for API consumers. The board is rendered at a larger display size, so the gameplay screen occupies more vertical space; on short viewports the page scrolls instead of fitting above the fold.

### Second iteration (after reviewing the first render)

- **Header height halved** again: the `PENTIX` wordmark drops to `clamp(1.2rem, 3vw, 2rem)` inside a tighter hero card, so the header is ~`46px` tall instead of ~`92px`.
- **The top area keeps only the statistics row.** The dedicated level line and the secondary statistics panel are removed from above the board.
- **The secondary statistics become a popup** opened by a drop-down toggle on the `Pieces` counter (with an expanded/collapsed chevron). Opening it **pauses the game** (the player game enters the paused phase but the paused overlay is suppressed; the attract demo stops advancing) and closing it resumes only a game the popup itself paused.
- **The level panel moves beneath the `Hard drop` button** and shows the **current session level**; the `Start level:` label and the incremental `level` button are gone.
- **Level buttons act on the game:** during a player game only the levels *above* the current session level are enabled, so the level can be raised but never lowered (the `+` key raises it too, while `-` is a no-op mid-game); they retune the live demo level while the demo runs, and on the game-over screen they start a fresh game at that level (respecting the `700` ms cooldown).
- **The attract demo waits out the same delay as a player game over** before starting the next demo: a new `demo-over` phase keeps the finished board on screen, and a `demoRestart` action starts the next demo after `GAME_OVER_COOLDOWN_MS`.
- **Cleanup:** the now-unused `CollapsiblePanel` component and its CSS are deleted.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `browser-gameplay`: the board-render requirement gains a per-mino display-size rule (20% larger, unchanged grid dimensions); the HUD requirement changes to a title-less statistics row above the board whose `Pieces` counter is a drop-down toggle (no level line, no secondary panel beneath it); the secondary statistics requirement becomes a popup that pauses the game while open; a new requirement pins the single-column gameplay layout (statistics above the board, controls and level buttons below it, empty space to the right of the board); a new requirement defines the level buttons (highlight the session level, disabled during a player game, retune the demo, start a game from game over); a new requirement gives the attract demo the same post-game-over delay before restarting; the game-over cooldown requirement is extended to the level buttons and the demo restart; and the game-over overlay requirement is restated so its statistics reference points at the popup.

## Impact

- **Affected code**: `apps/pentix-web/src/App.tsx` (header reduced to the wordmark), `apps/pentix-web/src/App.css` (cell-size variables, single-column `.game` grid, compact header, HUD popup, controls/settings placement), `apps/pentix-web/src/games/pentix/Game.tsx` (section order, popup pause wiring, demo-restart hook), `apps/pentix-web/src/games/pentix/Hud.tsx` (drop-down `Pieces` toggle + popup), `apps/pentix-web/src/games/pentix/SecondaryStats.tsx` (popup body), `apps/pentix-web/src/games/pentix/Controls.tsx` (level selector under `Hard drop`), `apps/pentix-web/src/games/pentix/Settings.tsx` (level controls removed), `apps/pentix-web/src/games/pentix/useDemoRestart.ts` (new delay hook), `apps/pentix-web/src/engine/gameReducer.ts` (`demo-over` phase, `demoRestart` action, level-button semantics), `apps/pentix-web/src/engine/keyMap.ts` (`demo-over` keys), and `apps/pentix-web/src/games/pentix/CollapsiblePanel.tsx` (deleted).
- **Unaffected**: `packages/pentix-core`, `apps/pentix-server`, the REST contract, the reducer's session shape, and the demo planner. No new dependencies.
- **Tests**: `tests/pentix-web.test.mjs` updates and adds reducer/key-map tests for the demo delay, the level-button rules, and the `demo-over` keys; the core and server suites are untouched. Verification is `npm run lint`, `npm run build:web`, `npm test`, plus headless-browser screenshots.
- **Affected teams**: the frontend/game-UI stream only. Shared-core and server owners are unaffected because this change is presentation-only.
- **Rollback plan**: revert the listed `apps/pentix-web` files and `tests/pentix-web.test.mjs`, and restore `CollapsiblePanel.tsx`, to return to the previous layout (title-less stats row with a level line and collapsed panel, level picker in settings, immediate demo restart). There is no data migration, no persisted setting, and no server or engine contract change, so rollback is isolated to the web app and carries no risk to other packages.
