# Pentix

Pentix is a modern TypeScript reboot of a legacy Delphi Pentix/Tetris project. The repository is being prepared for two applications that share the same game-domain code:

- `PentixServer`: the future backend responsible for players, Pentix games, and Pentix game history
- `Pentix` web browser application: the future client that will render boards, statistics, menus, and game flow in the browser

This first implementation increment does not build the full game yet. It establishes the repository layout, creates an empty `PentixServer`, and ports the legacy piece definitions into shared TypeScript code.

## Glossary

- `Mino`: one square of a piece
- `Piece`: a Pentix figure that contains from 1 to 5 minos
- `Board`: rectangular playfield
- `BoardCell`: one cell of the board
- `GameLevel`: difficulty level; higher level means higher speed
- `Tick`: unit of internal game time
- `PentixGame`: one game for many players
- `PentixGameSession`: one game for one player

## Repository Layout

```text
apps/
  pentix-server/   Empty server bootstrap
  pentix-web/      Browser application shell
packages/
  pentix-core/     Shared Pentix domain primitives
delphi/
  Tetris.pas       Legacy Delphi source used as the migration reference
docs/
  foundation.md    Notes about the current foundation change
```

## Current Foundation Scope

The codebase currently includes:

- an empty `PentixServer` bootstrap implemented with Node.js and TypeScript
- a shared `pentix-core` package with:
  - `Piece`
  - `Offset`
  - Delphi-compatible rotation behavior
  - the full legacy piece catalog
  - `Board` and `BoardCell`
- a lightweight browser placeholder that imports the shared piece catalog

The following are intentionally not implemented yet:

- player management endpoints
- PentixGame creation and next-piece endpoints
- PentixGame history endpoints
- browser gameplay, scoring, ticks, and UI behavior from the final product goals

## Commands

- `npm run build`: build the shared core, server, and web app
- `npm run start:server`: build and start the empty PentixServer
- `npm run dev:web`: run the browser app with Vite
- `npm run test`: verify the shared piece catalog and server bootstrap
- `npm run lint`: run ESLint across the repository

## Legacy Notes

The initial piece catalog is ported from [Tetris.pas](C:/ai/pentix/delphi/Tetris.pas). Most pieces occupy `(0, 0)` as the rotation-center mino. One known exception is `5Corner`, whose legacy Delphi offsets rotate around an empty origin; this repository intentionally preserves that behavior for parity with the original code.

More detail about the current foundation change lives in [docs/foundation.md](C:/ai/pentix/docs/foundation.md).
