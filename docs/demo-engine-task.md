# Pentix demo engine: write one planning function

You are writing **one function** that plans the moves of one falling piece in
Pentix, a Tetris-like game. Everything you need is in this document: no other
file, repository, package, or documentation is required. Return only the
function; do not return metadata, a file name, or a module.

## The game

- The board is a rectangle of `height` rows and `width` columns.
- One piece falls at a time. A piece is a small set of occupied cells that
  rotates around a fixed cell called the **rotation point**.
- Settled cells stay on the board. A row that becomes completely occupied is
  cleared and the rows above it move down.
- A piece locks when it cannot move down any further and a tick occurs. Then the
  next piece appears at the top.
- The game is over when a new piece cannot appear. That is not your concern.

## Your function

```
plan(board, piece, position) -> string
```

Three parameters, one result:

### `board`

The visible board, including settled cells but **not** the falling piece.

- `board` is an array of rows: `board[row][column]`.
- `board.length` is the board height; `board[0].length` is the board width.
- `1` means the cell is occupied by a settled cell; `0` means it is free.
- Rows and columns are 0-based from the top-left corner.

Example of a `6 x 4` board (6 rows, 4 columns), with a settled cell at the
bottom-left corner:

```js
[
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

```js
[
  [{ row: 0, column: 0 }, { row: 0, column: 1 }],  // current orientation
  [{ row: 0, column: 0 }, { row: -1, column: 0 }], // after one C
]
```

- `piece[0]` is the orientation the piece has right now.
- One `C` changes the piece to `piece[1]`, the next `C` to `piece[2]`, and after
  the last orientation it wraps back to `piece[0]`.
- `A` goes one step the other way through the same list.
- A piece that cannot rotate has exactly one orientation. Others have two or
  four; use `piece.length` rather than assuming four.
- The rotation point itself is the cell `{ row: 0, column: 0 }` in every
  orientation. A cell at `{ row: -1, column: 0 }` is one row above it.

### `position`

Where the rotation point currently is on the board:

```js
{ row: 3, column: 5 }
```

To get a piece cell's absolute board cell, add the two:

```js
const row = position.row + cell.row
const column = position.column + cell.column
```

Cells above the board (negative rows) are allowed: pieces enter from the top.

### The result

A **string**. It is not an object and not an array; for example `"LLCH"`.

Every character is one action:

| Character | Action |
| --- | --- |
| `L` | Move the piece one column left. |
| `R` | Move the piece one column right. |
| `C` | Rotate the piece to the next orientation in `piece`. |
| `A` | Rotate the piece to the previous orientation in `piece`. |
| `H` | Hard drop: move the piece down until it can go no lower. |

Return the empty string `""` when you have no actions for this piece.

**Never return `T`.** `T` means "tick" and ticks are not actions; the caller
applies them itself (see below). Never return any other character either.

## How the caller executes your string

The caller replays your string for the current piece with this rule:

1. Apply the first character.
2. Apply one **tick** (gravity).
3. Apply the second character.
4. Apply one tick.
5. Continue until your string ends.
6. After the string ends, apply ticks only, until the piece locks.

So the cadence from the moment a piece appears is:

```
Action, Tick, Action, Tick, Action, Tick, ...
```

A **tick** moves the piece down one row. If the piece cannot move down, the tick
locks it, clears full lines, and spawns the next piece.

Consequences you must respect:

- Each action costs one tick. A plan with many actions gives the piece more time
  to fall while it is being steered.
- An impossible action (for example, moving into a wall) is ignored, but its
  tick still happens.
- `H` moves the piece to its lowest possible position; the tick after `H` locks
  it.
- If the piece locks before your string ends, the remaining characters are
  discarded. Put the important actions first.
- A rotation that would overlap a wall or settled cells may be shifted sideways
  by the game (a "wall kick"). Plan the simple case; small shifts are possible.

## Choosing an orientation

To place the piece in orientation `piece[k]`, output `k` characters `C` before
the lateral moves. For example, with the two-orientation bar above:

- `"LRH"` uses `piece[0]` (no rotation), moves left, right, and drops.
- `"CLRH"` uses `piece[1]` (one `C`), then the same moves and drop.
- `"CLRH"` and `"ALRH"` select the same orientation when there are two
  orientations, because `A` steps backwards by one.

Rotations cost ticks: every `C` or `A` is one action, followed by one tick, so
the piece also falls while it turns. Prefer the fewest rotations that reach the
orientation you want.

## What a good plan looks like

Aim for a useful, playable plan: keep settled cells low, avoid creating covered
holes (an empty cell with an occupied cell above it in the same column), and
prefer placements that complete rows. Any strategy is acceptable as long as it
returns a valid action string; simple heuristics are welcome.

## Rules for your function

You **can**:

- read `board`, `piece`, and `position`;
- compute with plain JavaScript or TypeScript;
- call `Math.random()` if your strategy is random;
- define small helper functions inside your answer;
- return any number of actions, including none.

You **cannot**:

- mutate `board`, `piece`, or `position`;
- keep state between calls — each call plans a new piece from scratch;
- use files, network, timers, the DOM, Node.js APIs, `import`, or `require`;
- depend on data from previous pieces or on anything outside the arguments;
- return a character other than `L`, `R`, `C`, `A`, or `H`;
- return `T` (ticks) or an array/object instead of a string;
- throw for a valid board, piece, and position.

The function must be pure: the same arguments and the same `Math.random()`
sequence must produce the same string.

## Answer format

Return exactly one function, named `plan`, with the three parameters described
above. No imports, no exports, no metadata (the caller supplies the engine name
and description itself), no explanation outside the code. If you use
TypeScript, annotate the parameters as shown. Put the whole answer in a single
code block.

## Example answer

This example is deliberately simple: it drops the piece straight down in the
reachable column whose landing row is lowest, without rotating. It is valid, not
optimal. Write your own strategy.

```ts
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
    const top = Math.min(...cells.map((cell) => cell.row))
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
  `position`.
- It returns a **string** such as `"LLCH"`.
- The string contains only `L`, `R`, `C`, `A`, and `H` — never `T`.
- It returns `""` when it has no actions.
- It does not mutate the arguments, keep state, or use imports, I/O, or timers.
- It defines no engine name, description, id, file path, or module.
