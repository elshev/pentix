## Why

Sessions can start and advance a piece preview, but they cannot actually be played: pieces cannot move, rotate, lock, or clear lines, and no score or level ever accumulates. Adding the core gameplay mechanics now turns the retained session into a playable game and unblocks the browser client.

## What Changes

- Add a shared gameplay engine in `pentix-core` with pure functions for moving the active piece left/right, rotating it (with Delphi near-wall kicks), stepping gravity (tick), hard dropping, locking into the board, clearing full lines, scoring and leveling, spawning the next piece, and reaching game over.
- **BREAKING**: Extend `PentixGameSession.status` from `'active'` to `'active' | 'game-over'` and add a locked-block count (`blocks`) to session statistics for level progression.
- Preserve the Delphi movement, rotation, collision, spawn-origin, and line-clearing semantics from `delphi/Tetris.pas`, expressed with the shared `Piece`/`Board` primitives.
- Port the Delphi `Demo/Pentix/Main.pas` scoring rules: a lock scores `points × level`, a drop scores `points × (height − row) × level ÷ 10`, each cleared line scores `lineIndex × (10 + (height − row)) × level`, and emptying the field awards a `1000`-point bonus; level increases every `30` locked pieces up to a maximum of `9`.
- Add server endpoints `POST /game-sessions/{id}/move`, `POST /game-sessions/{id}/rotate`, `POST /game-sessions/{id}/tick`, and `POST /game-sessions/{id}/drop`, each returning the complete updated session snapshot.
- Keep `POST /game-sessions/{id}/next-piece` as-is for bootstrap compatibility; real play flows through tick/drop.
- A drop moves the piece to its lowest position without locking it; the piece locks on the following tick, giving the player one tick to move or rotate.

## Capabilities

### New Capabilities

- `gameplay-mechanics`: The shared gameplay engine and its movement, rotation, tick, drop, locking, line-clearing, scoring, spawning, and game-over rules.

### Modified Capabilities

- `game-session-start`: The session snapshot's `status` now supports `'game-over'` and its statistics gain a locked-block count for level progression.
- `pentix-server-bootstrap`: The documented endpoint list and the "narrow increment" boundary expand to include gameplay move/rotate/tick/drop endpoints.

## Impact

- Affected code: a new `packages/pentix-core/src/engine.ts` and its exports, a `status` union extension in `session.ts`, gameplay routes and validation in `apps/pentix-server`, and core/server tests plus README/foundation documentation.
- Affected APIs: new `POST /game-sessions/{id}/move`, `/rotate`, `/tick`, and `/drop` endpoints; existing game/session/user endpoints are unchanged.
- Dependencies: none beyond the existing shared piece/board primitives and the `uuid` generator.
- Compatibility: **BREAKING** — `PentixGameSession.status` may now be `'game-over'` and `statistics` gains a `blocks` field; consumers of those fields must handle the new values. Board and piece fields are unchanged in shape.
- State: gameplay state remains in process memory and is lost on restart, matching games, sessions, and users.

## Affected Teams

- Backend/server development owns the engine functions, gameplay routes, validation, and scoring/level semantics.
- Frontend/web development owns consuming the gameplay endpoints and the `game-over` status when API integration begins.
- Product/gameplay design owns fidelity of the scoring, level progression, and drop-then-lock behavior to the Delphi `Demo/Pentix` rules.

## Rollback Plan

Remove the engine module and gameplay routes, restore `GameSessionStatus` to `'active'`, and revert the server endpoint list and boundary wording. Because gameplay state is in memory only and no client integration exists yet, rollback requires no data migration; restarting the server discards any in-progress games.
