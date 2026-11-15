## Why

The browser UI currently shows only Score, Level, and Lines — stacked vertically in the HUD — even though the shared engine already tracks the locked-piece count and exports the full 29-piece catalog. When a game ends, the game-over overlay says only "Game over" and offers restart/demo, silently discarding all of the player's performance data. As a result there is no way to see how many of each piece was placed, what actions were taken, or how a finished run performed. Surfacing these statistics — a one-line HUD summary, a per-piece breakdown for all 29 catalog pieces, and a "last game statistics" recap on game-over — gives players immediate, useful feedback without any server or engine changes.

## What Changes

- Add a **Pieces** statistic (`statistics.blocks`) to a **MainStatistics** panel and render **Next, Score, Level, Lines, and Pieces** on a single horizontal line, with the next-piece preview leftmost and rendered in a fixed-size frame so it never resizes the panel.
- Track **per-piece lock counts** for all **29 catalog pieces** (enumerated from `PIECE_CATALOG`), maintained client-side, and display them in a **collapsible, compact panel**.
- Collect player **action counts** (left, right, rotate, drop — shown as the pressed keys) plus aggregate **rotate count** and **drop count** during a player game.
- Add a collapsible **secondary statistics panel** below the MainStatistics panel in the right column (open by default, smaller font) showing a combined key count (left+right), **rotates**, **drops**, and a per-piece breakdown of all 29 pieces drawn with 5×5-pixel minos and arranged in three rows of ten with wider spacing; the game-over overlay keeps only the title and the *Play again* / *Demo* buttons whose **Enter**/**Space** hotkeys appear as popup tooltips.
- Keep all collection client-side in the web app's reducer state; no `pentix-core`, `pentix-server`, or REST contract changes.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `browser-gameplay`: the HUD requirement changes to show the locked-piece count ("Pieces") on one line with score/level/lines, and new requirements add last-game statistics, per-piece counts for the 29-piece catalog, and action/rotate/drop counters.

## Impact

- **Affected code**: `apps/pentix-web/src/engine/gameReducer.ts` (client-side statistics collection), `apps/pentix-web/src/games/pentix/Hud.tsx`, `apps/pentix-web/src/games/pentix/Game.tsx` (game-over overlay), `apps/pentix-web/src/App.css` (stat row, collapsible panel, overlay styles), and `tests/pentix-web.test.mjs` (statistics assertions). No changes to `pentix-core`, `pentix-server`, or the REST contract.
- **Dependencies**: no new packages; reuses `PIECE_CATALOG` already exported by the `#pentix/core` alias.
- **Affected teams**: the frontend/game-development stream only. Server and shared-core owners are unaffected because this change consumes, but does not modify, the shared engine and its statistics snapshot.
- **Rollback plan**: the change is entirely additive within the web app. Rolling back means reverting the listed `apps/pentix-web` files; `pentix-core` and `pentix-server` are untouched, so rollback is isolated and carries no risk to the server contract.