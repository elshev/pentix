## Context

The repository keeps a spec-driven workflow: `openspec/specs/<capability>/spec.md` holds the current truth, each change adds deltas under `openspec/changes/<name>/specs/<capability>/spec.md`, and archiving merges the deltas into the main specs. Fourteen capabilities exist and all of them pass `openspec validate --all --strict`, so every problem in this change is semantic: nothing is missing a scenario or using the wrong heading level.

The drift accumulated because each feature change patched the spec of the moment and nobody revisited the statements it superseded:

- `demo-mode` has said "the client SHALL immediately start a fresh demo session" since `add-demo-mode`; `delay-after-game-over` later introduced `GAME_OVER_COOLDOWN_MS` (`700`) for player games and `reorganize-ui` reused it for the demo through a new `demo-over` phase (`apps/pentix-web/src/games/pentix/useDemoRestart.ts`). `demo-mode` was never updated.
- Level control was extended three times (`improve-demo-level-management` added `+`/`-`, `reorganize-ui` added the ten level buttons with raise-only mid-game, and the client already mapped digits `0`-`9` outside a player game in `apps/pentix-web/src/engine/keyMap.ts`). Each addition created a new statement instead of extending the previous one, leaving one requirement that is now a strict subset of another and one demo-side requirement that restates the demo branch.
- `reorganize-ui` turned the statistics panel into a popup but kept the requirement name from the panel era, which now contradicts both its own body and the HUD requirement that forbids a second panel beneath the statistics line.
- `add-session-replay-log` specified the client-side cache with a placeholder (`SOME_CACHE_PIECE_COUNT`); the browser was never connected to the server (`apps/pentix-web/src` contains no `fetch`, and the play session is local), while the server does maintain and persist a `SessionActionLog` per gameplay request (`apps/pentix-server/src/server.ts`, `persistAction`).
- Documentation requirements were written for the bootstrap increment and never re-scoped, so `README.md` and `docs/foundation.md` still describe a placeholder browser and a piece model with a `name` field that `add-game-piece-set` removed.
- Two debug aids were committed while validating the demo (`DEMO_SEED_SETTLED_MINO` in `gameReducer.ts`, `ACTIVE_DEMO_ENGINE_ID = 'random'` in `engine/demo.ts`) and their own comments say to remove them.

Constraints that shape the change:

- Spec deltas cannot express anything outside a requirement block, so Purpose text, the `# <capability> Specification` heading, and scenario spacing must be edited directly in `openspec/specs/**`. Archiving merges requirement blocks only, so those edits are safe as long as they do not touch a requirement that a delta replaces.
- `openspec` supports `ADDED`, `MODIFIED`, `REMOVED`, and `RENAMED`; `MODIFIED` must carry the *whole* requirement block or detail is lost at archive time, and `RENAMED` must name the current and the new requirement title exactly.
- Gameplay behaviour must not change: `packages/pentix-core`, `apps/pentix-server`, the REST contract, the reducer's state shape, and every gameplay rule stay as they are. The only executable edits are the two demo debug aids.
- `tests/pentix-web.test.mjs` imports `resolveDemoPlan`/`nextDemoAction` with an explicit engine, so flipping `ACTIVE_DEMO_ENGINE_ID` does not affect the existing tests; nothing in `tests/` references `seedDemoBoard` or `DEMO_SEED_SETTLED_MINO`.

## Goals / Non-Goals

**Goals:**

- One statement per behaviour: level selection, demo restart timing, and the statistics display each have exactly one owning requirement.
- Every requirement describes the system as it is now, not the delta from a previous version, and every named constant either exists in the code or is defined by the requirement itself.
- The spec hierarchy names one owner per endpoint and one owner per demo behavior, so a future change updates one place.
- The docs in `README.md` and `docs/foundation.md` describe what ships today.
- Remove the two temporary demo debug aids so the browser demo plays the documented default engine on an unseeded board.

**Non-Goals:**

- No gameplay, scoring, gravity, demo-planner, storage, or REST behaviour change.
- No new engine API. In particular, adding a `GameSessionEngine.setLevel` operation (so the client stops writing `session.statistics.level` itself) is **not** part of this change; the specs describe the current arrangement instead.
- No deletion of the `random` demo engine or of its `demo-engines` requirement — it stays a registered, specified, unused-by-default engine.
- No restructuring of capabilities (for example, moving every demo requirement from `browser-gameplay` into `demo-mode`); this change only removes the duplicates that state the same behaviour twice.
- No client/server integration work, and therefore no client-side action recording.

## Decisions

1. **Keep the level buttons requirement and delete the `+`/`-` requirement.** "The level buttons select the level, start a game, or retune the demo" already states the clamp, the demo retune, the game-over start, and the raise-only mid-game rule; the `+`/`-` requirement adds only the key bindings, the `9` default, and the configured-level wording. Those three facts move into the surviving requirement, together with the `0`-`9` digit keys that no spec ever mentioned. *Alternative considered:* keep both and mark one as a subset — rejected because the user's original observation is exactly that a subset requirement invites contradictory future edits.

2. **The merged level requirement states who owns the level.** The current text says "the engine owns the level", while `applyStartingLevel` in `apps/pentix-web/src/engine/gameReducer.ts` writes `session.statistics.level` directly on a session the client created. The merged requirement separates the two truths: the engine owns level *progression* (it advances every `30` locked pieces up to `9` and refuses to move backwards), while the client sets the level of the session it creates and may raise a live level. It also records that a session opened by the shared engine starts at level `1` and that the client's configured starting level (`9` by default) is applied on top of it, so the `game-session-start` "level `1`" statement and the `browser-gameplay` "default `9`" statement stop reading as a contradiction. *Alternative considered:* add `engine.setLevel` now — rejected as a behaviour change outside this cleanup; it is listed as an open question.

3. **`browser-gameplay` owns the demo restart timing.** The behaviour is a client phase (`demo-over`) plus a timer, and the `browser-gameplay` "Game-over actions wait for a short cooldown" requirement already says the cooldown delays the attract demo's restart. Keeping a second, older statement in `demo-mode` is what produced the conflict. `demo-mode`'s Purpose sentence ("restarts itself on game over") and its "Demo mode runs when no game is active" requirement keep the capability coherent. *Alternative considered:* make `demo-mode` the owner and delete the `browser-gameplay` requirement — rejected because that requirement also carries the "no game-over overlay for the demo" and "final board stays visible" statements, which are screen behaviour, and moving them would enlarge the change.

   The resulting single-owner flow, for reference (the timer is `useDemoRestart`, the phase transition is in `gameReducer.ts`):

   ```mermaid
   sequenceDiagram
     participant Loop as Demo step (reducer)
     participant State as Reducer state
     participant Timer as useDemoRestart
     participant Screen as Game.tsx
     Loop->>State: applyAdvance -> session.status = 'game-over'
     State->>State: phase = 'demo-over' (final board kept)
     State->>Timer: active = true
     Screen->>Screen: render final board, no game-over overlay
     Timer->>State: dispatch demoRestart after GAME_OVER_COOLDOWN_MS (700)
     State->>Screen: phase = 'demo', fresh session at the configured level
   ```

4. **Fold the engine-owned statistics requirement into the renamed popup requirement.** The popup requirement already names every counter and its `session.statistics` source; the separate requirement restates the same sources plus "no client copies", the demo case, and the zeroed fresh-session case. Those three scenarios move into the popup requirement and the standalone requirement is removed, which is the dedupe the user asked for without losing a single scenario. The retitle is expressed as a `REMOVED` + `ADDED` pair rather than `RENAMED Requirements`, because `MODIFIED` blocks match by exact name and this repository has no `RENAMED` precedent to lean on; the removal's `Reason` records that only the title (and the split into two requirements) was wrong. *Alternative considered:* keep the panel-era title and only fix the body — rejected because the title is the contradiction.

5. **Session replay describes the implemented server behaviour.** The `SOME_CACHE_PIECE_COUNT` requirement is replaced by the log that exists: the gameplay endpoints append one code per action to the session's `SessionActionLog` and persist it, and loading replays the log through the deterministic engine (documented in `README.md` and implemented in `server.ts`/`storage/`). The client keeps its session local; `browser-gameplay` says so explicitly instead of claiming it records actions into a log nobody receives. *Alternative considered:* invent a concrete batch size and keep the client requirement — rejected because it would specify a feature that has no code path, and a made-up constant reads exactly like the placeholder being removed.

6. **`pentix-server-bootstrap` references instead of repeating.** The requirement keeps the transport, configuration, and scope statements (Hono on `@hono/node-server`, host/port settings, the deliberate limits) and replaces the route enumeration with the owning capabilities. *Alternative considered:* leave the list — rejected because it already duplicates four capabilities and it is the one place most likely to drift when a route is added.

7. **`repository-documentation` becomes a standing contract.** The requirement asks for documentation that describes the current apps, capabilities, and remaining gaps, plus the glossary. It no longer mentions the starter README or the "first increment", both of which are history. The two docs are then rewritten against that requirement.

8. **Purpose, heading, and spacing edits go straight into `openspec/specs/**`.** The delta format cannot express them, and they are not behaviour, so they are hand-edited in the same commit as the deltas. Only requirements replaced by a delta are left alone. *Alternative considered:* fold the purpose rewrite into a delta requirement — rejected because a Purpose is not a requirement and `openspec` would reject or ignore it.

9. **Delete the two demo debug aids instead of documenting them.** `DEMO_SEED_SETTLED_MINO`/`seedDemoBoard` contradict `game-session-start` ("opening state uses an independent copy of the game's initial board") and were only ever watched by a human; `ACTIVE_DEMO_ENGINE_ID` contradicts `demo-engines` ("the default engine id SHALL be `delphi5`") and keeps the demo permanently on the temporary engine. Removing them needs no spec delta for the code, but `demo-mode` gains one sentence requiring the registry default, so the constant cannot silently drift again.
## Risks / Trade-offs

- [Removing the `+`/`-` requirement could drop a fact nobody re-adds] → The merged requirement copies the default (`9`), the clamp (`0`-`9`), and both key pairs (`+`/`=` and `-`/`_`) verbatim, and its scenarios move across with `+`/`-` wording adjusted to the keys.
- [Removing `demo-mode`'s restart requirement leaves that capability silent about restarting] → Its Purpose sentence and "Demo mode runs when no game is active" keep the loop described, and the surviving `browser-gameplay` requirement is cross-referenced from the removal's `Migration` note.
- [Deleting the client-side flush requirement loses a planned feature] → Recorded as an open question and in the removal's `Migration` note: the requirement returns with the client/server integration change, when an actual upload path exists.
- [`RENAMED Requirements` is less exercised by this repository than `MODIFIED`] → Not used: the two retitles are `REMOVED` + `ADDED` pairs so the merge depends only on the well-exercised sections; the removals carry `Reason`/`Migration` so the archive log explains the title change.
- [`MODIFIED` blocks that drop a scenario silently shrink the spec at archive time] → Every modified block is copied in full from `openspec/specs/**` and compared against it before archiving; the tasks list the scenario counts before and after.
- [Flipping the demo engine to `delphi5` changes what a developer sees in the browser] → Intended: `delphi5` is the documented default and the demo becomes reproducible; the `random` engine stays available through the registry for experiments.
- [Hand edits to `openspec/specs/**` outside the delta flow could conflict with archiving] → They touch only Purpose text, the H1 line, and blank lines, never a requirement block, and archiving merges requirement blocks; the final `openspec validate` plus a post-archive read-back confirms nothing was lost.

## Migration Plan

1. Land the five spec deltas, the `openspec/specs/**` hygiene edits, the two web-file edits, and the two doc rewrites as one PR.
2. Verify with `openspec validate --all --strict`, `npm run lint`, `npm run build`, and `npm test`.
3. Archive the change with `/opsx:archive` once the deltas are validated, then re-read `openspec/specs/browser-gameplay/spec.md` to confirm the merged level requirement, the renamed popup requirement, and the surviving statistics requirement are consistent.
4. No data migration and no persisted state are involved: the demo seed and the engine id are not stored anywhere.

**Rollback:** revert `openspec/changes/cleanup-spec-drift`, `apps/pentix-web/src/engine/demo.ts`, `apps/pentix-web/src/engine/gameReducer.ts`, `README.md`, and `docs/foundation.md`. After an archive, restore the pre-change spec files from git (the removed requirements are in this change directory until it is archived). Nothing outside the web app and the documentation is affected.

## Open Questions

- Should a later change add `GameSessionEngine.setLevel` so the client stops writing `session.statistics.level` directly? (Working assumption: yes, as a small engine change with tests, so the engine keeps sole ownership of its snapshot; out of scope here.)
- Should the removed client-side action-log flush come back once the browser talks to `PentixServer`? (Working assumption: yes — it returns with the integration change, at which point the batch size can be chosen against a real upload path.)
- Should the `random` demo engine eventually be deleted together with its `demo-engines` requirement? (Working assumption: not yet; it is useful for demos and its own requirement says it can be removed independently.)

