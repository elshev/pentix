# Pentix Foundation Change

This repository now uses an `apps/` and `packages/` layout so the browser client and `PentixServer` can share common game-domain code instead of duplicating it.

## What Exists Today

- `apps/pentix-web`: a lightweight browser placeholder
- `apps/pentix-server`: a Node.js server bootstrap with `POST /game-sessions`
- `packages/pentix-core`: shared piece, board, and game-session primitives

## Shared Piece Model

The shared piece model intentionally uses readable TypeScript names:

- `Offset` instead of Delphi `Ofs`
- `RotationMode` instead of Delphi `TBlockRotates`
- `Piece` instead of Delphi `TBlock`

The piece catalog is ported directly from the legacy Delphi source at [Tetris.pas](C:/ai/pentix/delphi/Tetris.pas).

## 5Corner Decision

The Delphi `5Corner` definition does not contain an occupied `(0, 0)` mino. The new code keeps that exact geometry instead of normalizing it, because this foundation change prioritizes legacy parity over reinterpretation.

That means:

- most pieces occupy `(0, 0)` directly
- `5Corner` rotates around the origin even though the origin itself is empty

## Next Likely Steps

- The current session-start API creates a fresh in-memory snapshot only. It does not persist sessions or provide resume, movement, ticking, scoring, or history behavior.

- The first supported server flow is `POST /game-sessions`, which returns an empty default board, opening statistics, an active piece at the centered spawn origin, and one next-piece preview.

- add explicit player and PentixGame API contracts
- define Pentix game settings and history models
- introduce browser gameplay state and rendering
- connect the web app to `PentixServer`
