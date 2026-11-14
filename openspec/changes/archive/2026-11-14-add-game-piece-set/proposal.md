## Why

The engine currently creates every `PentixGame` by drawing pieces from the whole 29-piece catalog; there is no way to produce a game with a different piece set (for example, the 4-mino set used by Tetris) without changing the engine. We want the engine to support both Pentix and Tetris presets internally, without complicating the public API or the HTTP surface.

## What Changes

- Add an available-piece set to `PentixGame` (stable numeric catalog IDs) and draw its sequence from that set.
- Add a private, non-exported engine factory that builds a game from an arbitrary board size and piece set.
- Expose two public presets that call it: `createPentixGame` (full catalog, Pentix board) and `createTetrisGame` (4-mino set, Tetris board).
- Leave `POST /games` and the browser "start a new game" flow unchanged: they always start a Pentix game.

## Capabilities

### New Capabilities

- `game-piece-set`: the available-piece selection with fixed Pentix/Tetris presets, keeping arbitrary board-size/piece-set construction private.

### Modified Capabilities

- `game-lifecycle`: `PentixGame` gains an available-piece set, and its sequence is drawn from that set.

## Impact

- Code: `packages/pentix-core/src/game.ts` (private builder, public presets, sequence drawn from the set).
- Tests: `tests/pentix-core.test.mjs`.
- Specs: new `game-piece-set`, modified `game-lifecycle`.
- Affected teams: single-repo; `pentix-core` only — no server or HTTP API changes.
- Rollback plan: preset factories and the set field are engine-internal and additive; no client or data-migration surface.