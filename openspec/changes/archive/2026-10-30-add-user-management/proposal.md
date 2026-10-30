## Why

Every session currently starts with `userId: null`, and there is no way to create or look up a user, so the server cannot attribute a session to a real user. Adding user management and requiring a user when a session starts establishes user identity now, before gameplay and history features need to record who played.

## What Changes

- Add a JSON-serializable `User` domain entity in `pentix-core` with a UUIDv7 `id` and a required non-empty `name`.
- Add `POST /users` to create and retain a user, returning `201 Created`; reject a duplicate name with `409 Conflict`.
- Add `GET /users` to list retained users, returning `200 OK`.
- Add `GET /users/{id}` to fetch one retained user, returning `200 OK`, `404 Not Found`, or `400 Bad Request`.
- **BREAKING**: Require a `userId` on `POST /game-sessions` that references a retained `User`, so every new session is created for an assigned user.
- Extend the server-scoped in-memory lifecycle to retain users alongside games and sessions.
- Change `PentixGameSession.userId` from `string | null` to a required `string` holding the assigned user's id. No other session field is renamed or removed.

## Capabilities

### New Capabilities

- `user-management`: The `User` domain entity and the create, list, and get user endpoints.

### Modified Capabilities

- `game-session-start`: Starting a session now requires a `userId` that references a retained user, and the shared snapshot exposes a non-null `userId`.
- `pentix-server-bootstrap`: The documented endpoint list and the "narrow increment" boundary expand to include user management endpoints, and session creation now requires a user.

## Impact

- Affected code: a new `packages/pentix-core/src/user.ts` and its exports, a required `userId` in the shared session factory, and user repository/route logic in `apps/pentix-server`; README and foundation documentation.
- Affected APIs: new `POST /users`, `GET /users`, and `GET /users/{id}`; `POST /game-sessions` now requires a `userId`.
- Dependencies: none beyond the existing `uuid` v7 generator and in-memory storage patterns.
- Compatibility: **BREAKING** — `PentixGameSession.userId` becomes a required `string` and `POST /game-sessions` callers must supply a valid user id; other game/session fields are unchanged.
- State: users are retained only in process memory and are lost on restart, matching the existing ephemeral behavior for games and sessions.

## Affected Teams

- Backend/server development owns the user entity, the in-memory user repository, request validation, and endpoint semantics.
- Frontend/web development owns consuming the user and required-user session contracts when API integration begins.
- Product/gameplay design owns user identity and the required-user session creation contract.

## Rollback Plan

Remove the user entity and user repository and route code, restore `PentixGameSession.userId` to `string | null`, and make `POST /game-sessions` accept an optional user again. Then restore the previous endpoint list and boundary wording in the server spec. Because users are in memory only and no external client integration exists yet, rollback requires no data migration; restarting the server discards any created users.
