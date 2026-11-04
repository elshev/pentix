# Pentix

Pentix is a modern TypeScript reboot of a legacy Delphi Pentix/Tetris project. The repository is being prepared for two applications that share the same game-domain code:

- `PentixServer`: the future backend responsible for players, Pentix games, and Pentix game history
- `Pentix` web browser application: the future client that will render boards, statistics, menus, and game flow in the browser

This implementation increment does not build the full game yet. It establishes the repository layout, adds narrow `PentixServer` game and session lifecycle endpoints, and shares the legacy piece, board, game, and session primitives across TypeScript code.

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
  pentix-server/   Server with game/session lifecycle APIs
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

- a `PentixServer` implemented with Node.js and TypeScript, including game creation, session start, next-piece, and gameplay (move/rotate/tick/drop) endpoints
- a shared `pentix-core` package with:
  - `Piece`
  - `Offset`
  - Delphi-compatible rotation behavior
  - the full legacy piece catalog with stable numeric IDs and simplified keys
  - `Board` and `BoardCell`
  - serializable `PentixGame` and `PentixGameSession` snapshots
  - a shared gameplay engine for movement, rotation, gravity ticks, hard drop, line clearing, scoring, and leveling
- a lightweight browser placeholder that imports the shared piece catalog

The following are intentionally not implemented yet:

- player management and user-assignment endpoints
- durable persistence, restart-safe resume, and history endpoints
- multiplayer orchestration beyond sharing one game's piece sequence
- browser gameplay, scoring, ticks, and UI behavior from the final product goals

## Server API

- `POST /games` initializes a `PentixGame` with a UUIDv7 ID, an optional name, an empty default board, and at least two catalog piece IDs.
- `POST /game-sessions` starts a `PentixGameSession`. An omitted, null, or empty `gameId` creates a game; a supplied UUIDv7 reuses an existing game. Sessions use `id`, `gameId`, `userId: null`, and a zero-based `nextPieceIndex`.
- `POST /game-sessions/{id}/next-piece` promotes the preview to the active piece, advances the cursor, extends the parent game's piece sequence when needed, and returns the updated session.
- `POST /game-sessions/{id}/move` shifts the active piece left or right (`{ "direction": "left" | "right" }`).
- `POST /game-sessions/{id}/rotate` rotates the active piece with Delphi near-wall kicks (`{ "direction": "clockwise" | "counterclockwise" }`).
- `POST /game-sessions/{id}/tick` steps gravity; when the piece cannot move down it locks, clears lines, scores, levels, and spawns the next piece.
- `POST /game-sessions/{id}/drop` scores by fall distance and moves the piece to its lowest position without locking; the following tick locks it.

Scoring follows [Demo/Pentix/Main.pas](./delphi/Demo/Pentix/Main.pas): a lock scores `points × level`, a drop scores `points × (height − row) × level ÷ 10`, a cleared line scores `lineIndex × (10 + (height − row)) × level`, and emptying the field awards a `1000`-point bonus. Level increases every 30 locked pieces up to level 9.

Games and sessions are retained only in the memory of the server process that created them. Restarting the server clears them. Gameplay and next-piece requests are state-changing and not idempotent, so clients must not blindly retry a successful-looking request after an uncertain network failure.

## Commands

- `npm run build`: build the shared core, server, and web app
- `npm run start:server`: build and start PentixServer
- `npm run dev:web`: run the browser app with Vite
- `npm run test`: verify shared primitives, game/session lifecycle behavior, and server APIs
- `npm run lint`: run ESLint across the repository

## Legacy Notes

The piece catalog is ported from [Tetris.pas](./delphi/Tetris.pas). It keeps stable numeric IDs and Delphi geometry while using single simplified keys such as `1Line`, `3Corner`, and `5RMir`; the old `bi*` TypeScript identifiers and duplicate `name` field are no longer part of the shared contract. Most pieces occupy `(0, 0)` as the rotation-center mino. One known exception is `5Corner`, whose legacy Delphi offsets rotate around an empty origin; this repository intentionally preserves that behavior for parity with the original code.

More detail about the current foundation change lives in [docs/foundation.md](./docs/foundation.md).
