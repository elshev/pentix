## 1. Repository Foundation

- [ ] 1.1 Replace the starter repository README and related docs with Pentix-specific project documentation from the approved glossary and goals.
- [ ] 1.2 Convert the repository to the agreed workspace structure for `apps` and `packages`.
- [ ] 1.3 Update root scripts and package metadata so the workspace can build and run the new application/package layout.

## 2. PentixServer Bootstrap

- [ ] 2.1 Create the empty `PentixServer` application with a TypeScript entry point and startup command.
- [ ] 2.2 Ensure the server scaffold does not yet implement player, PentixGame, or history endpoints.
- [ ] 2.3 Add a minimal verification step proving the empty server application starts successfully.

## 3. Shared Game Primitives

- [ ] 3.1 Create the shared package for common Pentix domain code.
- [ ] 3.2 Implement the shared piece model using `Offset` terminology rather than Delphi `Ofs` naming.
- [ ] 3.3 Transcribe the Delphi piece catalog and rotation constraints from `delphi/Tetris.pas`.
- [ ] 3.4 Add the shared board abstraction with width, height, and board-cell access semantics.
- [ ] 3.5 Add verification tests that the shared piece catalog matches the legacy Delphi coordinates and rotation modes.

## 4. Legacy Ambiguities

- [ ] 4.1 Decide how the `5Corner` piece should behave in the new model when the desired occupied `(0, 0)` mino rule conflicts with the Delphi offsets.
- [ ] 4.2 Capture the chosen `5Corner` decision in code comments and docs so later gameplay work uses the same assumption.
