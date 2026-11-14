## Why

The original Delphi client ran an attract/demo mode whenever no real game was active: on first open the board played itself, and after a game over the frozen board stayed visible until the player pressed a key, which then re-entered the demo. The rebuilt browser client currently sits behind a static "Ready" overlay and, on game over, covers the final board with a blocking card. This change restores that classic, self-demonstrating behavior so the game shows motion on load and preserves the player's final board for inspection.

## What Changes

- Introduce a new `demo` game phase (attract mode) alongside the existing `playing`, `paused`, and `game-over` phases; the initial `ready` phase is replaced by `demo`.
- Start demo mode automatically on first load, auto-playing a local session by imitating player actions.
- Add a shared demo destination planner in `pentix-core` that ports the Delphi `CalcDemoDest` heuristic: for the active piece it scans every valid rotation angle × column, drops each to the lowest reachable row, and scores `row + (holesBefore − holesAfter) × 1.5 + fullLines²` with the Delphi tie-breaks, returning the best angle/column.
- Add a demo steering step that ports the Delphi `TimerExpired` demo branch: rotate toward the destination angle, then move left/right toward the destination column, then hard drop once aligned.
- Auto-restart the demo with a fresh session whenever a demo session reaches game-over (continuous attract loop).
- On a real game over, freeze the board so the last state stays visible (do not draw the failed spawn piece) and show a non-blocking game-over indicator; pressing `Space` re-enters demo mode while `Enter`/a "Play again" button starts a new player game.
- **BREAKING**: `GamePhase` gains `demo` and drops `ready`; the browser's game-over presentation changes from a blocking overlay to a board-preserving overlay. This is client behavior only — no server, storage, or replay contract changes.

## Capabilities

### New Capabilities

- `demo-mode`: Defines demo (attract) auto-play — when it starts, how it imitates player actions (destination planning + steering), how it restarts itself, and how the player transitions between demo, playing, and game-over.

### Modified Capabilities

- `browser-gameplay`: The lifecycle requirement changes from `ready / playing / paused / game-over` to `demo / playing / paused / game-over`, and the game-over requirement changes to preserve the final board (no failed spawn rendering) with `Space` entering the demo.

## Impact

- Affected code: `packages/pentix-core` (new demo planner + exports), `apps/pentix-web` (reducer phases/actions, game loop/demo controller, key map, `Game`/`BoardView` presentation), and `tests/pentix-core.test.mjs` + `tests/pentix-web.test.mjs`.
- Affected systems (teams/areas): the shared engine surface in `pentix-core` (additive export, no behavior change to existing engine operations) and the `pentix-web` gameplay client. No server (`pentix-server`), storage, or `session-replay` changes; the demo runs a purely local, non-persisted session and records no replay actions.
- Dependencies: none — no new runtime packages.
- Rollback plan: restore the `ready` initial phase (revert the `createInitialState` default and `GamePhase`/`keyMap`/reducer changes), delete the new `demo.ts` modules and their exports, and restore the blocking game-over overlay; `add-demo-mode` is otherwise additive and can be reverted without touching the server or shared engine operations.