## 1. Demo debug leftovers

- [x] 1.1 In `apps/pentix-web/src/engine/demo.ts`, set `ACTIVE_DEMO_ENGINE_ID` to `'delphi5'` and replace the `TEMPORARY` comment with a note that the client uses the registry's default engine.
- [x] 1.2 In `apps/pentix-web/src/engine/gameReducer.ts`, delete `DEMO_SEED_SETTLED_MINO` and `seedDemoBoard`, and drop the two `phase === 'demo' ? seedDemoBoard(session) : session` wrappers so demo sessions start from the engine's opening board.
- [x] 1.3 Search the repository for `seedDemoBoard`, `DEMO_SEED_SETTLED_MINO`, and `ACTIVE_DEMO_ENGINE_ID` and confirm only the reverted constant remains; run `npm run lint`.

## 2. `browser-gameplay` delta

- [x] 2.1 Compare every `## MODIFIED` requirement in `openspec/changes/cleanup-spec-drift/specs/browser-gameplay/spec.md` with its namesake in `openspec/specs/browser-gameplay/spec.md`: the names must match verbatim and no scenario may be missing (board `3`→`4`, controls `3`→`4`, header `1`→`1`, level buttons `6`→`10`).
- [x] 2.2 Confirm the four `## REMOVED` requirement names exist in the main spec, and that their scenarios survive: the popup requirement carries `5` popup scenarios plus the `3` from the removed statistics requirement; the lifecycle requirement carries `4` plus the new `demo-over` one; the merged level requirement carries the `+`/`-` and default-level cases.
- [x] 2.3 Confirm no remaining requirement in the main spec mentions the removed titles, a "secondary statistics panel", or a `Start level:` control; the HUD requirement may keep its "no secondary panel" prohibition because it now matches the renamed popup requirement.

## 3. Other capability deltas

- [x] 3.1 `demo-mode`: confirm the two `REMOVED` names match the main spec and that the modified "The demo imitates player actions within the shared engine" block keeps all five original scenarios plus the default-engine one.
- [x] 3.2 `session-replay`: confirm "Recorded actions flush in bounded batches" is removed, that `SOME_CACHE_PIECE_COUNT` no longer appears anywhere, and that the new server-log requirement's codes and grouping match `packages/pentix-core/src/session-log.ts` and `apps/pentix-server/src/server.ts`.
- [x] 3.3 `pentix-server-bootstrap`: confirm the removed "empty PentixServer application" name matches, and that the replacement names every route in `apps/pentix-server/src/app.ts` exactly once.
- [x] 3.4 `repository-documentation` and `shared-game-primitives`: confirm the removed/modified names match the main specs, and that the copied catalog table is byte-identical to the current one apart from the `name`/`bi*` sentence.


## 4. Spec hygiene

- [x] 4.1 Replace the `TBD - created by archiving change …` purpose in `openspec/specs/demo-engines/spec.md` with a sentence describing the demo-engine contract, the registry, and the built-in engines.
- [x] 4.2 Replace the `TBD` purpose in `openspec/specs/game-session-engine/spec.md` with a sentence describing the stateless `GameSessionEngine` operations.
- [x] 4.3 Replace the `TBD` purpose in `openspec/specs/user-management/spec.md` with a sentence describing the `User` primitive and the user endpoints.
- [x] 4.4 Replace the `TBD` purpose in `openspec/specs/gameplay-mechanics/spec.md` with a sentence describing the shared movement, gravity, locking, clearing, scoring, and leveling rules.
- [x] 4.5 Add the missing `# <capability> Specification` heading to `game-session-start`, `pentix-server-bootstrap`, `repository-documentation`, and `shared-game-primitives`.
- [x] 4.6 Normalize scenario spacing: add the blank line between `#### Scenario: …` and its first `- **GIVEN**` bullet in `game-lifecycle`, `game-piece-set`, `game-session-engine`, `game-session-start`, `gameplay-mechanics`, `pentix-server-bootstrap`, `repository-documentation`, `session-replay`, `shared-game-primitives`, `storage-repositories`, and `user-management`.
- [x] 4.7 Search `openspec/specs/**/spec.md` for `TBD`, `SOME_CACHE`, `` previous `22px` baseline ``, `former height`, and `SHALL be removed`, and confirm no diff-from-the-past requirement remains.

## 5. Documentation refresh

- [x] 5.1 Rewrite the `README.md` "Current Foundation Scope" section: the browser application is a working client (board, statistics popup, level selector, settings, attract demo), not a placeholder; keep the accurate server API and persistence sections.
- [x] 5.2 Fix the `README.md` glossary entry for `PentixGame` so pieces are identified by catalog `key` rather than "an ID and a name", and restate the "intentionally not implemented yet" list as durable history endpoints, a PostgreSQL repository, multiplayer orchestration, and the missing browser-to-server connection.
- [x] 5.3 Update `docs/foundation.md`: describe `apps/pentix-web` as the gameplay client with demo mode, drop the "each with an ID and a name" wording, and replace the "Next Likely Steps" list with the same remaining gaps.
- [x] 5.4 Search both files for `placeholder`, `a name`, `not implemented yet`, and `first implementation increment`, and confirm every hit describes the current state.

## 6. Verification

- [x] 6.1 Run the OpenSpec validator over the change and the specs (`openspec validate cleanup-spec-drift --strict` and `openspec validate --all --strict`) and fix anything it reports.
- [x] 6.2 Run `npm run lint` and `npm run build` and confirm both succeed.
- [x] 6.3 Run `npm test` and confirm the core, server, and web suites still pass unchanged; add or adjust a web test only if a test pinned the removed seed or the temporary engine id.
- [x] 6.4 Run `npm run dev:web` and check the demo plays the `delphi5` planner on an empty board, that the level selector still retunes it, and that a player game still starts at level `9`.
- [x] 6.5 Archive the change with `/opsx:archive` and re-read the merged `openspec/specs/browser-gameplay/spec.md`, `demo-mode`, `session-replay`, `pentix-server-bootstrap`, `repository-documentation`, and `shared-game-primitives` to confirm the removals, additions, and retitles landed and no scenario was lost.
