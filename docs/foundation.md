# Pentix Foundation Change

This repository now uses an `apps/` and `packages/` layout so the browser client and `PentixServer` can share common game-domain code instead of duplicating it.

## What Exists Today

- `apps/pentix-web`: a lightweight browser placeholder
- `apps/pentix-server`: a Node.js server with user management, game creation, session start, next-piece, and gameplay (move/rotate/tick/drop) endpoints
- `packages/pentix-core`: shared user, piece, board, game, game-session, and gameplay-engine primitives

## HTTP Transport

`PentixServer` serves its REST endpoints through a Hono application mounted on a Node.js HTTP server via `@hono/node-server`. Routing, JSON body parsing (with a 1 MiB limit), JSON responses (`application/json; charset=utf-8`), the not-found fallback, and the centralized error handler live in `apps/pentix-server/src/app.ts`, while the in-memory lifecycle and process start/stop remain in `server.ts`.

## Shared Piece Model

The shared piece model intentionally uses readable TypeScript names:

- `Offset` instead of Delphi `Ofs`
- `RotationMode` values `none`, `half`, and `full` instead of Delphi `TBlockRotates`
- `Piece` instead of Delphi `TBlock`
- catalog `key` values such as `3Corner` instead of duplicate `bi3Corner`/`3Corner` identities

The piece catalog is ported directly from the legacy Delphi source at [Tetris.pas](C:/ai/pentix/delphi/Tetris.pas). Numeric piece IDs, colors, rotation behavior, and occupied offsets remain compatible with that source.

## 5Corner Decision

The Delphi `5Corner` definition does not contain an occupied `(0, 0)` mino. The new code keeps that exact geometry instead of normalizing it, because this foundation change prioritizes legacy parity over reinterpretation.

That means:

- most pieces occupy `(0, 0)` directly
- `5Corner` rotates around the origin even though the origin itself is empty

## User Model

`User` is a JSON-serializable shared primitive with a UUIDv7 `id` and a required non-empty `name`. `PentixServer` exposes `POST /users` (create, rejecting a duplicate name case-insensitively with `409 Conflict`), `GET /users` (list), and `GET /users/{id}` (fetch). Users are retained only in the owning server process and are lost on restart.

## Game And Session Lifecycle

`POST /users` creates a `User` with UUIDv7 identity and a required non-empty `name`, rejecting duplicate names case-insensitively. `POST /games` creates a `PentixGame` with UUIDv7 identity, an optional name, an empty board, and a server-owned sequence of catalog piece IDs. `POST /game-sessions` creates a session either with a new game or with a retained game selected by `gameId`, and always for a retained user selected by the required `userId`. Sessions use UUIDv7 `id`, `gameId`, `userId`, and `nextPieceIndex`; the old `sessionId` field is gone.

`POST /game-sessions/{id}/next-piece` is intentionally a state-changing `POST`. It promotes the previous preview, extends the game's piece sequence on demand, advances the cursor, and returns the full updated session. Games, sessions, and users live only in the owning server process and are lost on restart.

## Gameplay

The shared engine ports the Delphi playfield rules from [Tetris.pas](C:/ai/pentix/delphi/Tetris.pas) and the scoring from [Demo/Pentix/Main.pas](C:/ai/pentix/delphi/Demo/Pentix/Main.pas):

- `move` and `rotate` (with near-wall kicks) only change the active piece when the target placement is valid.
- `tick` steps gravity; a resting piece locks, clears full lines, scores, and spawns the next piece.
- `drop` moves the piece to its lowest position without locking; the next `tick` locks it (the Delphi `toMoveAfterDropDown` grace).
- Scoring: a lock scores `points × level`, a drop scores `points × (height − row) × level ÷ 10`, a cleared line scores `lineIndex × (10 + (height − row)) × level`, plus a `1000`-point empty-field bonus. Level rises every 30 locked pieces up to level 9.

A session's `status` becomes `game-over` when a spawn is blocked.

## Next Likely Steps

- add durable persistence and PentixGame history models
- introduce browser gameplay state and rendering
- connect the web app to `PentixServer`
