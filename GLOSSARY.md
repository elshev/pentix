# Pentix Glossary

This file is the single source of truth for Pentix vocabulary. `README.md` links here instead of repeating the terms.

Use these rules when you write code, a spec, a document, or a commit message:

- Use a code name in code and in a spec that cites the code.
- Use the plain term in prose.
- Use one term for one thing. Do not invent a synonym.
- Keep the `Count` suffix on every count value. Write `gameCount`, not `games`.

Each entry gives the term, the code name in parentheses, a definition, and the words to avoid.

## Game objects

**User** (`User`) — A registered player. A `User` has a UUIDv7 `id` and a required non-empty `name`.
Avoid: player, account, profile.

**Game** (`PentixGame`) — A reusable game definition. A game has a board size, a set of available piece IDs, and a theoretically infinite piece sequence.
Avoid: match, round, board.

**Session** (`PentixGameSession`) — One play of one `PentixGame` by one `User`. Different users can play the same game in different sessions.
Avoid: game, run, attempt.

**Session status** (`GameSessionStatus`) — The value `active` or `game-over`.
Avoid: state, phase.

**Game session engine** (`GameSessionEngine`) — The stateless shared engine that provides `move`, `rotate`, `tick`, and `drop`. It returns new values and never mutates its inputs.
Avoid: gameplay engine, game engine, server engine.

## Board and pieces

**Board** (`Board`) — The rectangular playfield. The default size is `12` columns by `22` rows (`DEFAULT_BOARD_SIZE`).
Avoid: grid, field, playfield.

**Board cell** (`BoardCell`) — One cell of the board. A cell has `isOccupied` and an optional `pieceKey`.
Avoid: square, tile, slot.

**Board snapshot** (`BoardSnapshot`) — An immutable JSON-safe copy of the board that the server and the client can send.
Avoid: dump, serialized board.

**Mino** — One square of a piece.
Avoid: block, cell, box, square.

**Piece** (`Piece`) — A Pentix figure that contains from 1 to 5 minos. A piece has a single `key` and no `name`. The class exposes `minoCount`.
Avoid: block, shape, figure, tetromino.

**Piece key** (`PieceKey`) — The stable simplified key of a piece, for example `3Corner` or `5RMir`. The legacy Delphi `bi*` keys are not part of the contract.
Avoid: piece name, piece type.

**Piece definition** (`PieceDefinition`) — One catalog entry. It carries the stable numeric `id`, the `key`, the `colorName`, the `rotationMode`, and the `offsets`.
Avoid: piece record, block description.

**Piece catalog** (`PIECE_CATALOG`) — The 29 pieces ported from the legacy Delphi `Tetris.pas`. The numeric IDs are stable.
Avoid: block list, piece table.

**Offset** (`Offset`) — A cell position relative to the rotation point of its piece, held as `x` and `y`. The name replaces the Delphi `Ofs`.
Avoid: coord, delta, cell offset.

**Board position** (`BoardPosition`) — A cell position on the board, held as `row` and `column`. An offset is relative to a piece, and a board position is absolute.
Avoid: point, coordinate, location.

**Rotation point** — The mino or empty cell that a piece rotates around. Most pieces occupy `(0, 0)`. The `5Corner` piece rotates around an empty `(0, 0)` for legacy parity.
Avoid: pivot, center, origin point.

**Rotation mode** (`RotationMode`) — The value `none`, `half`, or `full`. The mode gives the count of reachable orientations. The name replaces the Delphi `TBlockRotates`.
Avoid: rotation type, spin mode.

**Rotation angle** (`RotationAngle`) — One of the angles 0, 90, 180, and 270 degrees.
Avoid: orientation index, turn.

## Play loop

**Tick** — One gravity step of internal game time. A tick moves the active piece down or locks it.
Avoid: frame, turn, step.

**Lock** — The event that settles the active piece on the board. A tick locks a piece that cannot move down.
Avoid: place, freeze, commit.

**Level** — The difficulty of a session. A higher level means shorter ticks. The session holds it as `statistics.level`. The demo starts at `DEFAULT_DEMO_STARTING_LEVEL`, which is `9`. The level rises by one every 30 locked pieces and stops at 9.
Avoid: speed, difficulty, `GameLevel`.

**Active piece** (`ActivePieceState`) — The piece that falls now. It carries `key`, `angle`, and `origin`.
Avoid: current piece, falling piece, block.

**Next piece** — The piece after the active piece. It comes from the game piece sequence at `nextPieceIndex`.
Avoid: preview piece, upcoming piece.

**Next piece index** (`nextPieceIndex`) — The zero-based index into the game piece sequence.
Avoid: cursor, piece counter.

**Line clear** — The removal of a fully occupied row. The rows above it move down.
Avoid: row clear, line removal, collapse.

**Hard drop** (`H`) — The move to the lowest reachable position without a lock. The next tick locks the piece.
Avoid: slam, instant drop.

**Wall kick** — The lateral shift that keeps a rotation legal near a wall. The behavior matches the Delphi original.
Avoid: nudge, push, offset kick.

## Session and replay

**Action code** — One letter from `T`, `L`, `R`, `C`, `A`, and `H`. `T` is a tick, `L` and `R` move, `C` and `A` rotate, and `H` is a hard drop. `SESSION_ACTIONS` maps each operation to its code.
Avoid: move symbol, opcode.

**Piece action log** (`PieceActionLog`) — One played piece with its numeric catalog ID and its action string, for example `"RCTT"`.
Avoid: piece record, move list.

**Session action log** (`SessionActionLog`) — The ordered per-piece action log of one session. It is the durable representation of the session.
Avoid: history, recording, transcript.

**Replay** (`replayPentixGameSession`) — The reconstruction of a session by folding the recorded actions through the deterministic engine.
Avoid: playback, re-run.

## Demo mode

**Demo engine** (`DemoEngine`) — A pluggable planner module with `id`, `name`, `description`, and `plan`. A demo engine is pure and its action log never contains `T`.
Avoid: bot, AI player, strategy, agent.

**Demo action log** (`DemoActionLog`) — The replayable plan of one piece. It uses `L`, `R`, `C`, `A`, and `H` only.
Avoid: demo moves, plan text.

**Last-tick move** — One `L` or `R` after `H`. It applies before the locking tick, and it is a last resort for a pocket under an overhang.
Avoid: post-drop step, side shift, extra move.

**Demo engine registry** (`DemoEngineRegistry`) — The registry that maps an engine ID to its engine. It rejects a duplicate ID and an unknown ID.
Avoid: engine list, engine catalog.

**Demo session** — The headless demo play of one game by one engine. It opens with one settled mino on the row before last (`height - 2`) and the default demo level `9`.
Avoid: demo game, demo run.

**Attract demo** — The browser demo that runs while no player game is active. It cycles as one board set.
Avoid: screensaver, idle mode, auto play.

**Demo board rail** — The strip of demo boards beside the main board. Its capacity is `12` slots (`MAX_DEMO_BOARDS`).
Avoid: sidebar, engine list, panel.

**Demo board** (`demo-slot-N`) — One board on the rail that one registered engine owns. Each board keeps its own session, statistics, and piece index.
Avoid: rail panel, mini game.

**Demo run** — One server demo batch that `POST /demo-runs` starts. Every registered engine plays every game of the run.
Avoid: batch job, tournament, demo game.

**Standing** — One result line of a finished demo run. It carries `name`, `points`, `lines`, `pieces`, and `playingTimeMs`. Ties break on lines, then pieces, then the shorter playing time, then the engine ID.
Avoid: result row, score row, entry.

**Game count** (`gameCount`) — The number of games in a demo run. The default is `1` and the maximum is `256`.
Avoid: games, count, rounds.

## Server and storage

**PentixServer** (`apps/pentix-server`) — The backend application. It owns users, games, sessions, and demo runs.
Avoid: API, backend, server app.

**Repository** (`UserRepository`, `GameRepository`, `GameSessionRepository`) — An engine-agnostic storage interface. The HTTP layer never names a storage engine.
Avoid: store, DAO, data access layer.

**Pentix storage** (`PentixStorage`) — The bundle of the three repositories plus the `close()` handle release.
Avoid: storage layer, database.

**Game lifecycle** (`PentixGameLifecycle`) — The lifecycle service that owns the request-time working set. It hydrates the maps at startup and saves each successful mutation.
Avoid: manager, controller, service layer.

## Process artifacts

**Capability** (`openspec/specs/<capability>/`) — One behavior area with its own spec folder.
Avoid: module, feature area, domain.

**Spec** (`openspec/specs/<capability>/spec.md`) — The `SHALL` contract and the GIVEN/WHEN/THEN scenarios of one capability. A spec records what must be true. It does not record why one option won.
Avoid: design doc, ADR, requirements list.

**Change** (`openspec/changes/<name>/`) — One unit of work. A change carries the proposal, the design record, the specs, and the tasks.
Avoid: ticket, issue, branch.

**Design record** (`openspec/changes/<name>/design.md`) — The context, goals, non-goals, and decisions of one change. The archive holds the record after the change ships, for example `openspec/changes/archive/2026-11-17-add-ai-demo-engines/design.md`.
Avoid: ADR, RFC, spec.

**Authoring brief** (`docs/demo-engine-task.md`) — The self-contained brief that an author of a demo engine needs. It contains the full piece catalog, the action alphabet, the scoring rules, and a worked example.
Avoid: prompt, instructions, demo docs.

**Architecture note** (`docs/foundation.md`) — The standing description of the current architecture. It also states a standing decision, for example the `5Corner` geometry choice.
Avoid: architecture doc, ADR, overview.

**Agent skill** (`.cline/skills/<name>/SKILL.md`) — One skill file with a `name`, a `description`, and the steps of one job. The repository carries four identical copies, one for each agent directory. `docs/agent-skills.md` lists the source of each skill.
Avoid: plugin, command, prompt, workflow.

## Where to look

- A term that describes gameplay behavior: `openspec/specs/gameplay-mechanics/spec.md`.
- A term that describes the shared types: `openspec/specs/shared-game-primitives/spec.md`.
- A term that describes a demo engine: `openspec/specs/demo-engines/spec.md` and `docs/demo-engine-task.md`.
- A decision and its reason: the `design.md` of the change that made it, then `docs/foundation.md`.
