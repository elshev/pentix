## Context

`createPentixGame` builds a `PentixGame` with `id`, `name`, a default board, and an initial `pieceIds` sequence drawn by a `PieceIdSelector` that defaults to `chooseRandomPieceId` over the whole catalog (29 entries). The factory already accepts an optional `boardSize`, but nothing calls it with a custom size today. `selectPieceId` is used by `PentixServer` context and by tests for determinism and must remain injectable.

## Goals / Non-Goals

**Goals:**

- Let the engine build a game from a specific board size and piece set, kept private.
- Expose fixed, minimal public entry points: `createPentixGame` and `createTetrisGame`.
- Keep `POST /games` and the browser "start" flow always starting a Pentix game.

**Non-Goals:**

- Adding a piece-set (or board-size) field to the HTTP API.
- Per-game piece weights, or user-defined piece sets over the wire.
- Changing the catalog, scoring, or gameplay.

## Decisions

### Decision 1: A private builder owns arbitrary configuration

Add a private, non-exported `createPentixGameWithPieces(build)` that accepts `id`, `name`, `boardSize`, and `pieceIds`. Only this function supports an arbitrary board size and piece set.

- *Why*: satisfies "custom game with arbitrary board size and piece set" without widening the public surface.
- *Alternative considered — export the arbitrary builder:* contradicts the "keep it private" direction.

### Decision 2: Public presets wrap the private builder

`createPentixGame(options)` builds with the full catalog and the `12 x 22` board; `createTetrisGame(options)` builds with the 7 tetromino pieces (`4Line`, `4Square`, `4T`, `4L`, `4LMir`, `4S`, `4SMir`) and a `10 x 20` board. Both delegate to the private builder and accept `selectPieceId` for deterministic tests.

- *Why*: two small, intention-revealing entry points ("Start Pentix" / "Start Tetris") instead of arbitrary config on the wire.
- *Alternative considered — a single `createGame({ kind })` enum:* equally valid, but named factories match the existing `create*` convention.

### Decision 3: The piece set lives on the game and drives the random source

`PentixGame` gains `availablePieceIds: readonly number[]`. The random selector picks only from this set; the injectable `selectPieceId` remains but its result is validated to belong to the set.

- *Why*: the game must carry its set for serialization (storage in a later change) and for deterministic sequence extension.
- *Alternative considered — keep the set only inside the factory:* the game could not be stored or replayed with a restricted piece set.

### Decision 4: No API exposure

`POST /games` keeps its current contract and always creates a Pentix game; the browser "start" flow is unchanged. A piece set is never accepted from the client.

- *Why*: matches "Start a new Game will always start a Pentix game" and keeps this change engine-only.
- *Alternative considered — add a `preset` field to `POST /games`:* rejected; not requested and adds surface.

## Risks / Trade-offs

- [A preset with fewer than 2 pieces cannot spawn active + preview] → every preset ships with ≥ 2 pieces; the private builder rejects smaller sets.
- [Tetris board size assumption (10 x 20)] → documented as the preset default; sizing is private so adjusting it is inert.
- [Moving `boardSize` off the public `createPentixGame` options] → safe: no caller or test uses it today (verified).

## Migration Plan

Additive and engine-only: introduce the private builder, add `availablePieceIds`, add `createTetrisGame`, and route the random source through the set. `createPentixGame` keeps its call contract (`id`, `name`, `selectPieceId`). No server/API change and no data migration. Rollback is removing the set field and the Tetris preset.

## Open Questions

- Confirm the Tetris board size (`10 x 20`) versus reusing the Pentix board.