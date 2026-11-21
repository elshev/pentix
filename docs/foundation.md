# Pentix Architecture

The repository uses an `apps/` and `packages/` layout so the browser client and `PentixServer` share common game-domain code instead of duplicating it.

## What Exists Today

- `apps/pentix-web`: the browser gameplay client — board rendering at the shared board size, the statistics line and pieces statistics popup, the ten-button level selector, rotation/next-piece settings, pause and restart, and the attract demo that auto-plays whenever no player game is running, cycles as one board set (the main panel holds its finished demo until every rail board has ended, or the player presses Space for the next one), keeps the demo engine the player brought to the main board, and starts every demo session with one settled mino on the row before last
- `apps/pentix-server`: a Node.js server with user management, game creation, session start, next-piece, and gameplay (move/rotate/tick/drop) endpoints
- `packages/pentix-core`: shared user, piece, board, game, game-session, gameplay-engine, demo-engine, and session-log primitives

## HTTP Transport

`PentixServer` serves its REST endpoints through a Hono application mounted on a Node.js HTTP server via `@hono/node-server`. Routing, JSON body parsing (with a 1 MiB limit), JSON responses (`application/json; charset=utf-8`), the not-found fallback, and the centralized error handler live in `apps/pentix-server/src/app.ts`, while the repository-backed lifecycle and process start/stop remain in `server.ts`. `apps/pentix-server/src/http.ts` holds only the Pentix-agnostic HTTP primitives (`HttpError`, `HttpStatus`, `throwHttpErrorIf`); the request-body parsers and UUID/JSON validation helpers live in `apps/pentix-server/src/request.ts`.

## Shared Piece Model

The shared piece model intentionally uses readable TypeScript names:

- `Offset` instead of Delphi `Ofs`
- `RotationMode` values `none`, `half`, and `full` instead of Delphi `TBlockRotates`
- `Piece` instead of Delphi `TBlock`
- catalog `key` values such as `3Corner` instead of duplicate `bi3Corner`/`3Corner` identities

The piece catalog is ported directly from the legacy Delphi source at [Tetris.pas](C:/ai/pentix/delphi/Tetris.pas). Numeric piece IDs, colors, rotation behavior, and occupied offsets remain compatible with that source.

## 5Corner Decision

The Delphi `5Corner` definition does not contain an occupied `(0, 0)` mino. The port keeps that exact geometry instead of normalizing it, because legacy parity takes priority over reinterpretation.

That means:

- most pieces occupy `(0, 0)` directly
- `5Corner` rotates around the origin even though the origin itself is empty

## User Model

`User` is a JSON-serializable shared primitive with a UUIDv7 `id` and a required non-empty `name`, which serves as the player's nick. Users are retained through the server's user repository and survive a restart; additional attributes (first name, surname, middle name, creation date, etc.) can be added later without changing the identity contract. `PentixServer` exposes `POST /users` (create, rejecting a duplicate name case-insensitively with `409 Conflict`), `GET /users` (list), and `GET /users/{id}` (fetch).

## Game And Session Lifecycle

A `PentixGame` (Game) is a reusable playfield definition: a board of a defined size, a set of available pieces (identified by stable numeric catalog IDs and their `key`s), and a theoretically infinite sequence drawn from those pieces. A `PentixGameSession` (session) is one play of a Game by one User; different users can play the same Game in different places and at different times.

`POST /users` creates a `User` with UUIDv7 identity and a required non-empty `name`, rejecting duplicate names case-insensitively. `POST /games` creates a `PentixGame` with UUIDv7 identity, an optional name, an empty board, and a server-owned sequence of catalog piece IDs. `POST /game-sessions` creates a session either with a new game or with a retained game selected by `gameId`, and always for a retained user selected by the required `userId`. Sessions use UUIDv7 `id`, `gameId`, `userId`, and `nextPieceIndex`; the old `sessionId` field is gone.

`POST /game-sessions/{id}/next-piece` is intentionally a state-changing `POST`. It promotes the previous preview, extends the game's piece sequence on demand, advances the cursor, and returns the full updated session. The preview shown to the player is the piece after the current active piece ("next after one"), drawn from the engine once the current piece settles and is persisted (or cached for later persistence); it is shown when the "show next piece" option is enabled. Games, sessions, and users are retained through repositories, so they survive a restart of the owning server process.

## Persistence

The lifecycle depends on engine-agnostic repository interfaces in `apps/pentix-server/src/storage/repositories.ts`:

- `UserRepository`, `GameRepository`, and `GameSessionRepository` expose `load`, `create`, `save`, `findById`, and `list`
- `PentixStorage` bundles the three repositories plus a `close()` handle release
- `createInMemoryStorage()` provides the non-durable implementation used by tests
- `createSqliteStorage({ dataFile })` persists to a SQLite file through the Node.js built-in `node:sqlite` module (no native dependency)

Users, games, and sessions are stored in separate tables (`users`, `games`, `game_sessions`). A game's piece sequence is stored as one ordered JSON field, and game/session boards are stored as JSON snapshots. `PentixGameLifecycle` keeps its in-memory maps as the request-time working set: it hydrates them via `load()` once at startup and saves each successful mutation through the matching repository.

`startPentixServer` defaults to in-memory repositories so tests are deterministic. `apps/pentix-server/src/main.ts` builds SQLite repositories for `PENTIX_DATA_FILE` (default `data/pentix.db`) and passes them through `PentixServerContext.storage`. A missing database file starts with empty collections; an unreadable or corrupt file fails startup with a `StorageError` naming the file.

## Gameplay

The shared engine ports the Delphi playfield rules from [Tetris.pas](C:/ai/pentix/delphi/Tetris.pas) and the scoring from [Demo/Pentix/Main.pas](C:/ai/pentix/delphi/Demo/Pentix/Main.pas). These operations are encapsulated by the stateless `GameSessionEngine` class in `packages/pentix-core/src/session-engine.ts`, which exposes `move`, `rotate`, `tick`, and `drop` (plus a shared `gameSessionEngine` instance):

- `move` and `rotate` (with near-wall kicks) only change the active piece when the target placement is valid.
- `tick` steps gravity; a resting piece locks, clears full lines, scores, and spawns the next piece.
- `drop` moves the piece to its lowest position without locking; the next `tick` locks it (the Delphi `toMoveAfterDropDown` grace).
- Scoring: a lock scores `points × level`, a drop scores `points × (height − row) × level ÷ 10`, a cleared line scores `lineIndex × (10 + (height − row)) × level`, plus a `1000`-point empty-field bonus. Level rises every 30 locked pieces up to level 9.

A session's `status` becomes `game-over` when a spawn is blocked.

## Demo Engines

The attract demo and every rail board are driven by demo engines from `packages/pentix-core/src/demo-engines/`. One engine is one module named `<engine-id>-demo-engine.ts` and exporting `id`, `name`, `description`, and `plan(board, piece, position)`. The engine sees only what it needs: the visible board as rows of `0`/`1`, the active piece's reachable orientations, and that rotation point. It returns a replayable action log over `L`, `R`, `C`, `A`, `H` and never contains `T`: the demo driver runs one clock at half the gravity interval, so each interval carries a gravity tick and one action lands halfway between two ticks. A hard drop restarts that rhythm — the log's one post-drop side-step arrives half an interval later and the tick that locks the piece a full interval after the drop — which is how the classic engine reaches placements under an overhang that a straight drop cannot. That **last-tick move** is the piece's one code after `H`.

The built-in catalog holds nine engines, in rail order: the classic `delphi5` and `random`, then these seven AI-authored engines:

- `claude-opus-5-5-extra` — Claude Opus 5.5 Extra
- `claude-sonnet-5-5-extra` — Claude Sonnet 5.5 Extra
- `deepseek-v4-flash-1107-max` — DeepSeek v4 Flash 1107 Max
- `deepseek-v4-pro-max` — DeepSeek v4 Pro Max
- `glm-5-3-flash-extra` — GLM 5.3 Flash Extra
- `minimax-m3-1-flash-extra` — MiniMax M3.1 Flash Extra
- `qwen-4-max` — Qwen 4 Max

The main board's attract demo opens on `delphi5`. An AI-authored engine follows the file-name grammar `<vendor>-<version>[-<variant>]-<mode>-demo-engine.ts`: `<vendor>` is the model family, `<version>` writes dots as dashes and keeps the model's `v`/`M` prefix, `<variant>` is an optional size or build token, and `<mode>` is the reasoning mode the source named (`extra`, `max`). Optional segments keep their stated position, and a segment the source does not provide is omitted. The bracketed reproduction note — thinking time, `Chat`, credit commentary — is not part of the id; it lives in the engine's `description`, which repeats the name in more detail. For example, `glm-5-3-flash-extra-demo-engine.ts` is GLM 5.3 Flash in Extra mode, and its description says it was produced after 15 minutes of thinking.

`demo-engines/index.ts` is the catalog: registering a module there adds a rail board through the registry, with no browser-client change. `DemoEngineRegistry` validates each module's shape and kebab-case id, resolves engines by id, lists them in registration order, and exposes `{ id, name, description }` summaries for the UI, which shows an engine's name on its board and reveals the name and description together in a panel opened from the card's `i` icon. An authored plan function is standalone (no imports) and is wrapped by the shared `adaptAuthoredPlan` adapter, which copies the readonly contract inputs, returns the empty log when the authored body throws, and trims the result to a legal action log. The adapter and the built-in engines use `demo-engine-toolkit.ts` for the minimal geometry helpers (`createDemoEngineInput`, `demoCanPlaceAt`, `demoLandingRow`, `actionsToward(orientation, position, column, lastTickMove)`) and the classic planner. The shared brief for AI-authored engines is [demo-engine-task.md](./demo-engine-task.md); it is self-contained, forbids reusing code or context from another chat, asks for a short algorithm comment above the function, lists every catalog block, explains the scoring, and makes the post-drop side-step a last resort for pockets a straight drop cannot reach.

## Next Likely Steps

- add PentixGame history models and durable history endpoints
- add a PostgreSQL repository implementation behind the existing interfaces
- connect the browser client to `PentixServer` so a played session becomes a retained session with an action log
