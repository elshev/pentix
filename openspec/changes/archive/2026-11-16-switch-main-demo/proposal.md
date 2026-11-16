## Why

The demo rail beside the main board is currently a fixed comparison view: the second and third boards always run `delphi5` and `random`, the main board's attract demo still relies on a temporary hard-coded engine override, and nothing on the main board tells the player whose game is being shown. A player who sees an interesting small demo cannot bring it to the main board, and the main board does not identify itself as `Player01` or as a named demo engine.

## What Changes

- Keep the attract demo on the main board restarting itself after the existing post-game-over delay (`GAME_OVER_COOLDOWN_MS`, `700` ms) every time a demo session ends, with no player-facing overlay and no extra delay.
- **BREAKING** (behavioral): make `random` the main board's attract-demo engine permanently. Remove the temporary `DEMO_ENGINE_OVERRIDE` switch in `apps/pentix-web/src/engine/demo.ts` and store the main board's engine in game state (`mainEngineId`), initialized to `random` for the initial page load, every `start`/`restart`, and every automatic demo restart.
- Show a name on the main board: `Player01` while a player game runs (playing, paused, game over) and the active demo engine's display name (`Random`, `Delphi 5`) while the attract demo runs, including during the post-game-over demo delay.
- Double-click a small demo board to move it to the main board: the clicked board's session and engine become the main board's, and the main board's previous session and engine move into that small board's slot, so both boards keep playing. The swap applies while the main board shows the attract demo or its finished demo, and is ignored during a player game.
- Identify demo boards by their rail slot instead of by engine id, so a swapped-in engine keeps a stable board id (`demo-slot-1`, `demo-slot-2`) and the rail layout never reorders.
- Keep every existing board-set rule after a swap: all boards still share one `PentixGame` piece sequence, level changes still retune the live demo rail, demo-board steps are still addressed to one board and rejected when stale, and the swap never creates, resets, or persists a session.
- Fix the attract-demo deadlock found while testing: a resting demo piece whose planned steering step is blocked now locks through the shared engine instead of waiting forever on an unreachable placement, so every demo reaches its game over and the delayed restart actually runs.
- Align the gameplay area with the PENTIX header: the main board starts `4` px left of the header's left edge and the rail may extend `4` px past its right edge, with the overhang clipped instead of scrolled on narrow viewports.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities

- `demo-mode`: the main board's attract-demo engine is selected from the demo engine registry as `random` (no temporary override, no hard-coded selection hidden behind a constant), the engine in use is part of game state, and the demo still restarts itself after the same `700` ms delay once its session ends.
- `demo-boards`: demo boards are addressed by a stable rail-slot id, an engine travels with the session it plans, a double-click swaps the main board with a demo board (session and engine both ways), and level retuning, shared piece sequence, and per-board stepping keep working after a swap.
- `browser-gameplay`: the main board's HUD shows the name of whoever is playing — `Player01` for a player game and the demo engine's display name for the attract demo.

## Impact

- Affected code: `apps/pentix-web/src/engine/gameReducer.ts` (board-slot ids, `mainEngineId`, `mainBoardName`, new `swapBoard` action, deadlock-free demo stepping), `apps/pentix-web/src/engine/demo.ts` (drop the temporary engine override), `apps/pentix-web/src/games/pentix/useDemoController.ts` (engine from state), `apps/pentix-web/src/games/pentix/DemoBoard.tsx` (double-click handler), `apps/pentix-web/src/games/pentix/Game.tsx` (name wiring, swap dispatch), `apps/pentix-web/src/games/pentix/Hud.tsx` (name display), `apps/pentix-web/src/App.css` (name styling, demo-board affordance, header-aligned gameplay area), `tests/pentix-web.test.mjs`, and `README.md` (browser-client scope paragraph).
- Affected teams/areas: the browser gameplay client (`apps/pentix-web`) only. `packages/pentix-core`, `apps/pentix-server`, storage, session replay, and every HTTP endpoint are untouched; sessions stay local and unpersisted, so no API or schema change.
- Dependencies: none — no new packages; the swap reuses the existing reducer/session-snapshot pattern and the existing React hooks.
- Rollback plan: restore the engine-id board ids (`demo-<engineId>`) and the fixed `DEMO_BOARD_ENGINES` assignment, delete `mainEngineId` and the `swapBoard` action (reverting `Game.tsx`/`DemoBoard.tsx` to the previous props), restore the `delphi5` default selection with the temporary override in `demo.ts`, and remove the name element and its CSS. The demo restart after a demo game over and the `700` ms delay were already present and stay unchanged throughout.
