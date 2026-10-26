## Why

The repository now has shared board and piece primitives plus a runnable `PentixServer`, but there is still no way to create an actual `PentixGameSession`. Adding a first "start session" flow now gives both the server and the browser a concrete contract for the initial playable state before movement, ticking, scoring, or persistence work begins.

## What Changes

- Add the first `PentixGameSession` start capability so a caller can request a new single-player session and receive its initialized state.
- Define the shared session-start domain contract in `pentix-core`, including session identity, board snapshot, opening statistics, and initial piece state that both the server and browser can understand.
- Add a PentixServer REST endpoint that starts a session and returns the initialized session payload as JSON.
- Establish the initialization rules for the first server-owned session snapshot, including default board dimensions, empty-board startup, default score/level values, and how the opening active/next pieces are chosen.
- Add focused tests and documentation for the new session-start behavior while explicitly keeping move execution, ticking, persistence, and history out of scope.

## Capabilities

### New Capabilities

- `game-session-start`: starting a new `PentixGameSession`, including the shared session snapshot contract and the server API that creates and returns it.

### Modified Capabilities

- `pentix-server-bootstrap`: the server stops being completely empty and instead exposes one supported gameplay bootstrap endpoint for starting a session while continuing to omit player management, history, and broader game-management APIs.

## Impact

- Affected code: `packages/pentix-core`, `apps/pentix-server`, repository docs, and server/core tests.
- Affected APIs: new REST session-start endpoint and new shared TypeScript session snapshot types.
- Affected systems: the browser app can begin integrating against a stable server-owned session payload instead of only static piece/catalog demos.
- Dependencies: likely no new runtime dependencies if the existing Node.js HTTP server remains sufficient.
- Breaking change: `pentix-server-bootstrap` no longer describes a fully empty server increment; it becomes the minimal host for one supported session-start API.

## Affected Teams

- Backend/server development: owns the first gameplay-facing API and the rules used to initialize sessions.
- Frontend/web development: receives the first concrete session payload contract to integrate against.
- Product and gameplay design: locks the initial session shape and opening defaults that later move/tick rules will build on.

## Rollback Plan

If the first session-start increment proves premature, we can remove the new session endpoint and shared session types, then return the server to its prior bootstrap-only behavior. Because this change does not yet introduce persistence, history, or move-processing workflows, rollback remains limited to API shape, shared models, and tests.
