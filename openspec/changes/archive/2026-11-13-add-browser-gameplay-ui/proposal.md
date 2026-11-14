## Why

The browser app today is only a foundation landing page: it previews the shared board size and piece catalog but cannot play Pentix. The shared `pentix-core` engine already implements movement, rotation, gravity, drop, scoring, line clearing, and game-over, and the server already exposes the matching endpoints, so the missing piece is the interactive client. Adding browser gameplay fulfills the explicitly deferred goal of "browser gameplay, scoring, ticks, and UI behavior from the final product goals" and gives users a way to actually experience the ported game.

## What Changes

- Add an interactive, self-contained gameplay UI to `apps/pentix-web` that drives the shared `pentix-core` engine locally (no server required to play).
- Render the shared 12×22 board, showing occupied cells and overlaying the active piece.
- Add keyboard controls — move left/right, rotate, soft drop, hard drop — plus visible on-screen controls for discoverability, and pause/restart.
- Add a gravity loop (`tick`) whose cadence speeds up with the player's level.
- Add a heads-up display showing score, level, cleared lines, and a next-piece preview.
- Add a start / pause / game-over / restart flow driven by the session `status` (`active` vs `game-over`).
- Replace the static foundation landing content with the playable game screen (the foundation summary remains available as the pre-game/start state if useful).

## Capabilities

### New Capabilities

- `browser-gameplay`: the interactive client that renders the shared board, translates keyboard/button input into shared-engine operations, runs the gravity loop, displays live score/level/lines and a next-piece preview, and manages start, pause, game-over, and restart states.

### Modified Capabilities

<!-- none -->

## Impact

- **Affected code**: `apps/pentix-web/src/**` only (the App shell, a new game loop under `src/engine`, board/control components under `src/games/pentix` and `src/ui`, and CSS). No changes to `pentix-core`, `pentix-server`, or the server API contract.
- **Dependencies**: no new packages; reuses React 19, Vite, and the existing `#pentix/core` alias.
- **Affected teams**: the frontend/game-development stream. Server and shared-core owners are not affected because this change consumes, but does not modify, the engine and API.
- **Rollback plan**: the change is fully additive within `apps/pentix-web`. Rolling back means reverting the web-app files and restoring the foundation landing page; because `pentix-core` and `pentix-server` are untouched, rollback is isolated and carries no risk to the server contract or other applications.