## 1. Core action model

- [x] 1.1 Add `SessionAction` (`'T' | 'L' | 'R' | 'C' | 'A' | 'H'`) and the session action-log types to `pentix-core`
- [x] 1.2 Export the new types from `pentix-core` `index.ts`

## 2. Web client recording and soft-drop removal

- [x] 2.1 Remove the manual soft-drop control from the browser gameplay UI
- [ ] 2.2 Record `L`/`R`/`C`/`A`/`H` for player inputs and `T` for each gravity tick — DEFERRED: recording is done server-side (each endpoint is already an action)
- [ ] 2.3 Accumulate actions client-side keyed by the active piece — DEFERRED (same reason)

## 3. Flush and replay

- [ ] 3.1 Flush the action log after `SOME_CACHE_PIECE_COUNT` settled pieces or on session finish — DEFERRED: client-side flush needs a browser↔server session flow that does not exist yet
- [ ] 3.2 Add a server endpoint (e.g. `POST /game-sessions/{id}/actions`) to receive the log — NOT APPLICABLE: the server records its own actions
- [x] 3.3 Persist the log (piece ID + actions) via the session repository
- [x] 3.4 Implement replay that folds actions through `GameSessionEngine` to reconstruct the session

## 4. Tests

- [x] 4.1 Add a core test that the action alphabet mapping is complete and excludes soft drop
- [x] 4.2 Add a replay-determinism test (replay equals live-play state)
- [ ] 4.3 Add a flush-on-cache-full and flush-on-finish test — DEFERRED (see 3.1)
- [x] 4.4 Add a browser test that soft-drop is no longer mapped (recording is server-side, covered by server tests)
- [x] 4.5 Run `npm test` and `npm run lint` and keep them green

## 5. Docs

- [x] 5.1 Update README (action log / replay note) and the `browser-gameplay` spec delta