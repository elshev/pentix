## 1. Add Shared Gameplay Engine

- [x] 1.1 Add `packages/pentix-core/src/engine.ts` with placement helpers that compute an active piece's occupied cells from its `key`/`angle`/`origin` and check bounds and buried-cell collisions.
- [x] 1.2 Implement `moveActivePiece(session, direction)` shifting the active piece one column left or right and returning an unchanged session when the move is blocked.
- [x] 1.3 Implement `rotateActivePiece(session, direction)` applying the Delphi rotation step and near-wall kicks (right/left/top) before falling back to no change.
- [x] 1.4 Implement locking and line clearing: bury the active piece into the board, remove full rows, and shift rows above down.
- [x] 1.5 Implement scoring per `Demo/Pentix/Main.pas`: lock score `points × level`, drop score `points × (height − row) × level ÷ 10`, line score `lineIndex × (10 + (height − row)) × level`, and the `1000`-point empty-field bonus.
- [x] 1.6 Add `blocks` to `GameSessionStatistics` and implement level progression: `+1` every `30` locked pieces, up to a maximum of `9`.
- [x] 1.7 Implement spawn: promote the preview to the active piece at row `1`/`floor(width/2)`, advance `nextPieceIndex`, extend the game sequence, and detect a blocked spawn as game over.
- [x] 1.8 Implement `tickSession(session, game, selectPieceId?)` (move down or settle) and `dropSession(session, game, selectPieceId?)` (score and move to the lowest position WITHOUT locking).
- [x] 1.9 Extend `GameSessionStatus` to `'active' | 'game-over'` and make move/rotate/tick/drop return a `'game-over'` session unchanged.
- [x] 1.10 Export the engine functions, the extended status type, and the extended statistics from `packages/pentix-core/src/index.ts`.
- [x] 1.11 Add core tests for movement, rotation and wall kicks, locking, line clearing, drop-without-lock, scoring, level progression, spawn, and game-over.

## 2. Implement Server Gameplay APIs

- [x] 2.1 Add lifecycle methods that resolve a session and its game, run the engine function, and persist the updated game/session snapshots.
- [x] 2.2 Add JSON body helpers to validate the `direction` field for move (`left`/`right`) and rotate (`clockwise`/`counterclockwise`), reusing the existing `400`/`404` patterns.
- [x] 2.3 Implement `POST /game-sessions/{id}/move` returning `200`, `400` for a malformed/missing direction, and `404` for an unknown session.
- [x] 2.4 Implement `POST /game-sessions/{id}/rotate` returning `200`, `400` for a malformed/missing direction, and `404` for an unknown session.
- [x] 2.5 Implement `POST /game-sessions/{id}/tick` returning `200` or `404`.
- [x] 2.6 Implement `POST /game-sessions/{id}/drop` returning `200` or `404`.
- [x] 2.7 Update the server's `404` fallback message to list the new gameplay endpoints.

## 3. Verify Contracts And Documentation

- [x] 3.1 Add server integration tests for move/rotate/tick/drop covering response shapes, validation, not-found, scoring and line-clear/level progression, the drop-then-lock grace, and `game-over` status.
- [x] 3.2 Update README and foundation documentation to describe the gameplay endpoints, the Delphi scoring and level rules, the drop-then-lock grace, and the `game-over` status.
- [x] 3.3 Run `npm run build`, `npm test`, and `npm run lint`, then resolve regressions and verify no stale "does not provide gameplay move, tick, or line-clear" references remain.
