## 1. Board size

- [x] 1.1 In `apps/pentix-web/src/App.css`, change `--cell-size` from `22px` to `calc(22px * 1.2)` and `--mini-cell-size` from `14px` to `calc(14px * 1.2)`; leave `--piece-mini-cell` at `5px`.
- [x] 1.2 In the `@media (max-width: 900px)` block, change `--cell-size` from `16px` to `calc(16px * 1.2)` and `--mini-cell-size` from `11px` to `calc(11px * 1.2)`.
- [x] 1.3 Confirm `BoardView.tsx` still derives its tracks from `session.board.width`/`height` (no row or column count change) and that the next-piece preview frame still uses `--mini-cell-size`.

## 2. Header

- [x] 2.1 In `apps/pentix-web/src/App.tsx`, replace the eyebrow, `h1`, and lede paragraph with a single `<h1 className="hero__wordmark">PENTIX</h1>` and drop the now-unused `DEFAULT_BOARD_SIZE` and `PIECE_CATALOG` imports.
- [x] 2.2 In `App.css`, replace `.eyebrow`, `.hero h1`, `.lede`, and `.lede code` with a `.hero__wordmark` rule sized `clamp(2.4rem, 6vw, 4rem)`, and tighten `.hero` padding so the header stays short.

## 3. Layout column

- [x] 3.1 In `App.css`, replace the two-column `.game` grid (and its named areas `stage`, `hud`, `secondary`, `controls`, `settings`, `status`) with `display: grid; justify-items: center;` plus a new `.game__column` flex column (`display: flex; flex-direction: column; gap`; `width: min-content`; `max-width: 100%`) — `min-content` (not `max-content`) so the unwrapped keyboard-hint text cannot stretch the column past the board width.
- [x] 3.2 Remove the `grid-area` declarations from `.game__stage`, `.game__secondary`, `.hud`, `.controls`, `.settings`, and `.status-line`, keeping `.game__stage { position: relative }` so `.overlay` and `.demo-badge` stay anchored to the board.
- [x] 3.3 Update the `@media (max-width: 900px)` block so it no longer overrides `grid-template-columns`/`grid-template-areas` on `.game` but still applies the smaller cell sizes.

## 4. Statistics above the board

- [x] 4.1 In `apps/pentix-web/src/games/pentix/Hud.tsx`, delete the `MainStatistics` title element (`hud__title`) and the `Level` stat block, leaving Next (optional, leftmost), Score, Lines, and Pieces in the row.
- [x] 4.2 In `apps/pentix-web/src/games/pentix/Game.tsx`, render the `Hud` above the board, add a `Level <strong>{level}</strong>` line (class `game__level`) directly beneath it, and place `SecondaryStats` beneath the level line — all inside `.game__column` above `.game__stage`.
- [x] 4.3 In `apps/pentix-web/src/games/pentix/SecondaryStats.tsx`, pass `defaultOpen={false}` to `CollapsiblePanel` so the panel starts collapsed.
- [x] 4.4 In `App.css`, style `.hud` as a board-width block above the board (remove the tall sidebar padding/shadow if it no longer suits) and add a compact `.game__level` rule.
- [x] 4.5 In `App.css`, make `.piece-counts` a wrapping flex row of content-sized chips (`flex-wrap: wrap; justify-content: center`) so the 29 counters fit the board-width panel in four to five rows without overlapping.

## 5. Controls below the board

- [x] 5.1 In `Game.tsx`, move `Controls` and `Settings` beneath `.game__stage` inside `.game__column` and keep the `status-line` as the last child.
- [x] 5.2 In `App.css`, restyle `.controls` and `.settings` as compact board-width blocks under the board (no sidebar padding/shadow), keeping `.controls__row`/`.settings__row` wrapping and the existing `control-button` styles.
- [x] 5.3 Tighten `.settings__level-grid` (smaller padding/font) so ten start-level buttons fit the board width, and confirm the level and rotation rows stay compact.

## 6. Verification

- [x] 6.1 Run `npm run lint` and fix any errors (especially unused imports left in `App.tsx`).
- [x] 6.2 Run `npm run build:web` and confirm the TypeScript build and Vite bundle succeed.
- [x] 6.3 Run `npm test` and confirm the existing engine/reducer/web tests still pass unchanged.
- [x] 6.4 Verify the default render with headless Edge screenshots (`--headless=new --screenshot`): header shows only `PENTIX`; statistics row above the board with no title and no Level; `LEVEL 9` line below the statistics; collapsed `STATISTICS` panel above the board; larger 26.4px minos with the same 12×22 grid; all buttons below the board; nothing rendered to the right of the board.
- [x] 6.5 Re-check the render at 1400px, 900px, and 500px (Edge's minimum window width) — the media breakpoint drops the minos to 19.2px, nothing overflows horizontally, and the level grid plus hint text fit the column; also capture the expanded statistics panel and the enabled next-piece preview (temporarily flipping their defaults, then reverting) to confirm the counters wrap without overlap.

## 7. Second iteration: compact chrome and statistics popup

- [x] 7.1 Halve the header height in `App.css` (`.hero` padding `0.3rem 1.25rem`, `.hero__wordmark` `clamp(1.2rem, 3vw, 2rem)`, mobile `clamp(1rem, 4.5vw, 1.4rem)`).
- [x] 7.2 Remove the level line and the secondary statistics panel from above the board (`Game.tsx` markup plus the `.game__level`/`.game__top`/`.game__secondary` CSS).
- [x] 7.3 Turn the "Pieces" statistic into a drop-down toggle in `Hud.tsx` (`aria-expanded`, `aria-controls`, chevron) that renders `SecondaryStats` inside a `.stats-popup` anchored under the statistics row; drop the `CollapsiblePanel` wrapper from `SecondaryStats.tsx` and delete `CollapsiblePanel.tsx` plus its `.panel*` CSS.
- [x] 7.4 Pause the game while the popup is open: `Game.tsx` dispatches `pause`/`resume` around the popup for a player game (tracked with a `resumeOnClose` ref), suppresses the paused overlay while it is open, and gates `useDemoController` with `!statsOpen`.
- [x] 7.5 Move the level buttons under `Hard drop` in `Controls.tsx` (highlighting `session.statistics.level`, disabled while playing or paused), and remove the `Start level:` label, the `▲ level` button, and the level grid from `Settings.tsx` and its CSS; update the key hint text.

## 8. Second iteration: level buttons and the demo delay

- [x] 8.1 Add the `demo-over` phase and the `demoRestart` action to `gameReducer.ts`; make `applyAdvance` move a finished demo to `demo-over` while keeping its final session instead of starting a new demo.
- [x] 8.2 Add `useDemoRestart.ts` and wire it in `Game.tsx` so `demoRestart` fires after `GAME_OVER_COOLDOWN_MS`; show the demo badge in `demo-over` too.
- [x] 8.3 Rework `setStartingLevel` in `gameReducer.ts`: ignore it while playing/paused and during the game-over cooldown, retune the live demo level and the configured level otherwise, and start a fresh player game at that level from `game-over`.
- [x] 8.4 Extend `keyMap.ts` so `demo-over` accepts `Enter`/`Space` (start a game) and `0`-`9` (level selection).
- [x] 8.5 Update `tests/pentix-web.test.mjs`: the demo keeps its board and needs `demoRestart`, level buttons start/are-inert per phase, a level chosen during the delay applies to the next demo, and the `demo-over` key mappings.

## 8a. Mid-game raise-only level rule

- [x] 8a.1 In `gameReducer.ts`, let `changeLevel` apply the new level to the live session while a player game is playing or paused, refusing any level at or below the session's current level.
- [x] 8a.2 Route `setStartingLevel` through `changeLevel` for player phases, and step `increaseLevel`/`decreaseLevel` from the live session level (`currentLevel`) so `+` raises a running game and `-` is a no-op there.
- [x] 8a.3 In `Controls.tsx`, disable a level button only while a game is locked and the option is at or below the current level (`levelLocked && option <= level`), keeping all ten selectable in the demo and on the game-over screen.
- [x] 8a.4 Update the web tests: raising mid-game (playing and paused) applies to the session and settings, lowering/equal is refused, and `+`/`-` follow the same rule.
- [x] 8a.5 Verify the rule in the live DOM with `--dump-dom` while a game runs at level 3: levels `0`-`3` carry `disabled`, `4`-`9` do not, and `3` is `aria-pressed`.

## 9. Second iteration verification

- [x] 9.1 Run `npm run lint`, `npm run build:web`, and `npm test` (core+server 98, web 53 passing).
- [x] 9.2 Verify the compact header, the statistics row with the `Pieces` chevron, the level selector under `Hard drop`, and the unchanged board with headless Edge screenshots.
- [x] 9.3 Verify the open popup with a screenshot (temporarily defaulting it open, then reverting): it drops under the statistics row over the board, shows the action counters and the wrapping piece chips, and the chevron flips.
