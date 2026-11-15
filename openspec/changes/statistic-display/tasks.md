## 1. Statistics collection (reducer)

- [ ] 1.1 Add a client-side `CollectedStats` field to `GameState` in `apps/pentix-web/src/engine/gameReducer.ts` tracking `moveLeft`, `moveRight`, `rotate`, `drop`, and a per-`PieceKey` lock count map initialized with all 29 `PIECE_CATALOG` keys at zero.
- [ ] 1.2 Increment the corresponding action counter on `move`, `rotate`, and `drop` in the reducer, scoped to the `playing` phase.
- [ ] 1.3 Attribute each locked piece in `applyAdvance` by comparing `statistics.blocks` before/after `tick`/`drop` and incrementing the pre-settle `state.session.activePiece.key` count when the delta is exactly `+1`.
- [ ] 1.4 Reset all collected statistics on `start`/`restart`.

## 2. HUD statistics

- [ ] 2.1 Add a "Pieces" statistic to `apps/pentix-web/src/games/pentix/Hud.tsx` that renders `statistics.blocks`.
- [ ] 2.2 Reorganize Score, Level, Lines, and Pieces into a single horizontal stat row, keeping the next-piece preview below it.

## 3. Game-over statistics overlay

- [ ] 3.1 Add a "Last game statistics" section to the game-over overlay in `apps/pentix-web/src/games/pentix/Game.tsx` showing the final score, level, lines, and pieces.
- [ ] 3.2 Show the collected action counts (left/right/rotate/drop) and aggregate rotate and drop counts in the overlay.
- [ ] 3.3 Add a collapsible "Pieces" panel that expands into a compact 29-piece grid with each piece's key and lock count.

## 4. Styling

- [ ] 4.1 Add `.hud__stats` (flex row) and `.hud__stat` styles to `apps/pentix-web/src/App.css`, reusing `.hud__label`/`.hud__value`.
- [ ] 4.2 Add styles for the overlay statistics section, the collapsible panel toggle, and the compact 29-piece grid (small labels/values, wrapping).
- [ ] 4.3 Verify the stat row and panel wrap acceptably at the `@media (max-width: 900px)` breakpoint.

## 5. Verification

- [ ] 5.1 Add unit tests in `tests/pentix-web.test.mjs` for action counting, rotate/drop aggregates, per-piece attribution on settle, and reset-on-start.
- [ ] 5.2 Run `npm run dev:web` and manually verify the one-line HUD, per-piece counts, and the game-over "Last game statistics" panel.
- [ ] 5.3 Run `npm run lint` and `npm run build:web` and fix any errors.