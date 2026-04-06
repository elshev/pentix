# Pentix Foundation Change

This repository now uses an `apps/` and `packages/` layout so the browser client and `PentixServer` can share common game-domain code instead of duplicating it.

## What Exists Today

- `apps/pentix-web`: a lightweight browser placeholder
- `apps/pentix-server`: an empty Node.js server bootstrap
- `packages/pentix-core`: shared piece and board primitives

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

- add explicit player and PentixGame API contracts
- define Pentix game settings and history models
- introduce browser gameplay state and rendering
- connect the web app to `PentixServer`
