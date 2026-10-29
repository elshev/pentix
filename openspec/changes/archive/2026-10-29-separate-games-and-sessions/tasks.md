## 1. Simplify Shared Piece Identity

- [x] 1.1 Replace `LegacyPieceKey` and `bi*` values with `PieceKey` values from the existing catalog names, remove the duplicate definition/class `name` fields, and preserve every numeric ID and geometry value.
- [x] 1.2 Update catalog lookups, board-cell key types, package exports, web preview rendering, and core fixtures to use the simplified `key` contract.
- [x] 1.3 Extend core tests to verify all 29 numeric IDs and keys are unique, legacy `bi*` keys and `name` are absent, and existing offsets and rotation behavior remain unchanged.

## 2. Add Game And Session Domain Models

- [x] 2.1 Add a serializable `PentixGame` model and initializer with caller-supplied identity, default/custom name, empty board snapshot, and an injectable piece-ID selector that initializes at least two valid sequence entries.
- [x] 2.2 Revise `PentixGameSession` initialization to accept a parent game and expose `id`, `gameId`, `userId: null`, `nextPieceIndex: 1`, independent board state, and active/preview pieces from sequence indexes 0 and 1.
- [x] 2.3 Add shared lifecycle helpers that promote the preview, extend the game sequence on demand, advance the cursor, reset active rotation/spawn state, and preserve unrelated session fields.
- [x] 2.4 Add core tests for game defaults, session/game association, independent boards, sequence extension, repeated advancement, and multiple sessions sharing one game's sequence without sharing cursors.

## 3. Implement Server Lifecycle APIs

- [x] 3.1 Add the maintained `uuid` dependency and use its v7 generator for server-created game and session IDs, with injectable generators/selectors for deterministic tests.
- [x] 3.2 Add a server-instance-scoped in-memory lifecycle service for games and sessions; avoid module-global state and document that restart clears all retained data.
- [x] 3.3 Add JSON body/error helpers, request validation, and a named `REQUEST_URL_BASE` constant while preserving existing host and port settings.
- [x] 3.4 Implement `POST /games` with optional name handling and `201 Created` JSON responses.
- [x] 3.5 Implement revised `POST /game-sessions` body handling for absent/empty versus supplied `gameId`, including new-game creation, existing-game reuse, `400` validation errors, and `404` unknown-game errors.
- [x] 3.6 Implement `POST /game-sessions/{id}/next-piece` with retained-state advancement, updated session snapshots, and malformed/unknown session error handling.

## 4. Verify Contracts And Documentation

- [x] 4.1 Add server integration tests for all three routes, UUIDv7 version/variant bits, response shapes, independent server instances, piece progression, and validation/not-found behavior.
- [x] 4.2 Update README and relevant foundation documentation with the revised piece identity, game/session relationship, endpoint contracts, and explicit ephemeral-storage and non-idempotent next-piece limitations.
- [x] 4.3 Run `npm run build`, `npm test`, and `npm run lint`, then resolve all regressions and verify no legacy `bi*`, `LegacyPieceKey`, `sessionId`, or catalog `name` consumers remain.
