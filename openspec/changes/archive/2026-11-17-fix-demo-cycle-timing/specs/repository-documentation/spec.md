## MODIFIED Requirements

### Requirement: The repository documents how to author a demo engine

The repository SHALL contain `docs/demo-engine-task.md`, a self-contained authoring brief that can be handed unchanged to an AI with no access to this repository. The brief SHALL ask only for the planning function - not for an engine id, name, description, file path, imports, or registration - and SHALL state the exact `plan(board, piece, position): string` signature and result type. It SHALL define `board` (rows of `0` free and `1` occupied), `piece` (the active piece's reachable orientations, each a list of cells relative to its rotation point, whose point is `{ row: 0, column: 0 }`), and `position` (the rotation point on the board), and SHALL explain that an absolute cell is `position + cell`. The brief SHALL explain the game, the action alphabet (`L` move left, `R` move right, `C` rotate clockwise, `A` rotate anticlockwise, `H` hard drop), the rule that `T` (tick) must never appear, the tick-then-action driving rhythm (each gravity interval starts with one tick, the steering action lands halfway through the interval, and the rest of the interval runs before the next tick), the rotation and wall-kick rules, and what the function may and may not do. The brief SHALL list every block of the shared catalog - all 29 pieces, with key, mino count, rotation mode, colour, cell offsets, and a shape diagram that marks the rotation point - so an author can reason about the whole piece set without repository access, and it SHALL state which rotation mode gives how many reachable orientations. The brief SHALL explain the scoring the caller applies, because the score is the goal of a plan: `minos × level` for locking a piece, `floor(minos × (height − dropRow) × level ÷ 10)` for the hard drop - so a piece dropped earlier, while it is higher up, is worth more - `clearedIndex × (10 + (height − row)) × level` for each row the lock clears, a flat `1000` for emptying the board, and the level multiplier that rises by one every 30 locked pieces up to `9`. The brief SHALL state that the plan's goal is the highest score and SHALL connect the placement advice to it. The brief SHALL explain the last-tick move after the hard drop: that one `L` or `R` placed after `H` is applied as the action after the drop, half an interval later, that a hard drop restarts the interval rhythm so the tick that locks the piece comes a full interval after the drop, that the tick then locks the piece in the shifted column or lets it fall further, and that no rotation or second drop may follow `H`; it SHALL include a worked pocket example with a settled mino on the row before last. The brief SHALL require a TypeScript answer: the returned function SHALL be TypeScript with annotated parameters, every example in the brief SHALL be TypeScript, and the brief SHALL NOT admit plain JavaScript answers. The brief SHALL NOT assume a particular AI, model, editor, or chat tool, SHALL NOT require the author to modify any other file, and SHALL be the same text for every engine, with only the strategy idea supplied by the requester. `docs/foundation.md` SHALL summarize the engine module convention, the last-tick move after the drop, and point at the brief.

#### Scenario: The brief is enough without other context

- **GIVEN** an author who has never seen the repository
- **WHEN** they read only `docs/demo-engine-task.md`
- **THEN** they can state the `plan(board, piece, position)` signature, the types and meaning of `board`, `piece`, and `position`, the action alphabet, the driving rules, and the answer format, without any repository access

#### Scenario: The brief states the tick-then-action rule and forbids ticks

- **GIVEN** an author reading only `docs/demo-engine-task.md`
- **WHEN** they write the engine's plan
- **THEN** the brief has told them each gravity interval starts with one tick and the steering action lands halfway through that interval, with the rest of the interval running before the next tick
- **AND** that a piece therefore moves after a tick, never in the same instant as one
- **AND** that `T` must not appear in the returned log
- **AND** that ticks alone continue after the log ends

#### Scenario: The brief lists every block

- **GIVEN** an author reading only `docs/demo-engine-task.md`
- **WHEN** they look up the piece set
- **THEN** all 29 catalog blocks appear with their key, mino count, rotation mode, colour, offsets, and a shape diagram
- **AND** every diagram marks the rotation point
- **AND** the brief maps each rotation mode to its reachable orientation count

#### Scenario: The brief explains the scoring rules

- **GIVEN** an author reading only `docs/demo-engine-task.md`
- **WHEN** they plan a piece
- **THEN** the brief states that the plan's goal is the highest score
- **AND** it gives the points for locking a piece, for the hard drop, for each cleared row, and for emptying the board
- **AND** it explains that a piece dropped earlier, while it is higher up, scores more for the fall
- **AND** it explains that the level multiplies those points and how the level rises

#### Scenario: The brief explains the last-tick move after the drop

- **GIVEN** an author reading only `docs/demo-engine-task.md`
- **WHEN** they decide whether to side-step after a hard drop
- **THEN** the brief explains that one `L` or `R` after `H` is applied as the next action half an interval after the drop, and that the locking tick comes a full interval after the drop
- **AND** it shows a worked pocket example under a settled mino on the row before last
- **AND** it forbids a rotation or a second drop after `H`

#### Scenario: The brief requires TypeScript

- **GIVEN** an author reading only `docs/demo-engine-task.md`
- **WHEN** they write the answer
- **THEN** the brief requires one TypeScript `plan` function with annotated parameters
- **AND** every code example in the brief is TypeScript
- **AND** no part of the brief offers a plain JavaScript answer

#### Scenario: The brief is identical for every engine

- **GIVEN** two requests for different demo engines
- **WHEN** their briefs are compared
- **THEN** the instructions, rules, and self-checks are the same text
- **AND** only the supplied strategy idea differs

#### Scenario: An engine authored from the brief fits the convention

- **GIVEN** a plan function authored strictly from the brief
- **WHEN** it is wrapped in a `<engine-id>-demo-engine.ts` module that adds `id`, `name`, and `description`
- **THEN** the strict TypeScript build accepts it without edits to the function
- **AND** the catalog can register it with no new registry or browser-client code

#### Scenario: The foundation notes point at the brief

- **GIVEN** a developer reading `docs/foundation.md`
- **WHEN** they look for how demo engines are structured
- **THEN** they find the one-module-per-engine convention, the post-drop last-tick rule, and a reference to `docs/demo-engine-task.md`

