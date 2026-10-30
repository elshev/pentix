## 1. Add Shared User Domain Model

- [ ] 1.1 Add a `User` interface and `createUser` factory (with `CreateUserOptions`) in `packages/pentix-core/src/user.ts` that trims and validates a non-empty `id` and `name` and returns a frozen snapshot.
- [ ] 1.2 Change `PentixGameSession.userId` to a required `string` and make `createPentixGameSession` accept a required `userId`, validating it is non-empty and storing it on the snapshot.
- [ ] 1.3 Export `User`, `createUser`, and `CreateUserOptions` from `packages/pentix-core/src/index.ts`.
- [ ] 1.4 Add core tests for user validation (empty id/name rejected) and for session creation requiring and storing a non-empty `userId`.

## 2. Implement Server User And Session APIs

- [ ] 2.1 Add a server-instance-scoped `users` map and `createUser`, `getUser`, and `listUsers` methods to the lifecycle service, with `createUser` rejecting duplicate names case-insensitively; avoid module-global state.
- [ ] 2.2 Add a JSON body helper to read a required non-empty user `name`, and extend session creation to require and validate `userId`, reusing the existing UUIDv7 validation and `400`/`404` error patterns.
- [ ] 2.3 Implement `POST /users` returning `201 Created` on success, `400 Bad Request` for invalid JSON, non-object bodies, or missing/empty/non-string names, and `409 Conflict` for a duplicate name.
- [ ] 2.4 Implement `GET /users` returning `200 OK` with `{ "users": [...] }`.
- [ ] 2.5 Implement `GET /users/{id}` returning `200 OK`, `400 Bad Request` for malformed ids, and `404 Not Found` for unknown well-formed ids.
- [ ] 2.6 Update `POST /game-sessions` to require a `userId` that references a retained user, returning `400` for a missing or malformed `userId` and `404` for an unknown user, and do not add a separate assignment route.
- [ ] 2.7 Update the server's `404` fallback message to list the new user endpoints.

## 3. Verify Contracts And Documentation

- [ ] 3.1 Add server integration tests for user create/list/get (including duplicate-name `409 Conflict`) and for session creation with a required `userId`, covering UUIDv7 identity, response shapes, validation and not-found behavior, and that sessions store the supplied `userId`.
- [ ] 3.2 Update README and foundation documentation to describe the `User` entity, the required-user session creation contract, the duplicate-name rule, and the ephemeral in-memory retention of users.
- [ ] 3.3 Run `npm run build`, `npm test`, and `npm run lint`, then resolve all regressions and verify no stale "Player and history endpoints are not implemented" references remain.
