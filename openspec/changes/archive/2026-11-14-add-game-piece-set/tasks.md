## 1. Core model

- [x] 1.1 Add `availablePieceIds` to `PentixGame` (readonly numeric catalog IDs) in `game.ts`
- [x] 1.2 Add a private, non-exported `createPentixGameWithPieces` factory accepting `id`, `name`, `boardSize`, and `pieceIds`
- [x] 1.3 Validate that a build has at least two pieces and that every `pieceIds` entry is a catalog ID
- [x] 1.4 Route the random piece selector through `availablePieceIds` (validate an injected `selectPieceId` result is in the set)

## 2. Public presets

- [x] 2.1 Re-point public `createPentixGame` to the private builder with the full catalog and the `12 x 22` board (keep `id`, `name`, `selectPieceId` options)
- [x] 2.2 Add public `createTetrisGame` with the 4-mino (tetromino) set and the `10 x 20` board
- [x] 2.3 Export `createTetrisGame` from `pentix-core` `index.ts`

## 3. Tests

- [x] 3.1 Add test: `createPentixGame` exposes the full catalog as its available set
- [x] 3.2 Add test: `createTetrisGame` exposes exactly the 4-mino set and the Tetris board size
- [x] 3.3 Add test: a preset's sequence is drawn only from its available set
- [x] 3.4 Add test: the arbitrary builder is not part of the public API surface
- [x] 3.5 Run `npm test` and `npm run lint` and keep them green

## 4. No API changes

- [x] 4.1 Confirm `POST /games` and the browser start flow are unchanged (always a Pentix game) — no server/request edits required