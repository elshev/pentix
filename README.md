# Pentix

Pentix is a TypeScript reboot of a legacy Delphi Pentix/Tetris project. Two applications share the same game-domain code:

- `PentixServer`: the backend responsible for users, Pentix games, and Pentix game history
- `Pentix` browser application: the client that renders the board, the statistics popup, the level selector, the attract demo, and the parallel demo boards in the browser

Both applications consume `packages/pentix-core`, which holds the piece catalog, the board and session snapshots, and the shared gameplay and demo engines.

## Glossary

The canonical glossary lives in [GLOSSARY.md](./GLOSSARY.md). It defines `Mino`, `Piece`, `Board`, `BoardCell`, `Level`, `Tick`, `PentixGame`, `PentixGameSession`, `User`, `Next piece`, and every other term the codebase uses, with the code name and the words to avoid for each term.

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
  decisions/       Index of the archived decision records
  agent-skills.md  The skills each agent carries, with the source of each one
scripts/
  update-agent-skill.ps1  Refresh one ported skill from its upstream repository
GLOSSARY.md        Canonical vocabulary: one entry per term, with its code name
openspec/
  specs/           One spec per capability: requirements and scenarios
  changes/         Proposed changes and the archive of shipped ones
```

The decision records are indexed in [docs/decisions/README.md](./docs/decisions/README.md).

## Current Scope

The codebase currently includes:

- a `PentixServer` implemented with Node.js and TypeScript. It has user management, game creation, session start, next-piece, and gameplay (move/rotate/tick/drop) endpoints. It persists users, games, and sessions through engine-agnostic repositories. It also has on-demand demo batches (`POST /v1/demo-runs`, `GET /v1/demo-runs/{id}`). A batch plays every registered demo engine in the background and ranks them by points, lines, pieces, and planning time
- a shared `pentix-core` package with:
  - `Piece`
  - `Offset`
  - Delphi-compatible rotation behavior
  - the full legacy piece catalog with stable numeric IDs and simplified keys
  - `Board` and `BoardCell`
  - serializable `User`, `PentixGame`, and `PentixGameSession` snapshots
  - a shared gameplay engine for movement, rotation, gravity ticks, hard drop, line clearing, scoring, and leveling
  - the demo-engine contract, the validating registry, and nine built-in engines. The contract is one `<engine-id>-demo-engine.ts` module per engine. The module plans from the visible board, the active piece's reachable orientations, and its rotation point. It returns a replayable `L`/`R`/`C`/`A`/`H` action log. That log may end with one post-drop side-step, the engine's last-tick move. The plan uses that move only for pockets that a straight drop cannot reach. The nine built-in engines are the classic `delphi5` and `random`, followed by the seven AI-authored `claude-opus-5-5-extra`, `claude-sonnet-5-5-extra`, `deepseek-v4-flash-1107-max`, `deepseek-v4-pro-max`, `glm-5-3-flash-extra`, `minimax-m3-1-flash-extra`, and `qwen-4-max` engines. The shared authored-plan adapter wraps each authored engine, and the `<vendor>-<version>[-<variant>]-<mode>-demo-engine.ts` grammar names it
  - the compact session action log and its deterministic replay
- a browser gameplay client that plays a local session against the shared engine. The board has the next-piece preview, the title-less statistics line, and the pieces statistics popup. A name line sits above the title-less statistics line. The name line holds the placeholder `Player01` while a player game runs. Otherwise the name line holds the name of the demo engine that owns the board. The board also has the ten-button level selector, the rotation and next-piece settings, and the pause/restart controls. An attract demo runs whenever no player game is active, and it cycles as one board set. The main panel holds its finished demo until every rail board ends and the game-over delay runs. Space starts the next cycle at once. The attract demo starts on the `delphi5` engine. It keeps the engine that a double-click brings to the main board, even across player games and restarts. The attract demo opens every demo session with one settled mino on the row before last (a random column). That mino stays until its row is cleared. A demo-board rail also sits beside the board. The rail holds one board per registered demo engine, capped at the rail's `12` slots. The nine built-in engines fill `demo-slot-1` to `demo-slot-9`. Each board has its engine's name at the head, beside an `i` icon that reveals the name and description together. Its primary statistics stay on one line as `S`/`L`/`P`. A `Game over` overlay covers a finished board and repeats the final score, lines, and pieces. Each board is seeded the same way. Each board replays that engine's action log as a gravity tick every interval with one action halfway through it. A hard drop restarts that beat, so the dropped piece side-steps half a tick later and rests a full tick before the next piece appears. Each board starts in parallel with a new main session. Each board shares the player's piece sequence, while it keeps its own session, statistics, and piece index. Each board follows the level chosen while the attract demo runs. Double-clicking a demo board during the attract demo exchanges it with the main board. Then the clicked session and its engine take the main board, and the previous main session takes that rail slot

The following are intentionally not implemented yet:

- durable history endpoints
- a PostgreSQL repository implementation (the interfaces make it a later drop-in)
- multiplayer orchestration beyond sharing one game's piece sequence
- the connection between the browser client and `PentixServer` — the client plays a local session and records no action log

## Server API

With the server running, the API reference is at `/docs` (Swagger UI with **Try it out**) and its OpenAPI 3.1 document at `/openapi.json`. The default origin is `http://127.0.0.1:3100`, and `PENTIX_SERVER_HOST`/`PENTIX_SERVER_PORT` change it. The console loads its stylesheet and bundle from this server under `/docs/swagger-ui-dist/*`, so it needs no CDN or internet access. A request that sends a body without a JSON content type is answered with `415 Unsupported Media Type` and a `{ message }` body.

Every API endpoint carries the `/v1` major-version prefix. A path without the prefix, or with an unknown version such as `/v2`, answers `404 Not Found` with the not-found envelope. The two documentation endpoints stay outside the prefix at `/docs` and `/openapi.json`. The document reports the API version `1.0.0` in its `info.version` field.

- `POST /v1/users` creates a `User` with a UUIDv7 `id` and a required non-empty `name`. The server rejects a duplicate name (compared case-insensitively after trimming) with `409 Conflict`.
- `GET /v1/users` lists retained users as `{ "users": [...] }`.
- `GET /v1/users/{id}` returns a single retained user.
- `POST /v1/games` initializes a `PentixGame` with a UUIDv7 ID, an optional name, an empty default board, and at least two catalog piece IDs.
- `POST /v1/game-sessions` starts a `PentixGameSession` for a required `userId` that references a retained user. An omitted, null, or empty `gameId` creates a game. A supplied UUIDv7 reuses an existing game. Sessions use `id`, `gameId`, `userId`, and a zero-based `nextPieceIndex`.
- `POST /v1/game-sessions/{id}/next-piece` promotes the preview to the active piece, advances the cursor, extends the parent game's piece sequence when needed, and returns the updated session.
- `POST /v1/game-sessions/{id}/move` shifts the active piece left or right (`{ "direction": "left" | "right" }`).
- `POST /v1/game-sessions/{id}/rotate` rotates the active piece with Delphi near-wall kicks (`{ "direction": "clockwise" | "counterclockwise" }`).
- `POST /v1/game-sessions/{id}/tick` steps gravity. When the piece cannot move down, it locks, clears lines, scores, levels, and spawns the next piece.
- `POST /v1/game-sessions/{id}/drop` scores by fall distance and moves the piece to its lowest position without locking. The following tick locks it.
- `POST /v1/demo-runs` starts a demo batch in the background and answers `202 Accepted` with the run's snapshot. The optional body carries `{ "gameCount": <integer> }`, the number of games to play. That value is `1` by default and `256` at most. The server rejects any other value with `400 Bad Request`. Every engine registered in the shared demo-engine registry competes in every game. Each engine plays its own demo session, created from one shared `PentixGame`. So all engines face the same piece sequence.
- `GET /v1/demo-runs/{id}` reports the run: `status` (`queued`, `running`, `completed`, `failed`), `gameCount`, `completedGameCount`, the competing `engines`, and — once completed — `standings` ordered winner to loser. Each standing line carries the engine's `name`, its `points`, `lines`, `pieces`, and `playingTimeMs` (the summed time spent inside that engine's `plan` calls). Ties break on lines, then pieces, then the shorter playing time, then engine id. There is no UI for runs: they live in server memory only, the `32` most recent completions stay readable, and a restart forgets them.

Scoring follows [Demo/Pentix/Main.pas](./delphi/Demo/Pentix/Main.pas): a lock scores `points × level`, a drop scores `points × (height − row) × level ÷ 10`, a cleared line scores `lineIndex × (10 + (height − row)) × level`, and emptying the field awards a `1000`-point bonus. Level increases every 30 locked pieces up to level 9.

`PentixServer` persists users, games, and sessions through repository interfaces in `apps/pentix-server/src/storage/`, so neither the HTTP layer nor the lifecycle references a storage engine. `startPentixServer` defaults to in-memory repositories for deterministic tests. `npm run start:server` builds SQLite repositories for the file named by `PENTIX_DATA_FILE` (default `data/pentix.db`). Users, games, and sessions live in separate tables. The server stores a game's piece sequence as a single ordered field. It stores each session as an action log: every played piece's numeric ID plus its ordered `T`/`L`/`R`/`C`/`A`/`H` actions. There is no soft-drop action. Sessions are reloaded at startup by replaying those actions through the deterministic shared engine. Retained state is loaded at startup, a missing database file starts empty, and a corrupt database file fails startup with a clear error. Gameplay and next-piece requests are state-changing and not idempotent, so clients must not blindly retry a successful-looking request after an uncertain network failure.

## Commands

- `npm run build`: build the shared core, server, and web app
- `npm run start:server`: build and start PentixServer (persists to `PENTIX_DATA_FILE`, default `data/pentix.db`). Open `http://127.0.0.1:3100/docs` for the API reference
- `npm run dev:web`: run the browser app with Vite
- `npm run test`: verify shared primitives, game/session lifecycle behavior, server APIs, and the browser reducer, engine, and demo planner
- `npm run lint`: run ESLint across the repository

## Legacy Notes

The piece catalog is ported from [Tetris.pas](./delphi/Tetris.pas). It keeps stable numeric IDs and Delphi geometry, and it uses single simplified keys such as `1Line`, `3Corner`, and `5RMir`. The `bi*` TypeScript identifiers and the duplicate `name` field are not part of the shared contract. Most pieces occupy `(0, 0)` as the rotation-center mino. One known exception is `5Corner`, whose legacy Delphi offsets rotate around an empty origin. This repository intentionally preserves that behavior for parity with the original code.

More detail about the current architecture lives in [docs/foundation.md](./docs/foundation.md).
