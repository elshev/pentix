## Why

The specs and the repository docs have drifted away from the code that ships: `demo-mode` still says the attract demo restarts **immediately** on game over (it waits `700` ms), a `browser-gameplay` requirement is titled "secondary statistics panel" while describing the popup that another requirement says must not exist, level control behaviour is stated three times in two capabilities, `session-replay` flushes "after `SOME_CACHE_PIECE_COUNT` pieces" — a constant that exists nowhere — and `README.md`/`docs/foundation.md` still call the browser a placeholder. On top of that, two temporary demo debug hacks are enabled on `main` (the `random` demo engine and a randomly seeded settled mino). Every one of these makes the specs a weaker contract for the next change, and none of them changes gameplay.

## What Changes

- **One level requirement.** `browser-gameplay` merges "Level controls adjust the configured starting level" (the `+`/`-` keys, the `9` default, the `0`-`9` clamp) into "The level buttons select the level, start a game, or retune the demo", which already owns the buttons, the demo retune, the game-over start and the clamp. The merged requirement also documents the `0`-`9` digit keys, which were never specified. **BREAKING (spec-level)**: the old `+`/`-` requirement is removed.
- **One demo-level statement.** `demo-mode`'s "The demo follows manual level changes" is removed; the merged `browser-gameplay` requirement already covers the demo retune and the "configured level carries into the next session" cases.
- **Demo restart has one owner.** `demo-mode`'s "The demo restarts automatically on game over" (immediate restart) is removed; `browser-gameplay`'s "The attract demo restarts after the game-over delay" and the game-over cooldown requirement stay as the single source of truth. **BREAKING (spec-level)**: the demo-mode restart requirement is removed.
- **Statistics covered once.** The misnamed requirement "The client shows a secondary statistics panel below the main statistics" is renamed to describe the pieces statistics popup, and "The client displays the engine-owned action and per-piece statistics" is folded into it (its scenarios move across), taking `browser-gameplay` from three overlapping statistics requirements to two.
- **The attract demo uses the registry default engine.** `ACTIVE_DEMO_ENGINE_ID` goes back to `delphi5`, the seeding of a random settled mino (`DEMO_SEED_SETTLED_MINO`, `seedDemoBoard`) is deleted, and `demo-mode` states that the client uses the registry's default engine instead of a hardcoded id. The temporary `random` engine itself stays registered and specified.
- **Spec hygiene.** The four `TBD - created by archiving change …` purposes (`demo-engines`, `game-session-engine`, `user-management`, `gameplay-mechanics`) are written, the four specs missing a `# <capability> Specification` heading (`game-session-start`, `pentix-server-bootstrap`, `repository-documentation`, `shared-game-primitives`) get one, scenario spacing is normalized, and requirements that describe a *diff from a past state* ("20% larger than the previous `22px` baseline", "half of its previous height (~46px instead of ~92px)", "no `Start level:` label and no incremental level button", "Manual soft drop is removed") are restated as current behaviour.
- **Session replay describes what exists.** The client-side flush requirement built on `SOME_CACHE_PIECE_COUNT` is replaced by the server-side behaviour that is implemented (each gameplay request appends `T`/`L`/`R`/`C`/`A`/`H` to the session's action log and the log is persisted, replayed on load), and `browser-gameplay` stops claiming the UI records actions it never sends anywhere.
- **Server bootstrap stops re-listing routes.** `pentix-server-bootstrap` names the capabilities that own each endpoint instead of duplicating the route list that `game-lifecycle`, `game-session-start`, `user-management` and `gameplay-mechanics` already define.
- **Documentation contract is not historical.** `repository-documentation` requires docs that describe the system as built (browser client with demo mode, server endpoints, shared core) instead of "the first implementation increment"; `README.md` and `docs/foundation.md` are refreshed accordingly.


## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `browser-gameplay`: one level-selection requirement (merged `+`/`-`, digit keys, default `9`, buttons, demo retune, game-over start, raise-only mid-game); the pieces statistics popup requirement is renamed and absorbs the engine-owned statistics requirement; the board-sizing, header, and control requirements lose their diff-from-the-past phrasing; the action-recording clause is dropped and the local, non-persisted session is stated instead; the `2`-key example in the level scenario is corrected.
- `demo-mode`: removes "The demo restarts automatically on game over" (superseded by the `700` ms delay) and "The demo follows manual level changes" (superseded by the merged level requirement); states that the demo uses the registry's default engine.
- `session-replay`: replaces the unimplemented client flush requirement (`SOME_CACHE_PIECE_COUNT`) with the implemented server-side action-log append/persist/replay behaviour.
- `pentix-server-bootstrap`: the endpoint list is replaced by references to the capabilities that own those endpoints.
- `repository-documentation`: the documentation requirement covers the system as built rather than the bootstrap increment and the starter README.
- `shared-game-primitives`: the catalog requirement states that entries do not expose a `name` field or `bi*` keys, instead of requiring those fields to be "removed" (a migration already done).

## Impact

- **Specs**: `openspec/specs/browser-gameplay`, `demo-mode`, `session-replay`, `pentix-server-bootstrap`, `repository-documentation`, `shared-game-primitives` (through this change's deltas), plus direct Purpose/heading/format edits in all fourteen specs.
- **Code**: `apps/pentix-web/src/engine/demo.ts` (`ACTIVE_DEMO_ENGINE_ID` → `'delphi5'`), `apps/pentix-web/src/engine/gameReducer.ts` (delete `DEMO_SEED_SETTLED_MINO` and `seedDemoBoard`, drop the two `seedDemoBoard` call sites). No change to `packages/pentix-core`, `apps/pentix-server`, the REST contract, or gameplay behaviour.
- **Docs**: `README.md` and `docs/foundation.md` (browser is no longer a placeholder, glossary drops the removed piece `name` field, shipped features and remaining gaps are restated).
- **Tests**: `tests/pentix-web.test.mjs` only if a test pins the removed seeding or the temporary engine id; otherwise the existing suites are unchanged. Verification is `npm run lint`, `npm run build`, `npm test`, and `openspec validate --all --strict`.
- **Affected teams**: the spec owner and the frontend/game-UI stream. Shared-core, server and storage owners are unaffected — nothing they depend on changes.
- **Rollback plan**: revert the change directory (`openspec/changes/cleanup-spec-drift`) and the two web files; if the change was already archived, re-add the removed requirements and revert the spec/doc edits from git. No data migration, no persisted state, no API surface change, and no engine behaviour change, so rollback carries no risk to users or other packages.
