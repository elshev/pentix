# Pentix Architecture

The repository uses an `apps/` and `packages/` layout so the browser client and `PentixServer` share common game-domain code instead of duplicating it. The [GLOSSARY.md](../GLOSSARY.md) file defines the vocabulary that this note uses.

## What Exists Today

- `apps/pentix-web`: the browser gameplay client. The client has board rendering at the shared board size, the statistics line, the pieces statistics popup, and the ten-button level selector. The client also has the rotation/next-piece settings, pause and restart, and the attract demo. The attract demo auto-plays whenever no player game is running, and it cycles as one board set. The main panel holds its finished demo until every rail board ends, or until the player presses Space for the next one. The client keeps the demo engine that the player brought to the main board. Every demo session starts with one settled mino on the row before last
- `apps/pentix-server`: a Node.js server with user management, game creation, session start, next-piece, and gameplay (move/rotate/tick/drop) endpoints, plus background demo batches (`POST /v1/demo-runs`, `GET /v1/demo-runs/{id}`)
- `packages/pentix-core`: shared user, piece, board, game, game-session, gameplay-engine, demo-engine, demo-playback, and session-log primitives

## HTTP Transport

`PentixServer` serves its REST endpoints through an `OpenAPIHono` application mounted on a Node.js HTTP server via `@hono/node-server`. Every route declares its path parameters, request body, and responses as zod schemas in `apps/pentix-server/src/api/schemas.ts` and `apps/pentix-server/src/api/routes.ts`. The same declaration validates the request and generates the OpenAPI 3.1 document served at `GET /openapi.json`. Swagger UI is served at `GET /docs`. Its stylesheet and bundle load from the installed `swagger-ui-dist` package under `/docs/swagger-ui-dist/*` (no CDN). Both documentation endpoints live in `apps/pentix-server/src/api/docs.ts`. The major version lives in `apps/pentix-server/src/api/version.ts`, which supplies the `/v1` prefix for every route path and the `1.0.0` document version. Routing, the 1 MiB body cap, the `application/json; charset=utf-8` responses, the not-found fallback, and the centralized error handler live in `apps/pentix-server/src/app.ts`. The error handler maps both `HttpError` and Hono `HTTPException` to `{ message }`. The repository-backed lifecycle and process start/stop remain in `server.ts`. `apps/pentix-server/src/http.ts` holds only the Pentix-agnostic HTTP primitives (`HttpError`, `HttpStatus`, `throwHttpErrorIf`). `apps/pentix-server/src/request.ts` keeps the UUIDv7 helpers.

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

`User` is a JSON-serializable shared primitive with a UUIDv7 `id`, a required non-empty `name`, which serves as the player's nick, and a `type` of `human` or `ai`. An AI user also carries an `engineId`, which names the demo engine that owns it. `createUser` defaults `type` to `human`. Users are retained through the server's user repository and survive a restart. Additional attributes (first name, surname, middle name, creation date, etc.) can be added later without changing the identity contract. `PentixServer` exposes `POST /v1/users` (create, rejecting a duplicate name case-insensitively with `409 Conflict`), `GET /v1/users` (list), and `GET /v1/users/{id}` (fetch). A created user is always `human`. At startup the server seeds one `ai` user for every configured demo engine and reuses a retained row with the same `engineId`. The list and fetch endpoints therefore return AI users too, and a client filters on `type` to read only human users.

## Game And Session Lifecycle

A `PentixGame` (Game) is a reusable playfield definition. It has a board of a defined size, a set of available pieces, and a theoretically infinite sequence drawn from those pieces. The available pieces are identified by stable numeric catalog IDs and their `key`s. A `PentixGameSession` (session) is one play of a Game by one User. Different users can play the same Game in different places and at different times.

`POST /v1/users` creates a `User` with UUIDv7 identity and a required non-empty `name`, rejecting duplicate names case-insensitively. `POST /v1/games` creates a `PentixGame` with UUIDv7 identity, an optional name, an empty board, and a server-owned sequence of catalog piece IDs. `POST /v1/game-sessions` creates a session either with a new game or with a retained game selected by `gameId`, and always for a retained user selected by the required `userId`. Sessions use UUIDv7 `id`, `gameId`, `userId`, and `nextPieceIndex`. The old `sessionId` field is gone.

`POST /v1/game-sessions/{id}/next-piece` is intentionally a state-changing `POST`. It promotes the previous preview, extends the game's piece sequence on demand, advances the cursor, and returns the full updated session. The preview that the player sees is the piece after the current active piece ("next after one"). The engine draws it once the current piece settles and is persisted, or the engine caches it for later persistence. It is shown when the "show next piece" option is enabled. Games, sessions, and users are retained through repositories, so they survive a restart of the owning server process.

## Persistence

The lifecycle depends on engine-agnostic repository interfaces in `apps/pentix-server/src/storage/repositories.ts`:

- `UserRepository`, `GameRepository`, and `GameSessionRepository` expose `load`, `create`, `save`, `findById`, and `list`
- `PentixStorage` bundles the three repositories plus a `close()` handle release
- `createInMemoryStorage()` provides the non-durable implementation used by tests
- `createSqliteStorage({ dataFile })` persists to a SQLite file through the Node.js built-in `node:sqlite` module (no native dependency)

Users, games, and sessions are stored in separate tables (`users`, `games`, `game_sessions`). A game's piece sequence is stored as one ordered JSON field, and game/session boards are stored as JSON snapshots. The `users` table also holds the user `type` and the optional `engine_id` of an AI user. The `game_sessions` table also holds the optional opening `level` and the optional demo `seed_column`. An older database file gains those four columns in place. The server reads `PRAGMA table_info` and adds one `ALTER TABLE ... ADD COLUMN` per missing column. `PentixGameLifecycle` keeps its in-memory maps as the request-time working set. It hydrates them via `load()` once at startup and seeds a missing AI user for each configured demo engine. It saves each successful mutation through the matching repository.

The SQLite store sets `PRAGMA journal_mode = WAL` and `PRAGMA synchronous = NORMAL` after `assertDatabaseIsReadable`. It reads both values back and fails startup with a `StorageError` when the file cannot host the mode. Write-ahead logging can create `pentix.db-wal` and `pentix.db-shm` beside the data file. A crash or power loss can lose the most recent commits, and the file stays consistent.

`startPentixServer` defaults to in-memory repositories so tests are deterministic. `apps/pentix-server/src/main.ts` loads the app settings through `loadPentixServerSettings()` in `apps/pentix-server/src/settings.ts`, builds SQLite repositories for the resolved `dataFile`, and passes them through `PentixServerContext.storage`. The settings file is `apps/pentix-server/settings.json`, which holds `dataFile` (`C:\db\pentix\pentix.db`) and `backupDirectory` (`C:\db\Backups\pentix`). Its module URL decides where the loader finds the file, and a relative path inside it resolves against the folder that holds it. `PENTIX_SERVER_SETTINGS_FILE` names another settings file, and `PENTIX_DATA_FILE` and `PENTIX_BACKUP_DIRECTORY` override the two paths. The settings file wins over no other source, and an environment value wins over the file value. A missing database file starts with empty collections. An unreadable or corrupt file fails startup with a `StorageError` naming the file.

`npm run backup:server` runs `apps/pentix-server/src/backup.ts`, which calls `createStorageBackup` in `apps/pentix-server/src/storage/backup.ts`. The copy goes through the `node:sqlite` backup call. It holds every committed row while the server keeps the data file open, and it needs no copy of the `-wal` or `-shm` file. The file name is `<yyyyMMddHHmm>-pentix.db`, built from the local clock minute. A backup file is a full SQLite database, so a restore copies it back as a data file. An existing backup file is never replaced, and the run exits `1` with the taken path.

## Gameplay

The shared engine ports the Delphi playfield rules from [Tetris.pas](C:/ai/pentix/delphi/Tetris.pas) and the scoring from [Demo/Pentix/Main.pas](C:/ai/pentix/delphi/Demo/Pentix/Main.pas). The stateless `GameSessionEngine` class in `packages/pentix-core/src/session-engine.ts` encapsulates these operations. It exposes `move`, `rotate`, `tick`, and `drop` (plus a shared `gameSessionEngine` instance):

- `move` and `rotate` (with near-wall kicks) only change the active piece when the target placement is valid.
- `tick` steps gravity. A resting piece locks, clears full lines, scores, and spawns the next piece.
- `drop` moves the piece to its lowest position without locking. The next `tick` locks it (the Delphi `toMoveAfterDropDown` grace).
- Scoring: a lock scores `points × level`, a drop scores `points × (height − row) × level ÷ 10`, a cleared line scores `lineIndex × (10 + (height − row)) × level`, plus a `1000`-point empty-field bonus. Level rises every 30 locked pieces up to level 9.

A session's `status` becomes `game-over` when a spawn is blocked.

## Demo Engines

Demo engines from `packages/pentix-core/src/demo-engines/` drive the attract demo and every rail board. One engine is one module named `<engine-id>-demo-engine.ts` and exporting `id`, `name`, `description`, and `plan(board, piece, position)`. The engine sees only what it needs: the visible board as rows of `0`/`1`, the active piece's reachable orientations, and that rotation point. It returns a replayable action log over `L`, `R`, `C`, `A`, `H` and never contains `T`. The demo driver runs one clock at half the gravity interval. Each interval carries a gravity tick, and one action lands halfway between two ticks. A hard drop restarts that rhythm. The log's one post-drop side-step arrives half an interval later. The tick that locks the piece follows a full interval after the drop. That rhythm is how the classic engine reaches placements under an overhang that a straight drop cannot reach. That **last-tick move** is the piece's one code after `H`.

The built-in catalog holds nine engines, in rail order: the classic `delphi5` and `random`, then these seven AI-authored engines:

- `claude-opus-5-5-extra` — Claude Opus 5.5 Extra
- `claude-sonnet-5-5-extra` — Claude Sonnet 5.5 Extra
- `deepseek-v4-flash-1107-max` — DeepSeek v4 Flash 1107 Max
- `deepseek-v4-pro-max` — DeepSeek v4 Pro Max
- `glm-5-3-flash-extra` — GLM 5.3 Flash Extra
- `minimax-m3-1-flash-extra` — MiniMax M3.1 Flash Extra
- `qwen-4-max` — Qwen 4 Max

The main board's attract demo opens on `delphi5`. An AI-authored engine follows the file-name grammar `<vendor>-<version>[-<variant>]-<mode>-demo-engine.ts`. In that grammar, `<vendor>` is the model family. `<version>` writes dots as dashes and keeps the model's `v`/`M` prefix. `<variant>` is an optional size or build token. `<mode>` is the reasoning mode that the source named (`extra`, `max`). Optional segments keep their stated position, and a segment the source does not provide is omitted. The bracketed reproduction note — thinking time, `Chat`, credit commentary — is not part of the id. It lives in the engine's `description`, which repeats the name in more detail. For example, `glm-5-3-flash-extra-demo-engine.ts` is GLM 5.3 Flash in Extra mode, and its description says it was produced after 15 minutes of thinking.

`demo-engines/index.ts` is the catalog. A module that you register there adds a rail board through the registry, with no browser-client change. `DemoEngineRegistry` validates each module's shape and its kebab-case id. It resolves engines by id and lists them in registration order. It exposes `{ id, name, description }` summaries for the UI. The UI shows an engine's name on its board and reveals the name and description together in a panel that the card's `i` icon opens. An authored plan function is standalone (no imports). The shared `adaptAuthoredPlan` adapter wraps it. The adapter copies the readonly contract inputs, returns the empty log when the authored body throws, and trims the result to a legal action log. The adapter and the built-in engines use `demo-engine-toolkit.ts` for the minimal geometry helpers (`createDemoEngineInput`, `demoCanPlaceAt`, `demoLandingRow`, `actionsToward(orientation, position, column, lastTickMove)`) and the classic planner. The shared brief for AI-authored engines is [demo-engine-task.md](./demo-engine-task.md). It is self-contained and forbids reusing code or context from another chat. It asks for a short algorithm comment above the function and lists every catalog block. It explains the scoring, and it makes the post-drop side-step a last resort for pockets that a straight drop cannot reach.

## Demo Playback And Server Demo Runs

`packages/pentix-core/src/demo-play.ts` holds the timer-free demo driver. `createDemoSession({ id, userId, game, level, seedColumn })` opens a demo session the way the attract demo opens one. The session starts with one settled `1Line` mino on the row before last. The column is random, or it is the supplied one. The session also starts at the demo's opening level, `DEFAULT_DEMO_STARTING_LEVEL` (`9`). The seed is an ordinary settled cell: it carries a piece key so it survives line-clear rebuilds and adds no score, line, or locked piece.

`createDemoPlayback` returns a state whose `slot` names the next operation, `advanceDemoPlayback` applies exactly that operation, and `playDemoSession` repeats it until the session ends. An action replays one engine log code through `GameSessionEngine`. A tick applies one gravity step. A hard drop makes the next slot an action again, so the log's single post-drop side-step lands before the locking tick. Once the log ends, ticks alone finish the piece. The playback also records every applied code, including `T`, under the piece that was active. An action that a settling hard drop discards is not recorded. `playDemoSession` returns the final game and session, the recorded `SessionActionLog`, `plans`, and `planTimeMs`. `planTimeMs` measures only the engine's `plan` calls, so playback overhead, engine operations, and ticks are not billed. The browser client still drives its own React hooks. Both paths follow the same rules, and both paths share the seed helper.

`apps/pentix-server/src/demo-runs.ts` plays batches on demand. `POST /v1/demo-runs` with an optional `{ "gameCount": n }` (default `1`, maximum `256`) queues a run and answers `202` with its snapshot. The run plays in the background, one batch at a time, and it yields whenever a piece is planned. Each game creates one `PentixGame` and one demo session per engine in the shared registry, all opened at level `9` and seeded. Then the engines face the same piece sequence, and the standings compare planning rather than luck. The service stores the game through the game repository before the first session. When an engine's session reaches `game-over`, it stores that session's action log under the engine's AI user. `GET /v1/demo-runs/{id}` reports `queued`, `running`, `completed`, or `failed`. Its `engines` list holds one line per engine, ordered by `totalPoints`, then `totalLines`, then `totalPieces`, then the shorter `playingTimeMs`, then the engine id. Each line names the engine, carries the run totals, and reports `playingTimePer1000PiecesMs`. Its `games` list holds one entry per finished game, with the zero-based `index`, the stored game id, and that game's `standings` ordered by points. The run record is in memory only: the `32` most recent completions stay readable, and a restart forgets the run id. The games and session logs are durable, so a restart rebuilds those sessions by replaying their logs. There is no browser UI for a run. The browser attract demo has no server connection, so it stores nothing.

## Next Likely Steps

- add PentixGame history models and durable history endpoints
- add a PostgreSQL repository implementation behind the existing interfaces
- connect the browser client to `PentixServer` so a played session becomes a retained session with an action log
- migrate the browser's attract demo onto the shared playback step rules so one module owns the cadence
