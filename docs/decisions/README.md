# Decision records

This page indexes the decision records of the repository. A decision record states the context of one choice, the alternatives, and the reason for the choice.

A spec states what must stay true. A decision record states why one option won. The two files have different jobs, and a spec is not a decision record. The [glossary](../../GLOSSARY.md) repeats that distinction under **Process artifacts**.

## How to use this index

1. Find the record by date, by change, or by scope.
2. Open the `design.md` link for the context and the reason.
3. Read the status. A superseded record is history. The record that replaced it holds the current rule.

A status needs evidence in the records. A later record names the earlier decision that it replaces. When no record names the older decision, the status stays `Accepted`.

Allowed status values:

- `Accepted` — no later record replaces this decision.
- `Partly superseded by <record>` — a later record replaces some decisions of this record. The rest still stand.
- `Superseded by <record>` — a later record replaces the decision of this record.

## Records

| Date | Record | Scope | Status |
| --- | --- | --- | --- |
| 2026-04-06 | [bootstrap-pentix-server-foundation](../../openspec/changes/archive/2026-04-06-bootstrap-pentix-server-foundation/design.md) | Workspace layout, shared piece primitives, Delphi catalog port, `5Corner` parity, server scaffold | Accepted |
| 2026-10-26 | [add-start-game-session](../../openspec/changes/archive/2026-10-26-add-start-game-session/design.md) | Session-start contract, serializable session snapshot, opening statistics | Partly superseded by [separate-games-and-sessions](../../openspec/changes/archive/2026-10-29-separate-games-and-sessions/design.md) |
| 2026-10-29 | [separate-games-and-sessions](../../openspec/changes/archive/2026-10-29-separate-games-and-sessions/design.md) | Game owns the piece sequence, session owns the cursor, `sessionId` renamed to `id`, `POST` for state changes | Partly superseded by [add-user-management](../../openspec/changes/archive/2026-10-30-add-user-management/design.md) |
| 2026-10-30 | [add-user-management](../../openspec/changes/archive/2026-10-30-add-user-management/design.md) | `User` in `pentix-core`, UUIDv7 identity, duplicate name returns `409`, required `userId` on session start | Accepted |
| 2026-11-04 | [add-gameplay-mechanics](../../openspec/changes/archive/2026-11-04-add-gameplay-mechanics/design.md) | Pure gameplay functions, `game-over` status, `blocks` counter, Delphi scoring and leveling | Partly superseded by [http-and-engine-refactoring](../../openspec/changes/archive/2026-11-06-http-and-engine-refactoring/design.md) |
| 2026-11-06 | [http-and-engine-refactoring](../../openspec/changes/archive/2026-11-06-http-and-engine-refactoring/design.md) | `GameSessionEngine` class in `session-engine.ts`, HTTP primitives split from the handler | Partly superseded by [use-hono-as-http](../../openspec/changes/archive/2026-11-06-use-hono-as-http/design.md) |
| 2026-11-06 | [use-hono-as-http](../../openspec/changes/archive/2026-11-06-use-hono-as-http/design.md) | Hono adapter server, declarative routes, unchanged status codes and content type | Partly superseded by [add-api-reference-ui](../../openspec/changes/archive/2026-11-25-add-api-reference-ui/design.md) |
| 2026-11-13 | [add-browser-gameplay-ui](../../openspec/changes/archive/2026-11-13-add-browser-gameplay-ui/design.md) | Client-local engine instead of the REST API, React reducer state, board and controls | Partly superseded by [move-statistics-to-engine](../../openspec/changes/archive/2026-11-15-move-statistics-to-engine/design.md) and [reorganize-ui](../../openspec/changes/archive/2026-11-16-reorganize-ui/design.md) |
| 2026-11-14 | [add-demo-mode](../../openspec/changes/archive/2026-11-14-add-demo-mode/design.md) | `demo` phase instead of `ready`, Delphi demo parity, auto-play rules | Partly superseded by [improve-demo-level-management](../../openspec/changes/archive/2026-11-15-improve-demo-level-management/design.md) and [fix-demo-cycle-timing](../../openspec/changes/archive/2026-11-17-fix-demo-cycle-timing/design.md) |
| 2026-11-14 | [add-game-piece-set](../../openspec/changes/archive/2026-11-14-add-game-piece-set/design.md) | Available-piece set on `PentixGame`, private builder, Tetris preset | Accepted |
| 2026-11-14 | [add-session-replay-log](../../openspec/changes/archive/2026-11-14-add-session-replay-log/design.md) | Action alphabet without soft drop, per-piece action log, deterministic replay | Accepted |
| 2026-11-14 | [introduce-storage-repositories](../../openspec/changes/archive/2026-11-14-introduce-storage-repositories/design.md) | Repository interface for each entity, in-memory and SQLite implementations | Accepted |
| 2026-11-15 | [add-demo-engines-registry](../../openspec/changes/archive/2026-11-15-add-demo-engines-registry/design.md) | Demo-engine contract in `pentix-core`, validating registry, one module per engine | Partly superseded by [add-ai-demo-engines](../../openspec/changes/archive/2026-11-17-add-ai-demo-engines/design.md) |
| 2026-11-15 | [demo-last-tick-move](../../openspec/changes/archive/2026-11-15-demo-last-tick-move/design.md) | Destination planner compares one-column side-steps, last-tick move scores the further landing | Partly superseded by [improve-demo-engines](../../openspec/changes/archive/2026-11-17-improve-demo-engines/design.md) and [fix-demo-cycle-timing](../../openspec/changes/archive/2026-11-17-fix-demo-cycle-timing/design.md) |
| 2026-11-15 | [improve-demo-contact-tiebreak](../../openspec/changes/archive/2026-11-15-improve-demo-contact-tiebreak/design.md) | Contact scoring and tie-break for the classic destination planner | Accepted |
| 2026-11-15 | [improve-demo-level-management](../../openspec/changes/archive/2026-11-15-improve-demo-level-management/design.md) | Level controls clamp to `0`–`9`, default level `9`, Delphi tick interval, demo retune | Accepted |
| 2026-11-15 | [move-statistics-to-engine](../../openspec/changes/archive/2026-11-15-move-statistics-to-engine/design.md) | Action and per-piece counters in `GameSessionStatistics` instead of the browser reducer | Accepted |
| 2026-11-15 | [statistic-display](../../openspec/changes/archive/2026-11-15-statistic-display/design.md) | Client-side statistic collection and locked-piece attribution | Superseded by [move-statistics-to-engine](../../openspec/changes/archive/2026-11-15-move-statistics-to-engine/design.md) |
| 2026-11-16 | [add-demo-boards](../../openspec/changes/archive/2026-11-16-add-demo-boards/design.md) | Demo board set in the reducer, one factory, shared piece sequence, registry-driven rail | Partly superseded by [switch-main-demo](../../openspec/changes/archive/2026-11-16-switch-main-demo/design.md) and [add-ai-demo-engines](../../openspec/changes/archive/2026-11-17-add-ai-demo-engines/design.md) |
| 2026-11-16 | [cleanup-spec-drift](../../openspec/changes/archive/2026-11-16-cleanup-spec-drift/design.md) | Spec text corrections, level ownership, one merged level requirement | Accepted |
| 2026-11-16 | [reorganize-ui](../../openspec/changes/archive/2026-11-16-reorganize-ui/design.md) | 20% larger minos, one centered column, statistics above the board | Accepted |
| 2026-11-16 | [switch-main-demo](../../openspec/changes/archive/2026-11-16-switch-main-demo/design.md) | Main board engine id in `GameState`, default engine `random` | Superseded by [add-ai-demo-engines](../../openspec/changes/archive/2026-11-17-add-ai-demo-engines/design.md) |
| 2026-11-17 | [add-ai-demo-engines](../../openspec/changes/archive/2026-11-17-add-ai-demo-engines/design.md) | One file with four exports, authored-plan adapter, seven engines, `delphi5` as default | Partly superseded by [add-7-ai-engines](../../openspec/changes/archive/2026-11-21-add-7-ai-engines/design.md) |
| 2026-11-17 | [improve-demo-engines](../../openspec/changes/archive/2026-11-17-improve-demo-engines/design.md) | Last-tick log shape, combined demo step, classic heuristic on the `0`/`1` board, memoized offsets | Partly superseded by [fix-demo-cycle-timing](../../openspec/changes/archive/2026-11-17-fix-demo-cycle-timing/design.md) |
| 2026-11-17 | [fix-demo-cycle-timing](../../openspec/changes/archive/2026-11-17-fix-demo-cycle-timing/design.md) | Gravity step and steering step split, one clock per board, board-set cycle restart, Space semantics | Accepted |
| 2026-11-21 | [add-7-ai-engines](../../openspec/changes/archive/2026-11-21-add-7-ai-engines/design.md) | `<vendor>-<version>[-<variant>]-<mode>-demo-engine.ts` grammar, seven engines, demo-board card | Accepted |
| 2026-11-25 | [add-api-reference-ui](../../openspec/changes/archive/2026-11-25-add-api-reference-ui/design.md) | Schema-first routes through `@hono/zod-openapi`, `/openapi.json`, `/docs`, `415` rule | Accepted |
| 2026-11-25 | [add-server-play-demo](../../openspec/changes/archive/2026-11-25-add-server-play-demo/design.md) | Demo playback in `pentix-core`, background demo runs, standings, no UI | Accepted |
| 2026-11-26 | [add-glossary-and-decision-index](../../openspec/changes/archive/2026-11-26-add-glossary-and-decision-index/design.md) | Glossary at the repository root, decision index over the archive, project rule for the index row | Accepted |

## Standing decisions

A standing decision outlives its change, so `docs/foundation.md` states it in prose.

| Decision | Where it lives | Status |
| --- | --- | --- |
| `5Corner` keeps its empty `(0, 0)` rotation point for legacy parity | [foundation.md](../foundation.md#5corner-decision) | Accepted |
| Shared names are readable TypeScript names, not Delphi names | [foundation.md](../foundation.md#shared-piece-model) | Accepted |
| SQLite persistence uses the built-in `node:sqlite` module with no native dependency | [foundation.md](../foundation.md#persistence) | Accepted |
| The glossary is `GLOSSARY.md` at the repository root | [GLOSSARY.md](../../GLOSSARY.md) | Accepted |
| Ported agent skills are vendored in the repository, not installed by an upstream installer | [agent-skills.md](../agent-skills.md#update-model) | Accepted |

| 2026-11-15 | [delay-after-game-over](../../openspec/changes/archive/2026-11-15-delay-after-game-over/design.md) | Game-over cooldown in reducer state (`gameOverReady`) | Superseded by [fix-demo-cycle-timing](../../openspec/changes/archive/2026-11-17-fix-demo-cycle-timing/design.md) |
