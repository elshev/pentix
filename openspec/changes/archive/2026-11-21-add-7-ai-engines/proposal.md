# add-7-ai-engines

## Why

`docs/demo-engine-task.md` has been handed unchanged to several LLMs, and seven standalone `plan` functions now sit as loose files in `c:\ai\temp`. The demo-engine contract, the validating registry, and the registry-driven rail already exist, so the only thing keeping those planners out of the product is that no one has wrapped them as engine modules and registered them. At the same time the demo-board card still assumes two engines: it prints its engine name and description through a native tooltip, shows `Score: …, Lines: …, Pieces: …` labels that wrap, and repeats `Game over` in the header even though the main board already shows that state as an overlay.

## What Changes

- Adopt a documented file-naming convention for AI-authored demo-engine modules so the file name tells the whole story — vendor, version, variant, and mode (`Extra`, `Max`) — while keeping the existing `<engine-id>-demo-engine.ts` rule. The bracketed reproduction note (thinking time, `Chat`) is no longer part of the file name; it lives in the engine's `description`.
- Add seven engine modules under `packages/pentix-core/src/demo-engines/`, each wrapping one authored `plan` function verbatim and supplying `id`, `name`, and a `description` that repeats the name in more detail and folds in the bracketed note. `GigaChat` is not added: its plan is the weakest of the set and adds no distinct strategy.
- Add a shared adapter on the demo-engine toolkit that turns an authored `plan` function into a contract `plan`: it copies the read-only contract inputs into the mutable shapes the brief promises, catches a throwing plan, and trims the returned string to a legal action log (only `L`, `R`, `C`, `A`, `H`, at most one lateral move after the first `H`).
- Register the seven modules in `demo-engines/index.ts` after `delphi5` and `random`, so the rail reaches nine boards (still inside its twelve-slot capacity) with no browser-client change.
- Make Delphi 5 the default engine: the registry default is already `delphi5`, and the main board's attract demo now starts on `delphi5` instead of `random`, so a fresh page shows the classic heuristic on the main board and in slot 1.
- Revise `docs/demo-engine-task.md`: answers must be self-contained (no cache, no code or context from another chat, only the pure function), must carry a short algorithm comment before the function, and must end the log at `H` whenever the chosen placement is reachable by a straight drop — the one post-drop side-step is reserved for pockets a drop cannot enter.
- Rework the demo-board card: the header's first row is the engine name only, with an `i` info icon whose hover/focus panel shows the name and description; the statistics row becomes the single line `S: …, L: …, P: …` at a slightly larger font; and the game-over marker moves from the header to a board overlay that lists the final `Score`, `Lines`, and `Pieces` in a slightly larger font than the card line.
- Update the node tests for the new engine count, the engine catalog assertions, and the demo-board card markup, and update `README.md` and `docs/foundation.md` to describe the engines and the naming convention.

## Capabilities

### New Capabilities

None — the change extends capabilities that already exist.

### Modified Capabilities

- `demo-engines`: the built-in catalog grows from two to nine engines (the eight-answer set minus `GigaChat`); every AI-authored engine ships as an `<engine-id>-demo-engine.ts` module whose id encodes vendor, version, variant, and mode — never the bracketed reproduction note — wraps the authored `plan` through one shared adapter, and appears in registry order after `delphi5` and `random`; a plan ends at `H` whenever a straight drop reaches its target.
- `demo-boards`: the card header's first row shows only the engine name next to an `i` info icon that reveals name and description on hover/focus, the primary statistics collapse to the one-line `S`/`L`/`P` row at a slightly larger font, and a finished board shows its `Game over` state as a board overlay that lists the final score, lines, and pieces instead of a header marker; the main board's attract demo starts on `delphi5`.
- `demo-mode`: the main board's attract-demo engine is initialized to `delphi5` on the initial page load instead of `random`.
- `repository-documentation`: the repository documentation describes the nine registered engines, the file-naming convention an AI-authored engine follows, the self-contained-answer and algorithm-comment requirements of the brief, and its drop-before-side-step rule.

## Impact

- **Affected code**: `packages/pentix-core/src/demo-engines/` (seven new modules plus `index.ts`), `packages/pentix-core/src/demo-engine-toolkit.ts` (adapter), `packages/pentix-core/src/index.ts` (public export), `apps/pentix-web/src/engine/gameReducer.ts` (`MAIN_DEMO_ENGINE_ID`), `apps/pentix-web/src/games/pentix/DemoBoard.tsx`, `apps/pentix-web/src/App.css`.
- **Tests**: `tests/pentix-core.test.mjs` (catalog order, module names, per-engine plan validity, no needless side-step on an empty board), `tests/pentix-web.test.mjs` (rail size, slot ids, initial engine, swap/session assertions that assume two boards).
- **Docs**: `README.md`, `docs/foundation.md`, `docs/demo-engine-task.md`.
- **Unaffected**: `apps/pentix-server`, storage repositories, session replay, HTTP endpoints, and every player-game path. No new dependency, schema, or persisted state.
- **Affected teams**: the shared-core maintainers (engine catalog, toolkit, and authoring brief) and the browser-client maintainers (demo-board card and its CSS). No server or infrastructure team is involved.
- **Rollback plan**: revert the change commit. The new modules are additive and the registry is rebuilt at runtime, so removing the seven catalog entries (or reverting the commit) restores the two-engine rail; the brief, the default-engine constant, and the card revert in the same commit. Sessions are not persisted, so no data migration or cleanup is needed.

