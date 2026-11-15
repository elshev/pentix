## 1. Statistics collection (reducer)

- [x] 1.1 Add a client-side `CollectedStats` field to `GameState` in `apps/pentix-web/src/engine/gameReducer.ts` tracking `moveLeft`, `moveRight`, `rotate`, `drop`, and a per-`PieceKey` lock count map initialized with all 29 `PIECE_CATALOG` keys at zero.
- [x] 1.2 Increment the corresponding action counter on `move`, `rotate`, and `drop` in the reducer, scoped to the `playing` phase.
- [x] 1.3 Attribute each locked piece in `applyAdvance` by comparing `statistics.blocks` before/after `tick`/`drop` and incrementing the pre-settle `state.session.activePiece.key` count when the delta is exactly `+1`.
- [x] 1.4 Reset all collected statistics on `start`/`restart`.

## 2. HUD statistics

- [x] 2.1 Add a "Pieces" statistic to `apps/pentix-web/src/games/pentix/Hud.tsx` that renders `statistics.blocks`.
- [x] 2.2 Reorganize Score, Level, Lines, and Pieces into a single horizontal stat row, keeping the next-piece preview below it.

## 3. Game-over statistics overlay

- [x] 3.1 Add a "Last game statistics" section to the game-over overlay in `apps/pentix-web/src/games/pentix/Game.tsx` showing the final score, level, lines, and pieces.
- [x] 3.2 Show the collected action counts (left/right/rotate/drop) and aggregate rotate and drop counts in the overlay.
- [x] 3.3 Add a collapsible "Pieces" panel that expands into a compact 29-piece grid with each piece's key and lock count.

## 4. Styling

- [x] 4.1 Add `.hud__stats` (flex row) and `.hud__stat` styles to `apps/pentix-web/src/App.css`, reusing `.hud__label`/`.hud__value`.
- [x] 4.2 Add styles for the overlay statistics section, the collapsible panel toggle, and the compact 29-piece grid (small labels/values, wrapping).
- [x] 4.3 Verify the stat row and panel wrap acceptably at the `@media (max-width: 900px)` breakpoint.

## 5. Verification

- [x] 5.1 Add unit tests in `tests/pentix-web.test.mjs` for action counting, rotate/drop aggregates, per-piece attribution on settle, and reset-on-start.
- [x] 5.2 Run `npm run dev:web` and manually verify the one-line HUD, per-piece counts, and the game-over "Last game statistics" panel.
- [x] 5.3 Run `npm run lint` and `npm run build:web` and fix any errors.

## 6. UI refinement (second iteration)

- [x] 6.1 Move the next-piece preview into the MainStatistics one-line row as the leftmost item and render it in a fixed 5×3 frame so it no longer resizes the panel.
- [x] 6.2 Remove the game-over hint row and the last-game recap; show a secondary statistics panel instead.
- [x] 6.3 Add `Enter`/`Space` hotkey tips to the Play again / Demo buttons.
- [x] 6.4 Add a collapsible secondary "Statistics" panel (open by default, small font) with a combined key count, rotates, drops, and 29 per-piece counters drawn with 5×5px minos that wrap onto the next row.
- [x] 6.5 Move the secondary statistics panel out of the game-over overlay into the right column below the MainStatistics panel, leaving the game-over overlay with only the title and hotkey-tipped buttons.
- [x] 6.6 Expose the Play again / Demo hotkeys as popup tooltips (native `title` attributes) and remove the inline second-row hotkey text and its CSS.
- [x] 6.7 Lay the 29 piece counters out in a fixed 10-per-row, 3-row grid and widen the gap between them by 5px.