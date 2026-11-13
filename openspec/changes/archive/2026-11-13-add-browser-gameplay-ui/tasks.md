## 1. Game state foundation

- [x] 1.1 Add a pure projection helper that maps a `PentixGameSession` into a render grid: occupied `board.rows` cells colored by `pieceKey` plus the active piece overlay derived from `session.activePiece.origin` and `piece.occupiedOffsets`.
- [x] 1.2 Add a pure helper that constructs the active `Piece` from `session.activePiece.key`/`angle` and returns its occupied cells.
- [x] 1.3 Define a `GamePhase` type (`'ready' | 'playing' | 'paused' | 'game-over'`) and the `{ phase, game, session }` state shape.
- [x] 1.4 Implement a reducer whose `start`, `move`, `rotate`, `tick`, `drop`, `pause`, `resume`, and `restart` actions call `createPentixGame`, `createPentixGameSession`, and `gameSessionEngine` and store the returned immutable values.

## 2. Gravity loop

- [x] 2.1 Implement a `useGameLoop` hook using `requestAnimationFrame` with an accumulator that dispatches a `tick` action on a level-based interval.
- [x] 2.2 Derive the tick interval from `session.statistics.level` so higher levels tick faster, and stop the loop while paused or game-over.

## 3. Rendering components

- [x] 3.1 Add a `BoardView` component that renders the `12` x `22` grid from the projection helper, coloring cells by `pieceKey`.
- [x] 3.2 Add a `NextPiecePreview` component that renders the piece for `session.nextPieceKey` from the shared catalog.
- [x] 3.3 Add a `HUD` component that shows `score`, `level`, and `clearedLines` from `session.statistics`.

## 4. Input and controls

- [x] 4.1 Add a `keydown` listener that maps ArrowLeft/ArrowRight to `move`, ArrowUp/`z` to `rotate('clockwise')`, ArrowDown to `tick`, Space to `drop`, `p` to pause/resume, and `r` to restart.
- [x] 4.2 Add on-screen control buttons (left, right, rotate, soft drop, hard drop, pause, restart) wired to the same reducer actions.

## 5. Lifecycle and shell

- [x] 5.1 Replace the static foundation landing content with the game screen and add ready/playing/paused/game-over states driven by `phase`, keeping a compact foundation summary as the ready state.
- [x] 5.2 Restyle `App.css`/`index.css` for the board, HUD, controls, and state overlays (readable and responsive).

## 6. Verification

- [x] 6.1 Add unit tests for the pure projection and reducer helpers (board overlay, move/rotate/drop/tick mapping, level-based interval, game-over detection) following the repo's existing test conventions.
- [x] 6.2 Run `npm run dev:web` and manually verify play end-to-end: spawn, move, rotate, soft/hard drop, scoring, level-up cadence, game over, and restart.
- [x] 6.3 Run `npm run build:web` and `npm run lint` and fix any errors.