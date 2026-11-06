## 1. Introduce the GameSessionEngine

- [x] 1.1 Rename `packages/pentix-core/src/engine.ts` to `session-engine.ts` and wrap the four gameplay operations into a stateless `GameSessionEngine` class as `move`, `rotate`, `tick`, and `drop` (from `moveActivePiece`, `rotateActivePiece`, `tickSession`, `dropSession`).
- [x] 1.2 Keep the internal helpers and the `MoveDirection`/`RotateDirection` types in `session-engine.ts` alongside the class.
- [x] 1.3 Update `packages/pentix-core/src/index.ts` to export `GameSessionEngine`, a shared `gameSessionEngine` instance, and the direction types, removing the four old free-function exports.

## 2. Split http.ts Into Primitives And A Request Module

- [x] 2.1 Trim `apps/pentix-server/src/http.ts` down to `HttpError`, `HttpStatus`, and `throwHttpErrorIf`, dropping its `uuid` import.
- [x] 2.2 Create `apps/pentix-server/src/request.ts` exporting `isJsonRecord`, `isUuidV7`, `checkUuid`, `readOptionalName`, `readOptionalGameId`, `readDirection`, `readRequiredName`, and `readRequiredUserId`.
- [x] 2.3 Update `apps/pentix-server/src/app.ts` to import the parsers from `./request.js` and `HttpError`/`HttpStatus` from `./http.js`.

## 3. Update Consumers To The New Names

- [x] 3.1 Update `apps/pentix-server/src/server.ts` to call `gameSessionEngine.move/rotate/tick/drop` and rename `PentixGameLifecycle` methods `moveSession`/`rotateSession`/`tickSession`/`dropSession` to `move`/`rotate`/`tick`/`drop`.
- [x] 3.2 Update `apps/pentix-server/src/app.ts` to call the renamed `PentixGameLifecycle` methods.
- [x] 3.3 Update `tests/pentix-core.test.mjs` imports and calls for the renamed engine API.

## 4. Verify

- [x] 4.1 Run `npm run build`, `npm test`, and `npm run lint` and resolve all regressions; the existing server integration tests must pass unchanged.
- [x] 4.2 Update `docs/foundation.md` to reflect the new `session-engine.ts` and `request.ts` module layout.
