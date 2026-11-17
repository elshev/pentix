## Why

The attract demo restarts on the main panel the moment that panel's own demo ends, even though the rail boards are still mid-game: the main panel therefore starts a fresh demo while the show it belongs to keeps playing beside it, and the panels drift apart instead of cycling together. On top of that, the demo applies its steering action and its gravity tick in the same instant, so the tick that follows a hard drop lasts zero milliseconds — the piece drops, side-steps into its column, and locks in one frame, and the next piece appears already displaced. The demo reads as teleporting rather than playing.

## What Changes

- **The demo interval gets a rhythm instead of one instant.** Each demo interval now starts with the gravity tick, applies the piece's steering action halfway through the interval, and lets the rest of the interval run before the next tick. From a piece's spawn the cadence becomes half an interval → action, the rest of the interval → tick, half an interval → action, and so on, instead of Action and Tick landing together.
- **The combined demo step is split in two.** The single board-addressed `demoStep` action (action + last-tick side-step + tick) is replaced by two board-addressed actions: a demo gravity tick and a demo steering action that applies exactly one log code. A hard drop's one-column side-step is therefore the *next* steering step, half an interval later, and the drop restarts the interval rhythm so the tick that locks the piece — and the next piece that appears — comes a full interval after the drop, exactly as a player's own drop already does.
- **One clock per board drives both halves.** `useDemoStepper` alternates between the tick and the action on a single timer running at half the board's tick interval, so no second timer can race the demo and no action can be pre-empted by gravity.
- **The attract demo restarts only when the whole board set is over.** A finished main demo keeps its final board while any demo board still plays; the next demo cycle starts once every board's session has ended — after the same `700` ms game-over delay, measured from the last board's end — or when the player asks for one. **BREAKING (behavioural):** the main panel no longer restarts `700` ms after its own demo ends, and a rail board that outlives the main demo now holds the main panel on its finished board.
- **Space starts the next demo from the finished demo.** In the `demo-over` phase Space restarts the attract cycle at once instead of starting a player game; Enter still starts a player game from that phase.
- **The automatic restart starts a fresh board set.** Once every board has ended, the main session and every demo board restart from one new `PentixGame`, so the dead rail boards come back too; the main board keeps the engine it was playing and the rail is reassigned in registry order.
- **The demo badge says what Space does.** The badge over the main board reads press-Space-to-play while the demo runs and press-Space-for-the-next-demo while the finished demo waits.
- **Documentation follows the rhythm.** `docs/demo-engine-task.md`, `docs/foundation.md`, and `README.md` describe the tick-then-action cadence and place the last-tick move inside it.


## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `demo-mode`: the demo replays its engine log by ticking at the start of each interval and steering at its midpoint (replacing "one action then one gravity step per interval"); the last-tick move still rides the drop but is separated from the locking tick by half an interval, and the demo's restart wording moves to the whole board set.
- `browser-gameplay`: the attract demo restart waits until every board has ended and can be triggered with Space from `demo-over`; the `demo-over` lifecycle text follows.
- `demo-boards`: rail boards take the same tick-then-action pacing, and the automatic restart now replaces the whole board set instead of leaving the rail untouched.
- `repository-documentation`: the authoring brief and the foundation notes describe the tick-then-action rhythm instead of Action-then-Tick.

## Impact

- Affected code: `apps/pentix-web/src/engine/gameReducer.ts` (split `demoStep` into `demoTick` and `demoAction`, drop the tick from the steering step, gate `demoRestart` on the whole board set and make it create a fresh board set, export the board-set-over selector), `apps/pentix-web/src/games/pentix/useDemoController.ts` (one alternating half-interval clock per board), `apps/pentix-web/src/games/pentix/useDemoRestart.ts` (arm only while the whole board set is over), `apps/pentix-web/src/games/pentix/Game.tsx` (pass the board-set-over flag, phase-specific badge), `apps/pentix-web/src/engine/keyMap.ts` (Space in `demo-over` maps to the demo), `tests/pentix-web.test.mjs` (reducer, key-map, and pacing tests), `docs/demo-engine-task.md`, `docs/foundation.md`, `README.md`.
- Affected APIs: the web-only `GameAction` union loses `demoStep` and gains `demoTick` and `demoAction`, both carrying `boardId`; `demoStep`'s `action`/`lastTickAction` move to `demoAction`. No `pentix-core` export, `DemoActionLog` grammar, HTTP endpoint, storage shape, or session-replay format changes, and no new runtime dependency.
- Behavioural impact: every demo board — the main attract demo and all rail boards — now moves its piece halfway between gravity ticks, so a hard drop, its side-step, and the lock are no longer one frame; a hard drop leaves the piece resting for a full interval before the next piece appears, its side-step lands half an interval after the drop, and a spawned piece waits half an interval before it can be steered. The main panel stays on its finished demo until every rail board has ended (or the player presses Space), and the attract cycle then restarts as a whole instead of leaving dead rail boards behind. Player games are unaffected.
- Affected teams/areas: the `pentix-web` client owners (reducer and demo hooks) and the demo-engine authors who read `docs/demo-engine-task.md`. `pentix-core`, the server, storage, and replay paths are untouched.
- Dependencies: none — no new packages and no configuration changes.
- Rollback plan: restore the combined `demoStep` action and the single-interval `useDemoStepper` clock, return the `demoRestart` guard to `phase === 'demo-over'` alone and have it restart only the main session, map Space in `demo-over` back to `start`, and restore the previous text in `docs/demo-engine-task.md`, `docs/foundation.md`, and `README.md`. Nothing is persisted by this change and no engine module, core export, HTTP contract, or stored record depends on it, so the rollback is a code-only revert of one reducer, two hooks, one key map, one screen, and the tests and docs that cover them.
