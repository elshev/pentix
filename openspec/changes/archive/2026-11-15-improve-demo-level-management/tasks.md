## 1. Level controls in the reducer

- [x] 1.1 In `apps/pentix-web/src/engine/gameReducer.ts`, change `DEFAULT_SETTINGS.startingLevel` from `1` to `9`.
- [x] 1.2 Add `{ type: 'decreaseLevel' }` to the `GameAction` union.
- [x] 1.3 Add a private `changeLevel(state, level)` helper that clamps the level with `clampLevel`, updates `settings.startingLevel`, and — when `state.phase === 'demo'` — also rewrites `session.statistics.level` via `applyStartingLevel`.
- [x] 1.4 Rewrite the `increaseLevel` case to call `changeLevel(state, state.settings.startingLevel + 1)` and add a `decreaseLevel` case calling `changeLevel(state, state.settings.startingLevel - 1)`.

## 2. Key mapping

- [x] 2.1 In `apps/pentix-web/src/engine/keyMap.ts`, add `case '-': case '_': return { type: 'decreaseLevel' }` alongside the existing `+`/`=` mapping.

## 3. Gravity interval

- [x] 3.1 In `apps/pentix-web/src/engine/gameLoop.ts`, replace `BASE_INTERVAL_MS`/`INTERVAL_STEP_MS`/`MIN_INTERVAL_MS` with the Delphi schedule: `BASE_INTERVAL_MS = 1000`, `LEVEL_STEP_MS = 100`, `MIN_INTERVAL_MS = 100`.
- [x] 3.2 Update `getTickInterval` to `Math.max(MIN_INTERVAL_MS, BASE_INTERVAL_MS - normalized * LEVEL_STEP_MS)` with `normalized = Number.isFinite(level) ? Math.trunc(level) : 0` (drop the old `max(1, …)` normalization so level 0 maps to 1000 ms).

## 4. Tests

- [x] 4.1 In `tests/pentix-web.test.mjs`, update the default-settings test to assert `settings.startingLevel === 9` (rename to reflect the new default).
- [x] 4.2 Update the `higher levels tick faster` interval test to assert the Delphi table: `getTickInterval(0) === 1000`, `getTickInterval(5) === 500`, `getTickInterval(9) === 100`, and `getTickInterval(20) === 100` (defensive floor).
- [x] 4.3 Extend the level-control reducer test to cover `decreaseLevel` and its clamping at `0`, and `increaseLevel` clamping at `9`.
- [x] 4.4 Add key-map tests asserting `mapKeyToAction('-', …)` and `mapKeyToAction('_', …)` return `{ type: 'decreaseLevel' }`, and `+`/`=` return `{ type: 'increaseLevel' }`.
- [x] 4.5 Add a reducer test asserting that `increaseLevel`/`decreaseLevel` during the `demo` phase immediately update `session.statistics.level` and only update `settings.startingLevel` outside the demo.

## 5. Verification

- [x] 5.1 Run `npm run lint` and `npm test`; fix any failures.
- [x] 5.2 Rebuild the web app (`npm run build:web` if present) and spot-check `npm run dev:web` to confirm the demo starts at level 9, `-`/`+` change the demo's speed live, and level 9 ticks noticeably faster than before.