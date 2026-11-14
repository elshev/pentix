# Pentix

Pentix is a modern TypeScript reboot of a legacy Delphi Pentix/Tetris project. The repository is being prepared for two applications that share the same game-domain code:

- `PentixServer`: the future backend responsible for users, Pentix games, and Pentix game history
- `Pentix` web browser application: the future client that will render boards, statistics, menus, and game flow in the browser

This implementation increment does not build the full game yet. It establishes the repository layout, adds narrow `PentixServer` game and session lifecycle endpoints, and shares the legacy piece, board, game, and session primitives across TypeScript code.

## Glossary

- `Mino`: one square of a piece
- `Piece`: a Pentix figure that contains from 1 to 5 minos
- `Board`: rectangular playfield
- `BoardCell`: one cell of the board
- `GameLevel`: difficulty level; higher level means higher speed
- `Tick`: unit of internal game time
- `PentixGame` (Game): a reusable playfield definition with a board of a defined size, a set of available pieces (each with an ID and a name), and a theoretically infinite sequence drawn from those pieces. In the future a game may restrict its pieces to a subset (for example, Tetris uses only 4-mino pieces).
- `PentixGameSession` (session): one play of a `PentixGame` by one `User`. Different users can play the same `PentixGame` in different places and at different times, each through their own session.
- `User`: a registered player with an Id and a Nick/Name; additional attributes (first name, surname, middle name, creation date, etc.) can be added in the future.
- `Next piece`: the piece after the current active piece, shown as a preview when the "show next piece" option is on; it is drawn from the engine once the current piece settles and is persisted (or cached for later persistence).

## Repository Layout

```text
apps/
  pentix-server/   Server with game/session lifecycle APIs
    src/storage/   Engine-agnostic repositories (in-memory and SQLite)
  pentix-web/      Browser application shell
packages/
  pentix-core/     Shared Pentix domain primitives
delphi/
  Tetris.pas       Legacy Delphi source used as the migration reference
docs/
  foundation.md    Notes about the current foundation change
```

## Current Foundation Scope

The codebase currently includes:

- a `PentixServer` implemented with Node.js and TypeScript, including user management, game creation, session start, next-piece, and gameplay (move/rotate/tick/drop) endpoints, persisting users, games, and sessions through engine-agnostic repositories
- a shared `pentix-core` package with:
  - `Piece`
  - `Offset`
  - Delphi-compatible rotation behavior
  - the full legacy piece catalog with stable numeric IDs and simplified keys
  - `Board` and `BoardCell`
  - serializable `User`, `PentixGame`, and `PentixGameSession` snapshots
  - a shared gameplay engine for movement, rotation, gravity ticks, hard drop, line clearing, scoring, and leveling
- a lightweight browser placeholder that imports the shared piece catalog

The following are intentionally not implemented yet:

- durable history endpoints
- a PostgreSQL repository implementation (the interfaces make it a later drop-in)
- multiplayer orchestration beyond sharing one game's piece sequence
- browser gameplay, scoring, ticks, and UI behavior from the final product goals

## Server API

- `POST /users` creates a `User` with a UUIDv7 `id` and a required non-empty `name`; a duplicate name (compared case-insensitively after trimming) is rejected with `409 Conflict`.
- `GET /users` lists retained users as `{ "users": [...] }`.
- `GET /users/{id}` returns a single retained user.
- `POST /games` initializes a `PentixGame` with a UUIDv7 ID, an optional name, an empty default board, and at least two catalog piece IDs.
- `POST /game-sessions` starts a `PentixGameSession` for a required `userId` that references a retained user. An omitted, null, or empty `gameId` creates a game; a supplied UUIDv7 reuses an existing game. Sessions use `id`, `gameId`, `userId`, and a zero-based `nextPieceIndex`.
- `POST /game-sessions/{id}/next-piece` promotes the preview to the active piece, advances the cursor, extends the parent game's piece sequence when needed, and returns the updated session.
- `POST /game-sessions/{id}/move` shifts the active piece left or right (`{ "direction": "left" | "right" }`).
- `POST /game-sessions/{id}/rotate` rotates the active piece with Delphi near-wall kicks (`{ "direction": "clockwise" | "counterclockwise" }`).
- `POST /game-sessions/{id}/tick` steps gravity; when the piece cannot move down it locks, clears lines, scores, levels, and spawns the next piece.
- `POST /game-sessions/{id}/drop` scores by fall distance and moves the piece to its lowest position without locking; the following tick locks it.

Scoring follows [Demo/Pentix/Main.pas](./delphi/Demo/Pentix/Main.pas): a lock scores `points × level`, a drop scores `points × (height − row) × level ÷ 10`, a cleared line scores `lineIndex × (10 + (height − row)) × level`, and emptying the field awards a `1000`-point bonus. Level increases every 30 locked pieces up to level 9.

`PentixServer` persists users, games, and sessions through repository interfaces in `apps/pentix-server/src/storage/`, so neither the HTTP layer nor the lifecycle references a storage engine. `startPentixServer` defaults to in-memory repositories for deterministic tests; `npm run start:server` builds SQLite repositories for the file named by `PENTIX_DATA_FILE` (default `data/pentix.db`). Users, games, and sessions live in separate tables, and a game's piece sequence is stored as a single ordered field. Retained state is loaded at startup, a missing database file starts empty, and a corrupt database file fails startup with a clear error. Gameplay and next-piece requests are state-changing and not idempotent, so clients must not blindly retry a successful-looking request after an uncertain network failure.

## Commands

- `npm run build`: build the shared core, server, and web app
- `npm run start:server`: build and start PentixServer (persists to `PENTIX_DATA_FILE`, default `data/pentix.db`)
- `npm run dev:web`: run the browser app with Vite
- `npm run test`: verify shared primitives, game/session lifecycle behavior, and server APIs
- `npm run lint`: run ESLint across the repository

## Legacy Notes

The piece catalog is ported from [Tetris.pas](./delphi/Tetris.pas). It keeps stable numeric IDs and Delphi geometry while using single simplified keys such as `1Line`, `3Corner`, and `5RMir`; the old `bi*` TypeScript identifiers and duplicate `name` field are no longer part of the shared contract. Most pieces occupy `(0, 0)` as the rotation-center mino. One known exception is `5Corner`, whose legacy Delphi offsets rotate around an empty origin; this repository intentionally preserves that behavior for parity with the original code.

More detail about the current foundation change lives in [docs/foundation.md](./docs/foundation.md).
