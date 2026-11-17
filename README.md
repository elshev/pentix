# Pentix

Pentix is a modern TypeScript reboot of a legacy Delphi Pentix/Tetris project. Two applications share the same game-domain code:

- `PentixServer`: the backend responsible for users, Pentix games, and Pentix game history
- `Pentix` browser application: the client that renders the board, the statistics popup, the level selector, the attract demo, and the parallel demo boards in the browser

Both applications consume `packages/pentix-core`, which holds the piece catalog, the board and session snapshots, and the shared gameplay and demo engines.

## Glossary

- `Mino`: one square of a piece
- `Piece`: a Pentix figure that contains from 1 to 5 minos
- `Board`: rectangular playfield
- `BoardCell`: one cell of the board
- `GameLevel`: difficulty level; higher level means higher speed
- `Tick`: unit of internal game time
- `PentixGame` (Game): a reusable playfield definition with a board of a defined size, a set of available pieces (identified by stable numeric catalog IDs and their `key`s), and a theoretically infinite sequence drawn from those pieces. In the future a game may restrict its pieces to a subset (for example, Tetris uses only 4-mino pieces).
- `PentixGameSession` (session): one play of a `PentixGame` by one `User`. Different users can play the same `PentixGame` in different places and at different times, each through their own session.
- `User`: a registered player with an Id and a Nick/Name; additional attributes (first name, surname, middle name, creation date, etc.) can be added in the future.
- `Next piece`: the piece after the current active piece, shown as a preview when the "show next piece" option is on; it comes from the game's piece sequence at `nextPieceIndex`.

## Repository Layout

```text
apps/
  pentix-server/   Server with game/session lifecycle and gameplay APIs
    src/storage/   Engine-agnostic repositories (in-memory and SQLite)
  pentix-web/      Browser gameplay client (board, HUD, controls, attract demo, demo boards)
packages/
  pentix-core/     Shared Pentix domain primitives, gameplay and demo engines
delphi/
  Tetris.pas       Legacy Delphi source used as the migration reference
docs/
  foundation.md    Notes about the current architecture
  demo-engine-task.md  The shared brief for AI-authored demo engines
```

## Current Scope

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
  - the demo-engine contract (one `<engine-id>-demo-engine.ts` module per engine, planning from the visible board, the active piece's reachable orientations, and its rotation point, and returning a replayable `L`/`R`/`C`/`A`/`H` action log that may end with one post-drop side-step, the engine's last-tick move), the validating registry, and the built-in `delphi5` and `random` engines
  - the compact session action log and its deterministic replay
- a browser gameplay client that plays a local session against the shared engine: the board with its next-piece preview, the title-less statistics line with a name line above it (the placeholder `Player01` while a player game runs, otherwise the name of the demo engine that owns the board), the pieces statistics popup, the ten-button level selector, the rotation and next-piece settings, the pause/restart controls, an attract demo that runs whenever no player game is active and restarts itself after the game-over delay — it starts on the `random` engine, keeps the engine a double-click brings to the main board even across player games and restarts, and opens every demo session with one settled mino on the row before last (a random column) that stays until its row is cleared — and a demo-board rail beside the board — one board per registered demo engine (capped at the rail's `12` slots; the built-in `delphi5` and `random` engines fill `demo-slot-1` and `demo-slot-2`), each board labelled with its engine's name and description, seeded the same way and replaying that engine's action log as Action then Tick, started in parallel with a new main session, sharing the player's piece sequence while keeping their own session, statistics, and piece index, and following the level chosen while the attract demo runs; double-clicking a demo board during the attract demo exchanges it with the main board, so the clicked session and its engine take the main board and the previous main session takes that rail slot

The following are intentionally not implemented yet:

- durable history endpoints
- a PostgreSQL repository implementation (the interfaces make it a later drop-in)
- multiplayer orchestration beyond sharing one game's piece sequence
- the connection between the browser client and `PentixServer` — the client plays a local session and records no action log

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

`PentixServer` persists users, games, and sessions through repository interfaces in `apps/pentix-server/src/storage/`, so neither the HTTP layer nor the lifecycle references a storage engine. `startPentixServer` defaults to in-memory repositories for deterministic tests; `npm run start:server` builds SQLite repositories for the file named by `PENTIX_DATA_FILE` (default `data/pentix.db`). Users, games, and sessions live in separate tables, a game's piece sequence is stored as a single ordered field, and each session is stored as an action log (every played piece's numeric ID plus its ordered `T`/`L`/`R`/`C`/`A`/`H` actions; there is no soft-drop action). Sessions are reloaded at startup by replaying those actions through the deterministic shared engine. Retained state is loaded at startup, a missing database file starts empty, and a corrupt database file fails startup with a clear error. Gameplay and next-piece requests are state-changing and not idempotent, so clients must not blindly retry a successful-looking request after an uncertain network failure.

## Commands

- `npm run build`: build the shared core, server, and web app
- `npm run start:server`: build and start PentixServer (persists to `PENTIX_DATA_FILE`, default `data/pentix.db`)
- `npm run dev:web`: run the browser app with Vite
- `npm run test`: verify shared primitives, game/session lifecycle behavior, server APIs, and the browser reducer, engine, and demo planner
- `npm run lint`: run ESLint across the repository

## Legacy Notes

The piece catalog is ported from [Tetris.pas](./delphi/Tetris.pas). It keeps stable numeric IDs and Delphi geometry while using single simplified keys such as `1Line`, `3Corner`, and `5RMir`; the `bi*` TypeScript identifiers and the duplicate `name` field are not part of the shared contract. Most pieces occupy `(0, 0)` as the rotation-center mino. One known exception is `5Corner`, whose legacy Delphi offsets rotate around an empty origin; this repository intentionally preserves that behavior for parity with the original code.

More detail about the current architecture lives in [docs/foundation.md](./docs/foundation.md).
