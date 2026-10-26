## Why

The current session API creates anonymous snapshots without a parent game or resumable server-side state, so it cannot support a meaningful next-piece flow. Separating game definitions from per-player sessions now establishes clear ownership and identity before more gameplay behavior is added.

## What Changes

- **BREAKING**: Introduce `PentixGame` with a UUIDv7 `id`, an initially empty `name`, a board, and `pieceIds` containing stable numeric IDs from `PIECE_CATALOG`.
- **BREAKING**: Rename `PentixGameSession.sessionId` to UUIDv7 `id`; add `gameId`, nullable `userId`, and a zero-based `nextPieceIndex` cursor. An unassigned user is represented by `null`, not an empty UUID.
- Add `POST /games` to initialize and return an independent game.
- Change session creation to `POST /game-sessions` with an optional `gameId`: an omitted, null, or empty value creates a game; a supplied value reuses that existing game.
- Add `POST /game-sessions/{id}/next-piece` to atomically advance the session cursor and return the next piece. `POST` is used instead of `GET` because this operation changes server-side state.
- Retain created games and sessions in process memory so later requests can resolve their IDs; durability across server restarts remains out of scope.
- **BREAKING**: Remove redundant legacy `bi*` piece keys. Use the existing values from `name` (for example, `3Corner`) as `key`, remove the duplicate `name` field and `LegacyPieceKey` terminology, and preserve numeric IDs, geometry, colors, and rotation behavior.
- Replace the request parser's hard-coded `http://localhost` base with a named internal constant. This is not a public server URL setting; host and port configuration already control the advertised URL.

## Capabilities

### New Capabilities

- `game-lifecycle`: creating and retaining `PentixGame` aggregates and advancing a session through a game's catalog piece sequence.

### Modified Capabilities

- `game-session-start`: sessions reference a new or existing game, use UUIDv7 identity and an unassigned-user representation, and remain available for subsequent piece requests.
- `shared-game-primitives`: piece keys use the former display-name values while numeric catalog IDs and all gameplay geometry remain stable.
- `pentix-server-bootstrap`: the supported API expands to game creation and next-piece advancement without adding players, durable history, or gameplay commands.

## Impact

- Affected code: `packages/pentix-core/src/{catalog,piece,board,session,index}.ts`, new game/session state and routing code in `apps/pentix-server`, repository documentation, and core/server tests.
- Affected APIs: `POST /games`, revised `POST /game-sessions`, and `POST /game-sessions/{id}/next-piece`; session JSON fields and piece-key values change.
- Dependencies: UUIDv7 generation requires either a maintained UUID library with v7 support or a deliberately tested generator; Node's existing `randomUUID()` call only supplies UUIDv4 and cannot remain.
- Compatibility: numeric piece IDs and legacy piece geometry remain compatible, but consumers of `sessionId`, `name`, `LegacyPieceKey`, or `bi*` keys must migrate.
- State: in-memory storage is intentionally ephemeral and is not a persistence or multi-process coordination guarantee.

## Affected Teams

- Backend/server development owns aggregate lifecycle, in-memory repositories, request validation, UUID generation, and endpoint semantics.
- Frontend/web development owns migration to the revised session contract and piece keys when API integration begins.
- Product/gameplay design owns the distinction between a game and a player session and the state-changing next-piece behavior.

## Rollback Plan

Remove the game repository, next-piece route, and new session fields, then restore the previous session-only initializer and UUIDv4 response. Restore the legacy piece-key union and duplicated names together so catalog, board, web, and test consumers remain consistent. Because all new state is in memory and no external client integration exists yet, rollback requires no data migration; restarting the server discards any games or sessions created under this change.
