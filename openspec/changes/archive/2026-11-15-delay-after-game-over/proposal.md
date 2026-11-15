## Why

When a player game ends, the game-over overlay appears at once and its "Play again" / "Demo" buttons — plus their `Enter` / `Space` hotkeys and the sidebar `Restart` button — are live immediately. A player who is still in the rhythm of play keeps pressing keys for the tick after the final lock, so a stray press instantly starts a new player game or the demo and wipes the final board the player wanted to look at.

## What Changes

- Add a short game-over input cooldown (`700` ms, under the 1 s ceiling): after a player game reaches `game-over`, `start`, `restart`, and `demo` requests are ignored until the cooldown elapses.
- Render the game-over overlay and the final board immediately, but disable the "Play again" and "Demo" buttons (dimmed, `disabled`) while the cooldown runs; enable them once it ends.
- Enforce the cooldown in the reducer, so keyboard hotkeys, the overlay buttons, and the sidebar `Restart` button are all covered by one rule, and expose the ready flag on `GameState` so the UI can reflect it.
- **NOT changed**: demo mode's automatic restart after a demo game over — a demo still chains immediately into the next demo session, with no overlay and no cooldown.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `browser-gameplay`: The game-over lifecycle gains a short input cooldown — the overlay and final board appear immediately, but "Play again" / "Demo" actions and their `Enter`/`Space` hotkeys only take effect after the delay.

## Impact

- Affected code: `apps/pentix-web/src/engine/gameReducer.ts` (cooldown constant, ready flag on `GameState`, guarded actions, new `gameOverCooldownElapsed` action), a new `apps/pentix-web/src/games/pentix/useGameOverCooldown.ts` hook, `apps/pentix-web/src/games/pentix/Game.tsx` (cooldown hook + disabled overlay buttons), `apps/pentix-web/src/App.css` (disabled overlay button styling), and `tests/pentix-web.test.mjs`.
- Affected teams/areas: the browser gameplay client (`apps/pentix-web`) only. `pentix-core`, `pentix-server`, storage, and `session-replay` are untouched, and no HTTP API changes.
- Dependencies: none — no new packages; the cooldown reuses the existing `window.setTimeout`-in-a-hook pattern already used by `useGameLoop` and `useDemoController`.
- Rollback plan: delete the `gameOverReady` flag, the `gameOverCooldownElapsed` action, and the reducer guard (so `start`/`restart`/`demo` apply in every phase again), remove `useGameOverCooldown` and the `disabled` attribute from the overlay buttons, revert the `.overlay__button:disabled` CSS rule, and drop the new reducer tests from `tests/pentix-web.test.mjs`.
