## Why

Action and per-piece statistics are collected in the browser reducer (`CollectedStats` in `apps/pentix-web/src/engine/gameReducer.ts`), scoped to `phase === 'playing'`, so the attract demo cannot collect statistics and the numbers are lost whenever the client state is rebuilt from a session snapshot. Statistics belong to the session, not to the UI: moving them into `pentix-core` makes every session — player or demo — record its own actions, keeps the shared snapshot the single source of truth, and lets replays reproduce the numbers for free.

## What Changes

- Extend the shared `GameSessionStatistics` snapshot with engine-owned counters: `actions` (`moves`, `rotates`, `drops`) and `pieceCounts` (one lock count for each of the 29 `PIECE_CATALOG` keys).
- **BREAKING (TypeScript contract only)**: `GameSessionStatistics` gains required `actions` and `pieceCounts` fields, so any code that builds a full statistics literal must supply them. The JSON snapshot stays additive for HTTP clients.
- Record `moves` in `GameSessionEngine.move` and `rotates` in `GameSessionEngine.rotate` when the operation actually changes the piece; record `drops` in `GameSessionEngine.drop` whether it moves the piece down or settles it immediately. Gravity `tick` is not an action and never counts.
- Increment `pieceCounts[pieceKey]` inside the engine's settle step for the piece that locks.
- Drop the UI-side `CollectedStats` state, `createEmptyCollectedStats`, and the `blocks`-delta piece attribution from the browser reducer; the reducer no longer owns statistics.
- Render the secondary statistics panel from `session.statistics`, showing **Moves** (left and right combined), **Rotates**, **Drops**, and the engine per-piece counts — the panel now updates during the demo as well.
- Keep the existing session-scoped reset semantics: starting a player game or a fresh demo session begins with zeroed counters, and a demo game-over still restarts into a clean demo session.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `gameplay-mechanics`: the engine records action counts on successful move/rotate/drop and per-piece lock counts on settle; the "statistics unchanged" wording for move and rotate narrows to the scoring fields, and a new requirement defines the engine-owned statistics.
- `game-session-start`: the opening statistics of a new session include zeroed action counters and a zero count for every catalog piece.
- `browser-gameplay`: the client stops collecting statistics and instead displays the engine-owned action and per-piece statistics, labelled by action (Moves/Rotates/Drops) rather than by pressed keys, in every phase including the demo.

## Impact

- **Affected code**: `packages/pentix-core/src/session.ts` (statistics shape and opening defaults), `packages/pentix-core/src/session-engine.ts` (recording in `move`/`rotate`/`drop`/`settle`), `packages/pentix-core/src/index.ts` (export the new statistics types), `apps/pentix-web/src/engine/gameReducer.ts` (remove `CollectedStats`, `collectedStats`, `attributeLockedPiece`, `createEmptyCollectedStats`), `apps/pentix-web/src/games/pentix/Game.tsx` and `SecondaryStats.tsx` (render engine statistics with action labels), and the core/server/web tests.
- **API**: the `PentixGameSession` JSON snapshot gains `statistics.actions` and `statistics.pieceCounts`; existing fields are unchanged, so REST consumers that ignore unknown fields are unaffected. `session-replay` gains no new storage: replaying `L`/`R`/`C`/`A`/`H` through the engine reproduces the same counters, which keeps the reconstructed session identical to live play.
- **Dependencies**: no new packages; `PIECE_CATALOG` is already exported by `pentix-core` and already imported by `session.ts`.
- **Affected teams**: shared-core owners (snapshot contract) and the frontend/game stream (reducer, HUD panel, tests). `PentixServer` handlers need no logic change; only their test fixtures/assertions must include the new statistics fields.
- **Rollback plan**: revert the `pentix-core` statistics extension plus the web reducer and panel changes; the browser returns to client-side `CollectedStats` collection and the snapshot contract returns to `score`/`level`/`clearedLines`/`blocks`. Because the feature is additive and confined to these files, rollback carries no data migration: session logs store only piece IDs and action codes, so persisted replays remain loadable either way.
