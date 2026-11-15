## 1. Core statistics contract

- [x] 1.1 Add `GameSessionActionCounts` (`moves`, `rotates`, `drops`) in `packages/pentix-core/src/session.ts` and extend `GameSessionStatistics` with `actions` and `pieceCounts: Readonly<Record<PieceKey, number>>`.
- [x] 1.2 Initialize a new session's statistics in `createPentixGameSession` with zeroed actions and a `0` entry for every key in `PIECE_CATALOG`.
- [x] 1.3 Export the new `GameSessionActionCounts` type from `packages/pentix-core/src/index.ts`.

## 2. Engine recording

- [x] 2.1 Add frozen, immutable recording helpers in `packages/pentix-core/src/session-engine.ts` for incrementing one action counter and for incrementing one piece count, reusing `withStatistics`.
- [x] 2.2 Record `actions.moves` in `GameSessionEngine.move` only when the move succeeds, leaving rejected moves and the input session untouched.
- [x] 2.3 Record `actions.rotates` in `GameSessionEngine.rotate` on both successful paths (in-place and kicked) and not on a blocked rotation.
- [x] 2.4 Record `actions.drops` in `GameSessionEngine.drop` on both the moving path and the immediate-settle path.
- [x] 2.5 Increment `pieceCounts[piece.key]` in `settle` for the locked piece while preserving the existing `actions` counters, score, level, lines, and blocks.
- [x] 2.6 Confirm `tick` records no action and that operations on a `'game-over'` session leave statistics unchanged.

## 3. Core tests

- [x] 3.1 Update the hand-built session `statistics` literals in `tests/pentix-core.test.mjs` (8 fixtures) to include zeroed `actions` and `pieceCounts` — preferably via one shared fixture helper.
- [x] 3.2 Add tests for `moves` (left+right aggregate), `rotates`, and `drops` counts on successful operations, and for no counting on blocked moves/rotations and gravity ticks.
- [x] 3.3 Add tests for per-piece counts: a fresh session has `0` for every catalog key, and a settle increments only the locked piece's key.
- [x] 3.4 Add a replay test asserting `replayPentixGameSession` reproduces the same `statistics.actions` and `statistics.pieceCounts` as live play.

## 4. Server contract

- [x] 4.1 Update the `statistics` `deepEqual` assertions and any session fixtures in `tests/pentix-server.test.mjs` for the new shape.
- [x] 4.2 Add an endpoint-level assertion that `POST /game-sessions/{id}/move` increments `statistics.actions.moves` and `POST /game-sessions/{id}/tick` leaves the counters unchanged.
- [x] 4.3 Run `npm run test:web` plus the core and server tests and confirm the replay/load path still reconstructs sessions.

## 5. Web reducer cleanup

- [x] 5.1 Remove `CollectedStats`, `createEmptyCollectedStats`, `attributeLockedPiece`, and the `collectedStats` field from `apps/pentix-web/src/engine/gameReducer.ts` and `GameState`.
- [x] 5.2 Remove the statistics updates from the `move`, `rotate`, and `drop` cases, the `applyAdvance` attribution, and the `startSession` reset.
- [x] 5.3 Update `apps/pentix-web/src/games/pentix/Game.tsx` to drop `collectedStats` and pass `session.statistics` to `SecondaryStats`.

## 6. Secondary statistics panel

- [x] 6.1 Change `SecondaryStats` to take `statistics: GameSessionStatistics` and render **Moves** (`actions.moves`), **Rotates** (`actions.rotates`), and **Drops** (`actions.drops`).
- [x] 6.2 Render per-piece counts from `statistics.pieceCounts` for every `PIECE_CATALOG` key, keeping the existing 5×5-mino three-row layout.
- [x] 6.3 Verify the panel now updates during the demo and shows zeros right after a player game or demo restart.

## 7. Web tests

- [x] 7.1 Replace `collectedStats` assertions in `tests/pentix-web.test.mjs` with `session.statistics.actions` assertions for moves, rotates, and drops.
- [x] 7.2 Rewrite the per-piece test to assert engine `statistics.pieceCounts` changes on settle instead of reducer attribution.
- [x] 7.3 Replace the "demo does not accumulate collected statistics" test with one asserting a demo move and settle increment the demo session's counters.
- [x] 7.4 Rewrite the reset test to assert a restarted/started game returns a session whose action and per-piece counters are all zero.

## 8. Verification

- [x] 8.1 Run `npm test` and fix any failures.
- [x] 8.2 Run `npm run lint` and `npm run build`.
- [x] 8.3 Run `npm run dev:web` and confirm the panel shows Moves/Rotates/Drops and per-piece counts for both a played game and the demo, still laid out below the MainStatistics panel.
