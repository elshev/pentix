## Why

Storing a full session board snapshot after every action is wasteful and does not capture how a game was played. The goal is to recover and replay a session's user actions, so we should record the piece and the ordered actions applied to it rather than every intermediate state.

## What Changes

- Introduce a session action alphabet: `T` tick, `L` left, `R` right, `C` clockwise, `A` anticlockwise, `H` hard drop.
- Record each session as its piece ID plus the ordered action sequence instead of a full state snapshot.
- Reconstruct a session by replaying the recorded actions through the deterministic engine.
- Flush recorded actions to the server after `SOME_CACHE_PIECE_COUNT` pieces settle or when the session finishes.
- Remove soft drop from the game process (it is not part of the action model).
- Keep endpoints engine-agnostic: replay is a server concern behind the repository interface from `introduce-storage-repositories`.

## Capabilities

### New Capabilities

- `session-replay`: the action alphabet, action recording, deterministic replay, and flush semantics.

### Modified Capabilities

- `browser-gameplay`: remove the soft-drop control and record/flush each player action.

## Impact

- Code: `pentix-core` (action types), `pentix-server` (session log storage + replay), `pentix-web` (record actions, remove soft drop, flush).
- Tests: replay determinism, flush-on-finish, soft-drop removal.
- Specs: new `session-replay`, modified `browser-gameplay`.
- Affected teams: single-repo; core, server, and web.
- Rollback plan: the runtime `PentixGameSession` snapshot remains the playback contract; storing full snapshots instead of a log is a localized switch in the session repository.