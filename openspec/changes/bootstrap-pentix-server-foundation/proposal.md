## Why

The repository is still the default React + Vite starter, while the project goals already require two applications, shared game-domain code, and a PentixServer that will become the source of truth for players, games, and history. We need a first foundation change that replaces starter documentation with Pentix-specific docs, introduces an empty server application, and ports the legacy Delphi piece definitions into shared TypeScript primitives before higher-level gameplay and API work begins.

## What Changes

- Replace the starter repository documentation with initial Pentix documentation that captures the glossary, product goals, first-change scope, and planned workspace layout.
- Introduce a dedicated `PentixServer` application scaffold as an empty Node.js/TypeScript server application that is runnable but does not yet implement player, game, or history endpoints.
- Introduce shared game primitives for `Piece`, `Mino` offsets, rotation modes, and `Board` so both the future browser app and server can depend on the same domain model.
- Port the legacy Delphi piece catalog from [Tetris.pas](/C:/ai/pentix/delphi/Tetris.pas), preserving the legacy piece set and rotation behavior while using new TypeScript naming such as `Offset` instead of `Ofs`.
- Record the known legacy-model ambiguity around the `5Corner` piece, whose Delphi offsets do not occupy `(0, 0)`, as an explicit design assumption for the first port.

## Capabilities

### New Capabilities
- `repository-documentation`: Pentix-specific repository documentation replaces the starter Vite text and explains the first implementation increment.
- `pentix-server-bootstrap`: A dedicated empty PentixServer application is present in the repository and integrated into the workspace.
- `shared-game-primitives`: Shared TypeScript primitives define pieces, mino offsets, rotation behavior, the Delphi-derived piece catalog, and the board model.

### Modified Capabilities

None.

## Impact

- Affected code: root documentation, workspace/package configuration, the new server application, and the new shared domain package.
- Affected systems: local development workflow, build scripts, and future browser/server integration points.
- External dependencies: possibly a lightweight server bootstrap dependency if implementation decides not to use only built-in Node.js modules.
- Breaking change: the repository stops presenting itself as a generic starter template and starts presenting itself as a multi-application Pentix workspace.

## Affected Teams

- Product and domain design: the glossary and first-scope documentation become the shared reference.
- Frontend/web development: future browser work will consume the shared game primitives instead of inventing its own piece model.
- Backend/server development: PentixServer gets its first application shell and becomes the owner of future API work.

## Rollback Plan

If this foundation change proves premature, we can revert to the single-app starter layout by removing the server scaffold and shared primitives package, then restoring the previous starter documentation. Because no production gameplay or persistence behavior is introduced in this change, rollback is limited to repository structure and documentation.
