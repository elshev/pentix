## 1. Shared Session Snapshot

- [x] 1.1 Define serializable `PentixGameSession` snapshot types in `packages/pentix-core`, including board state, opening statistics, active piece state, and next-piece preview.
- [x] 1.2 Implement a shared session-start initializer that creates the default empty board, zeroed opening statistics, centered spawn origin, and opening active/next pieces.
- [x] 1.3 Add core tests that verify default board dimensions, empty-board startup, opening statistics, spawn origin, and shared-catalog piece membership.

## 2. PentixServer Session Start API

- [x] 2.1 Add `POST /game-sessions` to `apps/pentix-server` and wire it to the shared session-start initializer.
- [x] 2.2 Return `201 Created` with a JSON session snapshot and a fresh opaque session identifier for each successful request.
- [x] 2.3 Add server tests that verify the route exists, returns the expected session snapshot shape, and produces distinct sessions across repeated requests.

## 3. Documentation And Verification

- [x] 3.1 Update repository/server documentation to describe `POST /game-sessions` as the first supported PentixServer endpoint and to clarify that persistence, movement, and history remain out of scope.
- [x] 3.2 Run the repository build and test commands to confirm the new session-start flow works end to end without regressing the existing bootstrap behavior.
