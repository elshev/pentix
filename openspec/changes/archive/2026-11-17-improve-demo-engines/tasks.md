## 1. Core contract: the last-tick move in the log

- [x] 1.1 Add `DemoLastTickMove` (`'L' | 'R'`) to `packages/pentix-core/src/demo-actions.ts`, export it from the barrel, and document it as the one-column side-step taken after the hard drop.
- [x] 1.2 Extend `actionsToward(orientation, position, column, lastTickMove = null)` to append the last-tick code after `H`, and keep its output unchanged when the argument is omitted.
- [x] 1.3 Add `demoCanPlaceAt(board, cells, row, column)` (bounds plus occupancy, rows above the board allowed) and make `demoCanPlace(board, cells, position)` delegate to it.
- [x] 1.4 Rework `demoLandingRow` to probe through `demoCanPlaceAt` so it allocates no cell array per probe.
- [x] 1.5 Memoize `Piece.occupiedOffsets` in `packages/pentix-core/src/piece.ts`, return a frozen `readonly Offset[]`, and keep `withAngle` immutable.

## 2. Core planner: board type, local scoring, destination side-step

- [x] 2.1 Switch `planDemoDestinationForOrientations` to take the `DemoBoard` (`0`/`1` rows) instead of a `BoardSnapshot`, and convert once inside `planDemoDestination`.
- [x] 2.2 Replace the per-candidate grid clone with one scratch `boolean[][]`: write the piece cells, score, clear them again.
- [x] 2.3 Count holes only in the columns the piece touched, using per-column hole counts computed once per plan, and count full lines only among the touched rows plus the base grid's full rows.
- [x] 2.4 Keep `countContacts`, the score formula, and the tie-break precedence unchanged, and confirm the planner returns the same destinations as before on the existing fixtures.
- [x] 2.5 Replace the allocating `cellsAt`/`descend` probes with offset walking through `demoCanPlaceAt`, and keep `findLandingRow`/`candidateAngles` internal to the module.
- [x] 2.6 Add `lastTickMove` to `DemoOrientationDestination` and `DemoDestination`, derived from the winning candidate (`shifted` and the settled column versus the drop column), and return it from both planners.
- [x] 2.7 Route `planDemoLastTickMove` through the shared `demoBoardOf` conversion, and keep `canDemoPieceMoveDown` on the single-probe placement helper (converting a whole board to check one cell would be a regression).

## 3. Engines

- [x] 3.1 Make `delphi5-demo-engine.ts` pass its `DemoBoard` straight to the planner, drop `boardSnapshotOf`, and append `destination.lastTickMove` to the log through `actionsToward`.
- [x] 3.2 Leave `random-demo-engine.ts` ending its logs at `H`, and note in its module comment that a last-tick move is a strategy choice it does not take.

## 4. Browser driver and reducer

- [x] 4.1 Add `nextDemoStep(plan)` to `apps/pentix-web/src/engine/demo.ts`, returning `{ action, lastTickAction, plan }`: consume `H` plus one following `L`/`R` together, one code otherwise, and keep `nextDemoAction`/`advanceDemoPlan` working for the exhausted and invalid-character cases.
- [x] 4.2 Replace `demoStep`/`demoBoardStep` with one `demoStep` action carrying `boardId`, `action`, `lastTickAction`, `sessionId`, and `pieceIndex`, and resolve the target session from `boardId` in the reducer: the main target keeps the `applyAdvance` path (a demo game over still moves the phase to `demo-over`), a rail target merges the shared game and replaces only that slot's session.
- [x] 4.3 Apply the last-tick move in `applyDemoStep` only after an `H` that left the session `active` with the same `nextPieceIndex`, then apply exactly one tick.
- [x] 4.4 Update `useDemoStepper` to dispatch the single `demoStep` shape from `nextDemoStep`, with no branch on the board kind, and refresh its comment so it no longer mentions re-targeting a destination on the last tick.

## 5. Documentation

- [x] 5.1 Add a "Blocks" section to `docs/demo-engine-task.md` listing all 29 catalog pieces with key, id, mino count, rotation mode, colour, offsets, and a shape diagram that marks the rotation point, plus the orientation count per rotation mode; check every row against `PIECE_CATALOG`.
- [x] 5.2 Add a "Last-tick move after the hard drop" section with the exact driver rule, a worked pocket example (a settled mino on the row before last), and the ban on a rotation or second drop after `H`; amend the existing "How the caller executes your string" rules and consequences so the drop and its follow-up code are described as one interval.
- [x] 5.3 Make the brief TypeScript-only: require an annotated `plan` signature, convert every example fence to `ts`, and remove the "plain JavaScript" allowance and wording.
- [x] 5.4 Update `docs/foundation.md` to describe the post-drop last tick and the TypeScript authoring contract, and align the `README.md` demo-engine paragraph.
- [x] 5.5 Add a "Scoring" section to `docs/demo-engine-task.md` that states the score is the goal and gives the exact points (locking a piece, the hard drop with its "the earlier and higher the drop, the more points" rule, each cleared row, the emptied-board bonus, and the level multiplier), and connect it to the placement advice.

## 6. Build hygiene

- [x] 6.1 Add a `clean:dist` script using `node -e` with `node:fs.rmSync` and run it before `build:core` and `build:server`.
- [x] 6.2 Run `npm run build:core` and confirm `packages/pentix-core/dist` no longer contains `demo-delphi5.js`, `demo-random.js`, `demo-engines/delphi5.js`, `demo-engines/random.js`, or `demo-engines/left-wall.js`.

## 7. Tests

- [x] 7.1 Add a core test for `actionsToward` with and without a last-tick move.
- [x] 7.2 Add a core test that runs the `delphi5` engine on a `12x22` board with one settled mino on the row before last, for every column, and asserts the log ends with `H` plus the direction toward the mino.
- [x] 7.3 Add a core test that replays that log as Action then Tick (with the post-drop rule) and asserts the piece settles directly under the mino while the mino stays put.
- [x] 7.4 Add a core test that a straight-drop destination carries no last-tick move, and one that `planDemoDestination` reports the side-step for the shifted board.
- [x] 7.5 Extract the repeated "replay a log as Action then Tick" loop in `tests/pentix-core.test.mjs` into one helper and reuse it in the existing delphi5 replay tests.
- [x] 7.6 Add web tests for `nextDemoStep`: `H` plus `R` consumes both codes, a bare `H` consumes one, and an invalid follow-up character is not a last-tick move.
- [x] 7.7 Add web tests for the reducer: a post-drop side-step locks the piece in the pocket column, and a settling drop discards the last-tick move instead of moving the spawned piece.
- [x] 7.8 Update the existing web tests that build `demoStep`/`demoBoardStep` actions for the unified shape.

## 8. Verification

- [x] 8.1 Run `npm run lint` and fix every finding.
- [x] 8.2 Run `npm test` (core, server, and web suites) and fix every failure.
- [x] 8.3 Run `npm run build:web` to confirm the client type-checks with the new action and destination types.
- [x] 8.4 Confirm `pentix-server`, storage, and `session-replay` are untouched, and that a demo never records actions.

## 9. Seeded demo starts and the kept demo engine

- [x] 9.1 Add `withSeededDemoMino` to `apps/pentix-web/src/engine/gameReducer.ts` and seed every demo session — the main attract demo on the initial load, after a player game, and on each automatic restart — plus every rail demo board, leaving player sessions empty.
- [x] 9.2 Pass the state's main demo engine into the board set so a player game, a restart, and the demo that follows keep the engine a double-click brought to the main board, while the rail returns to registry order.
- [x] 9.3 Add web tests for the seed: a demo starts with one settled cell on the row before last in a random column, player sessions start empty while the rail boards are seeded, and the seed stays while the demo locks pieces around it.
- [x] 9.4 Add web tests for engine persistence: a player game and the demo after it still plan with the swapped-in engine, and a later board set re-applies the rail assignment.
- [x] 9.5 Update the `demo-mode` and `demo-boards` delta specs, `README.md`, and `docs/foundation.md` for the seeded start and the kept engine.

- [x] 8.5 Re-read `docs/demo-engine-task.md` on its own and confirm every self-check in it is true of the example answer.
