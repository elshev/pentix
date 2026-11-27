# Pentix demo engine: write one TypeScript planning function

You are writing **one TypeScript function** that plans the moves of one falling
piece in Pentix, a Tetris-like game. The goal is the highest score: the caller
scores every action and lock, and your plan decides where each piece goes.
Everything you need is in this document: no other file, repository, package, or
documentation is required. Answer from this document alone — do not reuse code,
notes, or context from another chat or a previous answer. Return the function
with one short comment above it that describes your algorithm. Do not return
metadata, a file name, or a module.

## The game

- The board is a rectangle of `height` rows and `width` columns.
- One piece falls at a time. A piece is a small set of occupied cells called
  **minos** that rotates around a fixed cell called the **rotation point**.
- Settled cells stay on the board. A row that becomes completely occupied is
  cleared and the rows above it move down.
- A piece locks when it cannot move down any further and a tick occurs. Then the
  next piece appears at the top.
- The game is over when a new piece cannot appear. That is not your concern.

## The blocks

The piece set is fixed: 29 blocks. Every block's cells are given as
`(column, row)` offsets from its rotation point, and the drawing below shows the
orientation the piece has when it appears.

- `X` is a mino, `@` is the mino that is the rotation point, `o` is a rotation
  point on an empty cell, `.` is an empty cell.

| Key | Rotation | Offsets `(column, row)` |
| --- | --- | --- |
| `1Line` | none | `(0,0)` |
| `2Line` | half | `(0,0) (0,1)` |
| `3Line` | half | `(0,0) (-1,0) (1,0)` |
| `3Corner` | full | `(0,0) (0,-1) (1,0)` |
| `4Line` | half | `(0,0) (-2,0) (-1,0) (1,0)` |
| `4Square` | none | `(0,0) (0,1) (1,1) (1,0)` |
| `4T` | full | `(0,0) (-1,0) (1,0) (0,-1)` |
| `4L` | full | `(0,0) (-1,0) (1,0) (1,-1)` |
| `4LMir` | full | `(0,0) (-1,-1) (-1,0) (1,0)` |
| `4S` | half | `(0,0) (-1,0) (0,-1) (1,-1)` |
| `4SMir` | half | `(0,0) (-1,-1) (0,-1) (1,0)` |
| `5Line` | half | `(0,0) (-2,0) (-1,0) (1,0) (2,0)` |
| `5Corner` | full | `(-1,-1) (-1,0) (-1,1) (0,1) (1,1)` |
| `5Cross` | none | `(0,0) (0,-1) (-1,0) (0,1) (1,0)` |
| `5T` | full | `(0,0) (1,-1) (0,-1) (-1,-1) (0,1)` |
| `5W` | full | `(0,0) (-1,1) (0,1) (1,0) (1,-1)` |
| `5U` | full | `(0,0) (-1,-1) (-1,0) (1,0) (1,-1)` |
| `5L` | full | `(0,0) (-2,0) (-1,0) (1,0) (1,-1)` |
| `5LMir` | full | `(0,0) (-1,-1) (-1,0) (1,0) (2,0)` |
| `5S` | full | `(0,0) (0,-1) (-2,0) (-1,0) (1,-1)` |
| `5SMir` | full | `(0,0) (0,-1) (-1,-1) (1,0) (2,0)` |
| `5F` | full | `(0,0) (0,-1) (-1,1) (0,1) (1,0)` |
| `5FMir` | full | `(0,0) (0,-1) (-1,0) (0,1) (1,1)` |
| `5P` | full | `(0,0) (1,0) (1,-1) (0,-1) (0,1)` |
| `5PMir` | full | `(0,0) (0,-1) (-1,-1) (-1,0) (0,1)` |
| `5Z` | half | `(0,0) (0,-1) (-1,-1) (0,1) (1,1)` |
| `5ZMir` | half | `(0,0) (1,-1) (0,-1) (-1,1) (0,1)` |
| `5R` | full | `(0,0) (2,0) (1,0) (0,-1) (-1,0)` |
| `5RMir` | full | `(0,0) (1,0) (0,-1) (-2,0) (-1,0)` |

The shapes, in the orientation the piece appears in (rows top to bottom):

```
1Line   @
2Line   @
        X
3Line   X@X
3Corner X.
        @X
4Line   XX@X
4Square @X
        XX
4T      .X.
        X@X
4L      ..X
        X@X
4LMir   X..
        X@X
4S      .XX
        X@.
4SMir   XX.
        .@X
5Line   XX@XX
5Corner X..
        Xo.
        XXX
5Cross  .X.
        X@X
        .X.
5T      XXX
        .@.
        .X.
5W      ..X
        .@X
        XX.
5U      X.X
        X@X
5L      ...X
        XX@X
5LMir   X...
        X@XX
5S      ..XX
        XX@.
5SMir   XX..
        .@XX
5F      .X.
        .@X
        XX.
5FMir   .X.
        X@.
        .XX
5P      XX
        @X
        X.
5PMir   XX
        X@
        .X
5Z      XX.
        .@.
        .XX
5ZMir   .XX
        .@.
        XX.
5R      .X..
        X@XX
5RMir   ..X.
        XX@X
```
The table above is the authoritative list. The drawing is only a quick
reference.

A **rotation** turns the piece a quarter turn clockwise (`C`) or anticlockwise
(`A`) around its rotation point. A block's rotation mode limits what you can
reach:

- `none` — the piece cannot rotate: `piece.length` is `1`.
- `half` — half turns only: `piece.length` is `2`.
- `full` — quarter turns: `piece.length` is `4` for most blocks, but shapes that
  look the same after a half turn repeat, so read `piece.length` instead of
  assuming four.

## Your function

```ts
function plan(
  board: number[][],
  piece: { row: number; column: number }[][],
  position: { row: number; column: number },
): string
```

Three parameters, one result.

### `board`

The visible board, including settled cells but **not** the falling piece.

- `board` is an array of rows: `board[row][column]`.
- `board.length` is the board height. `board[0].length` is the board width.
- `1` means the cell is occupied by a settled cell. `0` means it is free.
- Rows and columns are 0-based from the top-left corner.

Example of a `6 x 4` board (6 rows, 4 columns), with a settled cell at the
bottom-left corner:

```ts
const board: number[][] = [
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [1, 0, 0, 0],
]
```

### `piece`

The piece's **reachable orientations**. Each orientation is a list of the piece's
cells relative to its rotation point:

```ts
const piece: { row: number; column: number }[][] = [
  [{ row: 0, column: 0 }, { row: 0, column: 1 }], // current orientation
  [{ row: 0, column: 0 }, { row: -1, column: 0 }], // after one C
]
```

- `piece[0]` is the orientation the piece has right now.
- One `C` changes the piece to `piece[1]`, the next `C` to `piece[2]`, and after
  the last orientation it wraps back to `piece[0]`.
- `A` goes one step the other way through the same list.
- A piece that cannot rotate has exactly one orientation. Others have two or
  four. Use `piece.length` rather than assuming four.
- The rotation point itself is the cell `{ row: 0, column: 0 }` in every
  orientation. A cell at `{ row: -1, column: 0 }` is one row above it.

### `position`

Where the rotation point currently is on the board:

```ts
const position: { row: number; column: number } = { row: 3, column: 5 }
```

To get a piece cell's absolute board cell, add the two:

```ts
const row = position.row + cell.row
const column = position.column + cell.column
```

Cells above the board (negative rows) are allowed: pieces enter from the top.

### The result

A **string**. It is not an object and not an array. For example `"LLCH"`.

Every character is one action:

| Character | Action |
| --- | --- |
| `L` | Move the piece one column left. |
| `R` | Move the piece one column right. |
| `C` | Rotate the piece to the next orientation in `piece`. |
| `A` | Rotate the piece to the previous orientation in `piece`. |
| `H` | Hard drop: move the piece down until it can go no lower. |

Return the empty string `""` when you have no actions for this piece.

Only these five characters are accepted. The game ignores any other character
in the string.

## How the caller executes your string

A piece appears, then your actions are replayed one per turn, with one **tick**
after each:

```
piece appears
Action
Tick (move down one row)
Action
Tick
...
```

Your string is read in order:

1. Apply the next character.
2. Apply one tick: the piece moves down one row, or locks when it cannot.
3. Repeat until the string ends. Then ticks continue alone until the piece locks.

At the last position, the piece can no longer move down. One more action is
still applied there, and it happens before the tick that locks the piece. That
action is your last chance to shift or rotate the piece.

Consequences you must respect:

- Each action costs one tick, so the piece also falls while you steer it.
- An impossible action (for example, moving into a wall) is ignored, but its tick
  still happens.
- `H` moves the piece to its lowest possible position. The next tick locks it
  there, unless the action after `H` moved it sideways.
- If the piece locks before your string ends, the remaining characters are
  discarded. Put the important actions first.
- Rotate first, then move: the rotation is the action that gets kicked against a
  wall or stack (see "Rotate before you move" above).

## Choosing an orientation

To place the piece in orientation `piece[k]`, output `k` characters `C` before
the lateral moves. For example, with the two-orientation bar above:

- `"LRH"` uses `piece[0]` (no rotation), moves left, right, and drops.
- `"CLRH"` uses `piece[1]` (one `C`), then the same moves and drop.
- `"CLRH"` and `"ALRH"` select the same orientation when there are two
  orientations, because `A` steps backwards by one.

Rotations cost time: every `C` or `A` is one action, and the piece falls one row
while it turns. Prefer the fewest rotations that reach the orientation you want.

### Rotate before you move

A rotation turns the piece around its rotation point. When the turned shape would
overlap a wall or a settled cell, the game shifts the piece sideways until it
fits. It shifts the piece up instead when the piece is against the top. This is a
"wall kick". The plan still runs,
but the piece can end up a column away from where you aimed.

So rotate first, then move:

- Rotate while the piece is still high, where there is free space around it.
- Steer it into the target column afterwards.
- A rotation done last, next to a wall or a tall stack, is the one that gets
  kicked. If you must rotate late, keep one free column between the piece and the
  wall.

## The last-tick move after the hard drop (pockets only)

**End the log at `H` whenever your chosen placement is reachable by a straight
drop in the target column.** Do not append a lateral move in that case. The demo
replays one action per tick, so `H` followed by `L` or `R` makes the piece land
and then walk sideways. That walk costs a row of fall and it looks wrong. The
same placement was already reachable before the drop.

Some placements genuinely cannot be reached by a straight drop at all: they sit
under an overhang, with a settled cell above them. For exactly those placements —
and only those — the demo engine allows one **side-step after the hard drop**.

Add **one** `L` or `R` after the `H`, and only when the target cell is inside
such a pocket:

- The drop happens first, so the piece comes to rest as low as it can in the
  column you steered to.
- The `L` or `R` is the action after the drop, and the piece has not locked yet.
  The piece moves one column at that same row, into the pocket if the pocket is
  beside it.
- The next tick then locks the piece in its new column, or lets it fall one more
  row when the side-step uncovered a drop.
- Nothing else may follow: no rotation, no second drop, and never more than one
  side-step. A string with no side-step simply ends at `H`.

### Worked example

A `12 x 22` board whose only settled cells are one mino at row `20`, column `7`
(row `21` is the last row). The active piece is the single-cell `1Line` at row
`1`, column `6`. The best placement is row `21`, column `7`: the floor, directly
under the settled mino.

```
          col 6  7  8  9
  row 19    .  .  .  .
  row 20    .  X  .  .      X = the settled mino
  row 21    .  *  .  .      * = where the piece should end up
```

A straight drop in column `7` would stop on top of the mino at row `19`. So the
piece has to drop in column `8` and step left on the last tick:

1. `R` — move from column `6` to `7`, then a tick.
2. `R` — move from column `7` to `8`, then a tick.
3. `H` — hard drop to row `21`, column `8`.
4. `L` — the action after the drop, one column left, into row `21`, column `7`.
5. The next tick locks the piece there, under the mino.

So the string is `"RRHL"`. Without the trailing `L` the piece would lock at row
`21`, column `8` and the pocket would stay empty.

If the side-step is blocked, the caller ignores it but still applies the tick, so
the piece locks where it was dropped. Plan the side-step only when the target
cell is free.

This pocket is the **exception**. If a straight drop in the target column reaches
the placement, the plan ends at `H` and carries no side-step at all.

## Scoring

Your function never adds points itself: the caller scores every action it
applies. The score is the goal, so plan the piece that scores most.

| Event | Points |
| --- | --- |
| Locking a piece | `minos × level` |
| Hard drop | `floor(minos × (height − dropRow) × level ÷ 10)` |
| Each cleared row | `clearedIndex × (10 + (height − row)) × level` |
| Emptying the board | `1000` extra |

`minos` is the block's size, `1` to `5`. `dropRow` is the row of the rotation
point at the moment `H` is applied. `row` is a cleared row (`0` at the top).
`clearedIndex` counts the rows this lock clears, from the top one (`1`) down.
Every term except the `1000` bonus is multiplied by the level.

- **Drop the piece as early as you can.** The drop score counts the rows between
  the piece and the bottom. So a piece dropped near the top is worth far more
  than one that has already fallen. Every action costs one tick and therefore
  one row, even an action that the board blocks. So keep the plan short. Reach
  the placement with as few rotations and moves as it takes, then `H`.
- A drop with no free row below scores nothing for the fall. The piece just
  locks. The lock score still applies.
- Larger blocks earn more: a five-mino block is worth five times a single mino,
  both per lock and per row of drop.
- A cleared row scores by its height. `height − row` is the number of rows from
  that row down to the floor. So a line cleared higher up is worth more than one
  cleared on the floor. Clearing several rows with one piece also multiplies the
  later ones (the second cleared row ×2, the third ×3, and so on). So a double or
  triple clear is worth much more than the same rows cleared one at a time.
- Emptying the whole board by clearing the bottom row adds a flat `1000`.
- The level is the level the caller chose, raised by one every 30 locked pieces
  up to `9`. It multiplies everything, so a long, clean game is worth far more
  than a short one.

Example, on an empty `12 x 22` board at level `1`. Emitting `H` for the
single-mino `1Line` from row `1` scores `floor(1 × 21 ÷ 10) = 2` for the drop.
Locking it scores another `1`, so the piece is worth `3` points. The same
piece dropped from row `11` scores `1` for the fall, and a piece that is already
resting scores nothing for the fall.

## What a good plan looks like

The score is the goal, and three things you control decide it. They are how high
the piece is when you drop it, how many rows the placement clears, and how long
the game keeps running. So keep settled cells low, and avoid covered holes (an
empty cell with an occupied cell above it in the same column). Also prefer
placements that complete rows. Any strategy is acceptable as long as it returns
a valid action string. Simple heuristics are welcome.

## Rules for your function

You **can**:

- read `board`, `piece`, and `position`.
- compute with plain TypeScript in the function body.
- call `Math.random()` if your strategy is random.
- define small helper functions inside your answer.
- return any number of actions, including none.

You **cannot**:

- mutate `board`, `piece`, or `position`.
- keep state between calls — each call plans a new piece from scratch.
- use files, network, timers, the DOM, Node.js APIs, `import`, or `require`.
- depend on data from previous pieces or on anything outside the arguments.
- reuse code, notes, or context from another chat or from a previous answer — the function must be produced from this document alone.
- return a character other than `L`, `R`, `C`, `A`, or `H`.
- return an array or an object instead of a string.
- return more than one action after `H`, or anything other than `L`/`R` there.
- write JavaScript instead of TypeScript, or leave a parameter unannotated.
- throw for a valid board, piece, and position.

The function must be pure: the same arguments and the same `Math.random()`
sequence must produce the same string.

## Answer format

Return exactly one **TypeScript** function, named `plan`. Put a short
**comment block** above it that describes your algorithm. The comment says in a
few lines what the plan enumerates, how it scores a placement, and why it ends
where it does. The function takes the three parameters described above, each
annotated, and it returns `string`:

```ts
// Describe your algorithm here in a few lines.
function plan(
  board: number[][],
  piece: { row: number; column: number }[][],
  position: { row: number; column: number },
): string
```

Every comment must follow the `asd-ste100` rules for code comments. Write
complete sentences in sentence case and the active voice. Use simple present,
past, or future tense. Name one thing with one term. Keep identifiers, log
field names, and quoted error strings verbatim. Do not use semicolons. The same
rule applies to the comment block above the function and to any comment in the
body.

Do not add imports, exports, or metadata. The caller supplies the engine name
and description itself. Do not add an explanation after the function. The
algorithm comment above it is the only prose that the answer may carry.
JavaScript answers are
not accepted: the function is compiled by a strict TypeScript build, so annotate
the parameters and the return type. Put the whole answer in a single code block.

## Example answer

This example is deliberately simple. It drops the piece straight down in the
reachable column whose landing row is lowest, without rotating, and adds no
last-tick move. It is valid, not optimal. Write your own strategy.

```ts
// Drops the piece straight down in the reachable column whose landing row is
// lowest, without rotating, and ends at the hard drop.
function plan(
  board: number[][],
  piece: { row: number; column: number }[][],
  position: { row: number; column: number },
): string {
  const height = board.length
  const width = height > 0 ? board[0].length : 0
  const cells = piece[0]

  function canPlace(row: number, column: number): boolean {
    for (const cell of cells) {
      const r = row + cell.row
      const c = column + cell.column
      if (c < 0 || c >= width || r >= height) {
        return false
      }
      if (r >= 0 && board[r][c] === 1) {
        return false
      }
    }
    return true
  }

  function landingRow(column: number): number | null {
    let top = 0
    for (const cell of cells) {
      if (cell.row < top) {
        top = cell.row
      }
    }
    let row = -top
    if (!canPlace(row, column)) {
      return null
    }
    while (canPlace(row + 1, column)) {
      row += 1
    }
    return row
  }

  let bestColumn = position.column
  let bestRow = Number.NEGATIVE_INFINITY
  for (let column = 0; column < width; column += 1) {
    const row = landingRow(column)
    if (row !== null && row > bestRow) {
      bestRow = row
      bestColumn = column
    }
  }

  const delta = bestColumn - position.column
  const lateral = delta < 0 ? 'L'.repeat(-delta) : 'R'.repeat(delta)
  return lateral + 'H'
}
```

## Self-check before you answer

- There is exactly one function named `plan`, taking `board`, `piece`, and
  `position`, all annotated, returning `string`.
- A short comment above `function plan` describes the algorithm.
- Every comment follows the `asd-ste100` rules for code comments: sentence case,
  active voice, simple tense, one term per thing, and no semicolons.
- The answer is produced from this document alone: no code or notes reused from
  another chat or a previous answer.
- It returns a **string** such as `"LLCH"`.
- The string contains only `L`, `R`, `C`, `A`, and `H`.
- It returns `""` when it has no actions.
- Its log ends at `H` whenever a straight drop reaches the chosen placement.
- Any action after `H` is a single `L` or `R`, placed last. It appears only
  when a straight drop cannot reach the placement (a pocket under an overhang).
- It plans for points: it drops the piece early and prefers placements that clear
  rows.
- It does not mutate the arguments, keep state, or use imports, I/O, or timers.
- It defines no engine name, description, id, file path, or module.
- The whole answer is TypeScript, with no JavaScript-only syntax.


