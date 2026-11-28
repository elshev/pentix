## 1. High-score row view

- [x] 1.1 Add `sessionId` to `HighScoreView` in `apps/pentix-server/src/high-scores.ts`.
- [x] 1.2 Return `sessionId` from `HighScoreService.list`, so `GET /v1/high-scores` carries it.
- [x] 1.3 Add `HighScoreService.find(sessionId)`, which reads the in-memory tables and returns the row view or `undefined` without a repository call.

## 2. Lifecycle read methods

- [x] 2.1 Add `PentixGameLifecycle.getSessionLog(sessionId)`, returning the retained `SessionActionLog` or `undefined`.
- [x] 2.2 Add `PentixGameLifecycle.getReplayedSession(sessionId)`, returning the retained `PentixGameSession` or `undefined`.
- [x] 2.3 Add `PentixGameLifecycle.listGameSessions(gameId)`, returning each retained session of that game with its log and user. It reads no repository.
- [x] 2.4 Reuse `PentixGameLifecycle.getGame(gameId)` for the stored game, and return `undefined` when the session or its game is absent.

## 3. Detail builder

- [x] 3.1 Add `apps/pentix-server/src/high-score-details.ts` with one builder that takes the lifecycle, the high-score service, a session id, and a session count.
- [x] 3.2 Filter `listGameSessions` to `game-over` sessions and order by score descending, then achievement date ascending, then session id ascending.
- [x] 3.3 Take the stored high-score row date when a row exists, and the UUIDv7 timestamp of the session id otherwise.
- [x] 3.4 Cap the list at the requested count and map each entry to `sessionId`, `userId`, `name`, `engineId`, `type`, `level`, `seedColumn`, `score`, `clearedLines`, `blocks`, `achievedAt`, and `actions`.
- [x] 3.5 Return the row values, the compact `statistics` and `game`, `gameId`, and `bestSessions` in one frozen object, or `undefined` when the row or its log is missing.
- [x] 3.6 Add `apps/pentix-server/src/compact-game.ts` with the row-major board line and the base64 piece id encoders.

## 4. API schemas

- [x] 4.1 Add `sessionId` to `HighScoreEntrySchema` in `apps/pentix-server/src/api/schemas.ts`.
- [x] 4.2 Add `HighScoreGameSchema` with a `0`/`1` `board` line and a base64 `pieceIds` string, and `HighScoreDetailStatisticsSchema` without `pieceCounts`.
- [x] 4.3 Add `HighScoreSessionSummarySchema` and `HighScoreDetailSchema`, with `type`, optional opening fields, and the `actions` array.
- [x] 4.4 Add `HighScoreDetailQuerySchema` with `bestSessionCount` default `9`, integer range `1` to `32`, and the message `High score session count must be an integer from 1 to 32.`

## 5. API route

- [x] 5.1 Add `getHighScoreDetailRoute` for `GET /v1/high-scores/{sessionId}` with the `High scores` tag, `idParams('High score session id')`, and the query schema.
- [x] 5.2 Document the `200`, `400`, and `404` responses with `HighScoreDetailSchema` and `ErrorResponseSchema`.
- [x] 5.3 Append the route to `PENTIX_ROUTE_CONFIGS` and its handler to `buildPentixRoutes`.
- [x] 5.4 Answer `404` with `High score session ${sessionId} was not found.` when the builder returns `undefined`.
- [x] 5.5 Return the detail body through `writeJson` with `200 OK`.

## 6. Server tests

- [x] 6.1 Assert that every high-score list entry carries `sessionId` and that an older body without it fails the schema.
- [x] 6.2 Assert the detail response for a finished demo game: row values, `statistics`, `game`, `gameId`, and `bestSessions`.
- [x] 6.3 Assert the same-game filter, the score and date order, the default count of `9`, and `bestSessionCount=3`.
- [x] 6.4 Assert that `actions`, `level`, `seedColumn`, and `type` match the stored log, and that AI entries drop `T` codes.
- [x] 6.5 Assert `400` for a non-UUIDv7 id and for `bestSessionCount` of `0`, `33`, and `1.5`.
- [x] 6.6 Assert `404` for an unknown row and for a row whose stored log is absent.
- [x] 6.7 Assert that a human session created with the returned `gameId` reports that game and its stored board, and a new session id.
- [x] 6.8 Assert that a detail read performs no repository write and leaves every stored row unchanged.
- [x] 6.9 Assert that the OpenAPI route set holds the new operation and that the document documents the parameter and the schemas.
- [x] 6.10 Validate the detail response with `HighScoreDetailSchema`.
- [x] 6.11 Assert that the compact board line and piece ids decode to the stored game, and that `statistics` carries no `pieceCounts`.

## 7. Documentation

- [x] 7.1 Update the high-score section of `README.md` with the detail operation and the replay path.
- [x] 7.2 Update the high-score section of `docs/foundation.md` with the lifecycle reads and the best-session ranking.
- [x] 7.3 Add the `High-score detail` term to `GLOSSARY.md` and point it at the detail operation.
- [x] 7.4 Run the STE linter on the changed specs and documents.

## 8. Validation

- [x] 8.1 Run `npm run build:core`, `npm run build:server`, and `npm run lint`.
- [x] 8.2 Run `npm test` and record that the core, server, and web suites pass.
- [x] 8.3 Run `openspec validate --change add-high-score-game-details`.
