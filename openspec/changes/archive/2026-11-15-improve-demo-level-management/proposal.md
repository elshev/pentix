## Why

The browser gameplay client's level controls and gravity cadence have drifted from the classic Delphi client and are partly broken: `+` raises the configured starting level but `-` does nothing, the default level is `1` instead of `9`, changing the level during the running demo has no visible effect (the demo keeps its old speed), and the tick interval is slower than Delphi's — at level 9 the web runs at 240 ms per tick where Delphi runs at 100 ms.

## What Changes

- Add a `decreaseLevel` action and map `-` (and `_`) to it, so `+`/`-` step the level up/down, clamped to `0–9`.
- Make `increaseLevel` and `decreaseLevel` apply the new level to the **running demo session** (its `statistics.level`), not just to `settings.startingLevel`, so the demo speeds up or slows down immediately and the chosen level carries into the next session.
- Set the default starting level to `9`.
- Port the Delphi gravity schedule to `getTickInterval`: `1000 − 100 × level` ms, so level 0 ticks at 1000 ms and level 9 at 100 ms (today it is `800 − 70 × (level − 1)` with a 120 ms floor, which is slower at high levels).
- Update the web tests for the new default, the decrease action, the live-demo level change, and the Delphi interval table.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `demo-mode`: The demo SHALL follow manual level changes — when the player increases or decreases the level during the demo, the current demo session's level (and therefore its gravity speed) changes immediately, and the new level becomes the starting level for the next session.
- `browser-gameplay`: Level controls (`+`/`-`), the default starting level of `9`, and the level-based gravity interval SHALL match the Delphi schedule `1000 − 100 × level` ms.

## Impact

- Affected code: `apps/pentix-web/src/engine/gameReducer.ts` (default level, `decreaseLevel`, live-demo level), `apps/pentix-web/src/engine/keyMap.ts` (`-`/`_`), `apps/pentix-web/src/engine/gameLoop.ts` (interval table), and `tests/pentix-web.test.mjs`. No `pentix-core`, `pentix-server`, storage, or `session-replay` changes.
- Affected systems (teams/areas): the browser gameplay client (`apps/pentix-web`) only. The shared engine, server, and persistence are untouched; the demo remains purely local.
- Dependencies: none — no new runtime packages.
- Rollback plan: restore `DEFAULT_SETTINGS.startingLevel` to `1`, remove the `decreaseLevel` action and the `-`/`_` key mapping, revert `increaseLevel`/`decreaseLevel` to only mutate `settings.startingLevel`, and restore the `800 − 70 × (level − 1)`/120 ms interval constants and the `level 1` normalization in `getTickInterval`. Revert the corresponding test assertions in `tests/pentix-web.test.mjs`.