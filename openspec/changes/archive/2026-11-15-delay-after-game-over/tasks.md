## 1. Reducer cooldown state

- [x] 1.1 In `apps/pentix-web/src/engine/gameReducer.ts`, export `GAME_OVER_COOLDOWN_MS = 700` with a doc comment explaining that it shields the game-over screen from key presses still coming from active play.
- [x] 1.2 Add `readonly gameOverReady: boolean` to `GameState`; set it to `true` in `createInitialState` and in `startSession` so every fresh session (and `createInitialState`'s explicit phase overrides) starts actionable.
- [x] 1.3 Add `{ type: 'gameOverCooldownElapsed' }` to the `GameAction` union.
- [x] 1.4 In `applyAdvance`, when the returned session's status is `'game-over'` for a non-demo phase, return `phase: 'game-over'` together with `gameOverReady: false`; leave the earlier demo `startDemo` branch untouched.
- [x] 1.5 Guard the transition actions: `start`, `restart`, and `demo` return `state` unchanged while `state.phase === 'game-over' && !state.gameOverReady`.
- [x] 1.6 Add the `gameOverCooldownElapsed` case that sets `gameOverReady: true` only when `phase === 'game-over'` and it is currently `false`; otherwise return the state unchanged.

## 2. Cooldown timer

- [x] 2.1 Create `apps/pentix-web/src/games/pentix/useGameOverCooldown.ts` exporting `useGameOverCooldown(active: boolean, dispatch: Dispatch<GameAction>)`, which arms one `window.setTimeout` of `GAME_OVER_COOLDOWN_MS` that dispatches `{ type: 'gameOverCooldownElapsed' }` and clears the timeout on deactivation/unmount, following the hook style of `useDemoController.ts`.
- [x] 2.2 In `apps/pentix-web/src/games/pentix/Game.tsx`, read `gameOverReady` from the reducer state and call `useGameOverCooldown(phase === 'game-over' && !gameOverReady, dispatch)`.

## 3. Game-over overlay

- [x] 3.1 In `Game.tsx`, pass `disabled={!gameOverReady}` to the "Play again" and "Demo" buttons, keeping their `title` tooltips (`Play again (Enter)`, `Demo (Space)`).
- [x] 3.2 In `apps/pentix-web/src/App.css`, add an `.overlay__button:disabled` rule (reduced opacity, `cursor: not-allowed`, no hover brightening) next to the existing `.overlay__button` rules so the buttons read as temporarily inert.

## 4. Tests

- [x] 4.1 In `tests/pentix-web.test.mjs`, add a test that a game-over state with `gameOverReady: false` ignores `start`, `restart`, and `demo` — the state is returned unchanged and the final session/board is preserved.
- [x] 4.2 Add a test that `gameOverCooldownElapsed` sets `gameOverReady` to `true` in the game-over phase, that `restart` then enters `playing` with a fresh session, and that `demo` then enters the demo phase.
- [x] 4.3 Add a test that a `tick` which ends a player game (`session.status` patched to `'game-over'`) enters the game-over phase with `gameOverReady: false`.
- [x] 4.4 Add a test that a demo game over still restarts immediately (`phase: 'demo'`, fresh session) and keeps `gameOverReady` true, proving the cooldown never touches the attract loop.
- [x] 4.5 Add a test that feeds `mapKeyToAction(' ', 'game-over')` and `mapKeyToAction('Enter', 'game-over')` into a cooling-down game-over state and asserts both leave the state unchanged, while the existing key-map assertions stay valid.

## 5. Verification

- [x] 5.1 Run `npm run lint` and fix any findings.
- [x] 5.2 Run `npm run test:web` (or `npm test`) and confirm the new reducer tests pass alongside the existing suite.
- [x] 5.3 Run `npm run build:web` to confirm the hook and JSX changes compile under the strict TypeScript config.
- [x] 5.4 Spot-check `npm run dev:web`: mash keys the moment a player game ends, confirm the board is preserved, the overlay buttons enable after ~0.7 s, and a demo game over still loops instantly. (Automated here: the dev server served `/` and the transformed `useGameOverCooldown.ts` with HTTP 200, and the 700 ms gate is covered by the reducer tests; the visual key-mashing pass is left for a manual check.)
