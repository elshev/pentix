## Context

The web client renders one screen: `App.tsx` draws a `hero` header (eyebrow "Pentix", an `h1` "Play the rebuilt classic.", and a paragraph explaining the demo) and then `Game.tsx`, which owns every gameplay region. No styling is componentised — all layout lives in `apps/pentix-web/src/App.css`, driven by three CSS variables in `:root`:

```css
--cell-size: 22px;        /* board mino */
--mini-cell-size: 14px;   /* next-piece preview mino */
--piece-mini-cell: 5px;   /* per-piece counter mino */
```

The current `.game` grid is `auto minmax(200px, 1fr)` with named areas `stage hud / stage secondary / stage controls / stage settings / status`. The board occupies `stage`, and everything else fills a right-hand column: `Hud.tsx` (titled `MainStatistics`, one row of Next/Score/Level/Lines/Pieces), `SecondaryStats.tsx` (a `CollapsiblePanel` titled `Statistics`, `defaultOpen`), `Controls.tsx` (three button rows), and `Settings.tsx` (rotation direction, next-piece toggle, start-level picker, key hint). Overlays (paused, game over, demo badge) are absolutely positioned inside `.game__stage`.

Facts that constrain the change:

- `GameSessionStatistics` already carries `score`, `level`, `clearedLines`, `blocks`, `actions`, and `pieceCounts`; nothing in the engine needs to move.
- The `browser-gameplay` spec currently pins the HUD as a titled `MainStatistics` panel that includes Level, pins the secondary panel as "below the main statistics, open by default", and pins the per-piece counters at 5×5px minos in a fixed ten-per-row grid.
- `tests/pentix-*.test.mjs` are engine/reducer tests only (no DOM assertions), so layout work is not covered by automated tests; verification is `lint`, `build:web`, `test`, plus a visual check.
- The board size is data-driven (`session.board.width`/`height` are `12`/`22` for the default board and for the demo), so any width computed in CSS must not hardcode those numbers if it can be avoided.

## Goals / Non-Goals

**Goals:**

- Make each board mino 20% larger (`26.4px` at desktop, `19.2px` at the small breakpoint) while keeping the `12×22` grid.
- Reduce the page header to a single, larger `PENTIX` wordmark.
- Move the (title-less) statistics row and a dedicated level line above the board, and move every button beneath the board.
- Leave the area to the right of the board empty by collapsing the gameplay screen into one centered, board-width column.
- Keep the secondary statistics panel's content and toggle, but start it collapsed.

**Non-Goals:**

- Any change to `pentix-core`, `pentix-server`, the REST contract, `GameSessionStatistics`, the reducer state shape, keyboard bindings, gravity, scoring, or the demo.
- Changing the board's row/column count, the 29-piece catalog, or the 5px per-piece counter mino size.
- Removing the paused/game-over overlays, the demo badge, or the `Playing`/`Paused`/`Demo` status line.
- Introducing a component library, CSS framework, or per-component stylesheets.

## Decisions

1. **Express the enlargement as a ratio on the existing variables, not as new magic numbers.** `--cell-size: calc(22px * 1.2)` (`26.4px`) and `--mini-cell-size: calc(14px * 1.2)` (`16.8px`), with the `@media (max-width: 900px)` block switching to `calc(16px * 1.2)` (`19.2px`) and `calc(11px * 1.2)` (`13.2px`). `--piece-mini-cell` stays `5px` because the spec pins it. *Alternatives considered:* hardcoding `26px`/`19px` — rejected because the 20% intent becomes invisible and drifts on the next tweak; scaling `--piece-mini-cell` too — rejected because it would contradict an existing requirement and disturb the three-row counter grid.

2. **One centered column sized by the board's min-content width.** Replace the two-column `.game` grid with a single `.game__column` flex column (`display: flex; flex-direction: column; width: min-content; max-width: 100%`) inside `.game { display: grid; justify-items: center; }`. The board's cell tracks are fixed, so its `min-content` width equals the board width; because the column is sized by the *largest* child min-content — the board — every other block (statistics, level line, panel, controls) stretches to that width via the default `align-items: stretch`. *Alternatives considered:* `width: max-content` — rejected after checking a real render, because the unwrapped keyboard-hint paragraph contributes ~900px of max-content and stretched the column far past the board; computing the board width in CSS (`calc(12 * var(--cell-size) + 11 * 2px + 16px)`) — rejected because it duplicates the grid gap and board padding and breaks if the board size ever changes; keeping the two-column grid with an empty second column — rejected because the ask is explicitly for empty space, not a reserved column.

3. **The level is displayed by the bottom level selector, not by the statistics area.** The first render put `statistics.level` on its own line under the statistics; the follow-up review removed that line, so the current level is now shown only by highlighting the matching button in the ten-button selector beneath `Hard drop`. The statistics line therefore carries Score, Lines, and Pieces only. *Alternative considered:* keeping the line as well as the highlight — rejected as duplicated information on an already compact screen.

4. **The remaining settings move into the bottom button cluster.** Rotation direction is explicitly requested at the bottom; the next-piece toggle comes along because the right-hand column must end up empty, and the level buttons join `Controls` beneath `Hard drop`. *Alternative considered:* folding the settings into a third `CollapsiblePanel` under the controls — dropped along with `CollapsiblePanel` itself once the statistics became a popup.

5. **The statistics live in a drop-down popup owned by the Pieces counter.** `Hud` renders the `Pieces` counter as a button with `aria-expanded`/`aria-controls` and a `▸`/`▾` chevron, and renders `<SecondaryStats>` in an absolutely positioned `.stats-popup` anchored under the statistics row when open. `SecondaryStats` loses its `CollapsiblePanel` wrapper (that component and its CSS are deleted), so the popup body is the action counters plus the per-piece chips. *Alternatives considered:* a `<dialog>` modal — rejected because the popup should hang under the toggle without stealing focus from the game; keeping `CollapsiblePanel` — rejected because its toggle button would duplicate the new chevron.

6. **Opening the popup pauses the game, and closing resumes only what the popup paused.** For a player game the toggle dispatches `pause`/`resume` so every existing guard (gravity, move/rotate/drop, keyboard) applies unchanged, and `.overlay` is suppressed while the popup is open so the paused card does not fight the popup for the board. A `resumeOnClose` ref records whether *this* popup caused the pause, so a game the player had already paused stays paused. The attract demo has no paused phase, so the demo controller is simply gated with `phase === 'demo' && !statsOpen`. *Alternatives considered:* a dedicated `statsOpen` field in reducer state — rejected because the pause is already modelled by phase and no gameplay rule depends on the popup; a modal overlay in the game-over style — rejected for the same focus reason as above.

7. **Keep a semantic `h1` in the header.** `App.tsx` keeps `<header className="hero">` but contains only `<h1 className="hero__wordmark">PENTIX</h1>`; the `DEFAULT_BOARD_SIZE` and `PIECE_CATALOG` imports disappear with the paragraph so ESLint's unused-import rule stays green. The wordmark is now `clamp(1.2rem, 3vw, 2rem)` in a `0.3rem`-padded card, which halves the header height (~`46px` instead of ~`92px`). *Alternative considered:* deleting the header entirely — rejected because an accessible page title is worth keeping and the ask says to keep `PENTIX`, only smaller.

8. **Grid areas go away; existing block class names stay.** `.hud`, `.controls`, `.settings` lose their `grid-area` declarations and are simply stacked inside `.game__column`; `.game__stage` keeps `position: relative` so `.overlay` and `.demo-badge` remain anchored to the board. The `.status-line` becomes the last child of the column. *Alternative considered:* renaming the classes to `game__*` — rejected to keep the diff small and the class/host correspondence obvious.

9. **The per-piece counters wrap.** `.piece-counts` is a wrapping flex row of content-sized chips (`display: flex; flex-wrap: wrap; justify-content: center; gap: 0.4rem 0.6rem`) rather than a ten-per-row grid: ten 5px-mino counters plus counts need ~`400px`, more than the board-width popup, so a fixed grid overlapped the artwork. *Alternative considered:* shrinking the minos to 4px — rejected because the existing requirement pins 5px and it would still crowd the widest pieces.

10. **Level buttons are game actions, resolved in the reducer — and mid-game they may only raise the level.** `setStartingLevel` is the single action behind both the buttons and the `0`-`9` keys: while `playing`/`paused` it delegates to `changeLevel`, which applies the new level to the live session and the configured level only when it is *higher* than the session level (lowering would rewind the engine's own progression, so it returns the state untouched); it is ignored entirely while the game-over cooldown runs (the cooldown must block every exit, per the existing requirement); otherwise it updates the configured level via `changeLevel` (which also retunes the live demo session) and, in `game-over`, immediately starts a game at that level. `increaseLevel`/`decreaseLevel` (the `+`/`-` keys) step from `currentLevel` — the session's level during a player game, the configured level otherwise — so `+` raises a running game and `-` is a no-op there. The buttons are disabled per option (`levelLocked && option <= level`) and highlight `session.statistics.level`. *Alternatives considered:* a separate `startAtLevel` action — rejected as duplicate state changes; keeping every level button disabled mid-game — superseded by the raise-only rule; highlighting the configured level — rejected because it would not show the level the engine is actually running at.

11. **A `demo-over` phase gives the attract demo the player's game-over delay.** Instead of restarting the demo inside `applyAdvance`, a demo that reaches game-over moves to a new `demo-over` phase that keeps the finished session and board. `demoRestart` (dispatched by a `useDemoRestart` timer after `GAME_OVER_COOLDOWN_MS`) starts the next demo, so the delay is enforced once, by a hook, and no player-facing overlay is involved. Because `isActivePhase` excludes `demo-over`, ticks, drops, and demo steps are inert during the delay. *Alternatives considered:* a `demoRestartPending` boolean on the `demo` phase — rejected because every active-phase guard would need an extra check and the demo steps would still be accepted; reusing `gameOverReady` — rejected because it is pair to the player-facing overlay and would leak overlay semantics into the attract loop.

No runtime data flow changes beyond the above, so there is no new sequence to model. The resulting region layout is:

```text
┌──────────────────────────── hero ────────────────────────────┐
│                          PENTIX            (~46px tall)      │
└──────────────────────────────────────────────────────────────┘
                     .game__column (board width)
        ┌────────────────────────────────────────┐
        │ Score   Lines   Pieces ▸               │  Hud (no title)
        │ ┌────────────────────────────────────┐ │  .stats-popup
        │ │ Moves / Rotates / Drops            │ │  (drop-down, pauses
        │ │ ▮0 ▮0 ▮▮0 ...   (wrapping chips)   │ │   the game, over
        │ └────────────────────────────────────┘ │   the board top)
        ├────────────────────────────────────────┤
        │  12 × 22 board, 26.4px minos, overlays │  .game__stage
        ├────────────────────────────────────────┤
        │ ◀  ⟳ Rotate  ▶                         │
        │ Hard drop                              │
        │ 0 1 2 3 4 5 6 7 8 9   (level, current) │  Controls + Settings
        │ Pause   Restart                        │
        │ Rotation: clockwise   Next piece: off  │
        └────────────────────────────────────────┘
                        Playing                        .status-line
        (nothing to the right of the board)
```

## Risks / Trade-offs

- [The screen grows taller: a `26.4px` mino makes the board ≈ `639px` tall (`22 × 26.4` + gaps + padding), and statistics, level, controls, and level picker add ≈ `230px`] → Keep the header and inter-block gaps tight, accept page scrolling on short viewports, and accept that the playfield no longer fits above the fold on a 768px-tall screen.
- [`.game__column { width: max-content }` can exceed the viewport when a button label is long (e.g. `Rotation: anticlockwise`)] → `max-width: 100%` on the column, `flex-wrap: wrap` on button rows, and a check at `320px` and at the `900px` breakpoint.
- [Ten start-level buttons squeezed into ~`355px` makes ~`30px`-wide targets] → Keep `repeat(10, minmax(0, 1fr))` with tighter padding and a smaller font, and verify tapability at the mobile breakpoint.
- [Removing `Level` from the statistics row is an interpretation of "move level below the statistics"; the alternative reading is the start-level picker] → Level keeps a visible line above the board either way, the start-level picker stays in the bottom cluster, and the choice is recorded as an open question so it can be swapped cheaply.
- [Fractional mino sizes (`26.4px`, `16.8px`, `19.2px`, `13.2px`) may produce subpixel seams in the board grid] → Subpixel sizes already existed at the breakpoints; verify visually and, if seams appear, snap to whole pixels (`26px`/`19px`) while keeping the ~20% intent.
- [Three existing requirements are rewritten, so a partial MODIFIED block would silently lose detail at archive time] → The delta spec copies each full requirement block before editing it, and archiving happens only after implementation.
- [The statistics popup is absolutely positioned over the board, so it can hide the active piece while the player reads it] → The popup pauses the game (and the demo), so nothing is falling behind it; the popup is closed with the same toggle and is only as tall as the counters.
- [Popup-driven pause could resume a game the player paused deliberately] → A `resumeOnClose` ref records only pauses this popup caused, and only those are resumed; a manual pause stays paused (covered by a spec scenario).
- [`setStartingLevel` now starts games, so a stray board click could restart play] → It is inert during the game-over cooldown, and mid-game it can only raise the level (never restart or lower it), so a stray click cannot discard a run or slow it down; reducer tests pin all three guards.
- [Raising the level mid-game is irreversible, so a mis-click speeds the game up permanently] → The raise is an explicit level-button or `+` press on a per-option enabled button; there is no auto-repeat path, and lowering is intentionally refused. Restarting is always available if a player overshoots.
- [Adding a `demo-over` phase could leave the demo stuck if the timer never fires] → The phase is only ever left through `demoRestart`, which the `useDemoRestart` timer always dispatches after `GAME_OVER_COOLDOWN_MS`; `Space`/`Enter` and the level buttons also leave it, so the screen is never dead.
- [The level highlight uses the live session level, which can rise mid-game] → Intended: the engine raises the level every 30 locked pieces, so the highlight follows the real level; the buttons are disabled during play anyway.

## Migration Plan

1. Land the CSS variable changes, the `.game` single-column grid, the header reduction, the popup, the level selector, and the reducer/key-map changes as one PR.
2. Verify with `npm run dev:web` (visual layout at desktop, `900px`, and `500px` widths, plus the open popup), then `npm run lint`, `npm run build:web`, and `npm test`.
3. No data migration and no persisted state are involved — settings live in reducer memory only.

**Rollback:** revert the touched `apps/pentix-web` files (`App.tsx`, `App.css`, `Game.tsx`, `Hud.tsx`, `SecondaryStats.tsx`, `Controls.tsx`, `Settings.tsx`, `useDemoRestart.ts`, `gameReducer.ts`, `keyMap.ts`), restore `CollapsiblePanel.tsx`, and revert `tests/pentix-web.test.mjs`, to restore 22px minos, the hero copy, the two-column layout, the titled HUD, the collapsible panel, the level picker in settings, and the immediate demo restart. Nothing outside the web app is affected.

## Open Questions

- Should the start-level picker and next-piece toggle stay visible in the bottom cluster, or move into a collapsed panel under the controls? (Resolved: they stay visible; the level picker moved into the controls.)
- Should the `PENTIX` wordmark be centered or left-aligned over the column? (Resolved: centered.)
- Keep the `Playing`/`Paused`/`Demo` status line under the controls? (Working assumption: keep it — it is not part of the top panel.)
- Should the popup also close on `Escape` or on a click outside it? (Working assumption: the toggle is the only control for now; add Escape handling if players ask.)
