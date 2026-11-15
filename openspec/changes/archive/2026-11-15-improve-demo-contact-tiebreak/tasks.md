## 1. Planner: add the contact tie-break

- [x] 1.1 Add a single `contacts` field to the `DemoChoice` interface in `packages/pentix-core/src/demo.ts`.
- [x] 1.2 Add a `countContacts(baseGrid, width, height, cells)` helper that counts each settled piece cell's orthogonal neighbors that are settled minos or board walls into one total.
- [x] 1.3 In `planDemoDestination`, compute `contacts` for each candidate from `baseGrid` and the settled piece's cells, and include it in the pushed `DemoChoice`.
- [x] 1.4 Update `preferCandidate` so that when `bottom` and `top` tie it prefers more contacts, then a placement that does not touch a side wall, then a random choice.

## 2. Tests

- [x] 2.1 Add core tests in `tests/pentix-core.test.mjs` covering the higher-contact preference, the non-wall preference when contacts tie, and the random tie-break (with `Math.random` pinned).
- [x] 2.2 Confirm the existing `planDemoDestination` tests still pass unchanged for non-tied placements.

## 3. Verification

- [x] 3.1 Run `npm run lint` and `npm test`; fix any failures.
- [x] 3.2 Rebuild `pentix-core` via `npm run build:core` and spot-check the demo in `npm run dev:web` to confirm the demo still auto-plays and stacks cleanly.

## 4. Plan the destination once per piece

- [x] 4.1 Add `resolveDemoPlan` in `apps/pentix-web/src/engine/demo.ts` (cache keyed by `session.id` + `nextPieceIndex`) and let `nextDemoAction` accept a precomputed destination.
- [x] 4.2 Use `resolveDemoPlan` in `useDemoController` so the destination is planned once per spawned piece instead of on every tick.
- [x] 4.3 Add web tests for the stable-per-piece cache, the re-plan on a new piece/session, and `nextDemoAction` with a supplied destination.