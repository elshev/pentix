/**
 * Enumerates every orientation × column, simulates the piece falling one row per
 * action while it rotates and steers (so a placement is only accepted if the piece
 * actually survives the trip), then hard drops. Each candidate landing is scored
 * with line clears (indexed, higher rows worth more), the 1000 sweep bonus, drop
 * height, plus board quality: aggregate height, covered holes, bumpiness and
 * wells. A single last-tick side-step is considered only for pockets that no
 * straight drop can reach; otherwise the log ends at H.
 */
import { adaptAuthoredPlan } from '../demo-engine-toolkit.js'

export const id = 'qwen-4-max'
export const name = 'Qwen 4 Max'
export const description =
  'Qwen 4 in Max mode (Chat): replays every orientation, column, and side-step candidate and ranks them by clear and drop points minus survival penalties.'

function authoredPlan(
  board: number[][],
  piece: { row: number; column: number }[][],
  position: { row: number; column: number },
): string {
  const height = board.length;
  const width = height > 0 ? board[0].length : 0;
  if (height === 0 || width === 0 || piece.length === 0) return "";

  const grid: number[][] = [];
  for (let r = 0; r < height; r += 1) {
    const line: number[] = [];
    for (let c = 0; c < width; c += 1) line.push(board[r][c] === 1 ? 1 : 0);
    grid.push(line);
  }

  type Cells = { row: number; column: number }[];
  const orientations: Cells[] = [];
  for (const o of piece) {
    const cells: Cells = [];
    for (const cell of o) cells.push({ row: cell.row, column: cell.column });
    orientations.push(cells);
  }
  const n = orientations.length;
  const minos = orientations[0].length;

  function fits(cells: Cells, row: number, col: number): boolean {
    for (const cell of cells) {
      const r = row + cell.row;
      const c = col + cell.column;
      if (c < 0 || c >= width || r >= height) return false;
      if (r >= 0 && grid[r][c] === 1) return false;
    }
    return true;
  }

  function landingRow(cells: Cells, col: number): number | null {
    let top = 0;
    for (const cell of cells) if (cell.row < top) top = cell.row;
    let row = -top;
    if (!fits(cells, row, col)) return null;
    while (fits(cells, row + 1, col)) row += 1;
    return row;
  }

  // Rotation kick: sideways first, upward when pressed against the top.
  function rotateAt(
    cells: Cells,
    row: number,
    col: number,
  ): { row: number; col: number } | null {
    if (fits(cells, row, col)) return { row, col };
    for (let d = 1; d <= width; d += 1) {
      if (fits(cells, row, col - d)) return { row, col: col - d };
      if (fits(cells, row, col + d)) return { row, col: col + d };
    }
    for (let u = 1; u <= 3; u += 1) {
      if (fits(cells, row - u, col)) return { row: row - u, col };
      for (let d = 1; d <= width; d += 1) {
        if (fits(cells, row - u, col - d)) return { row: row - u, col: col - d };
        if (fits(cells, row - u, col + d)) return { row: row - u, col: col + d };
      }
    }
    return null;
  }

  function evaluate(cells: Cells, row: number, col: number, dropRow: number) {
    const copy: number[][] = [];
    for (let r = 0; r < height; r += 1) copy.push(grid[r].slice());
    for (const cell of cells) {
      const r = row + cell.row;
      const c = col + cell.column;
      if (r < 0) return null;
      copy[r][c] = 1;
    }
    const kept: number[][] = [];
    const clearedRows: number[] = [];
    for (let r = 0; r < height; r += 1) {
      let full = true;
      for (let c = 0; c < width; c += 1) {
        if (copy[r][c] !== 1) {
          full = false;
          break;
        }
      }
      if (full) clearedRows.push(r);
      else kept.push(copy[r]);
    }
    const cleared = clearedRows.length;
    const after: number[][] = [];
    for (let i = 0; i < cleared; i += 1) {
      const blank: number[] = [];
      for (let c = 0; c < width; c += 1) blank.push(0);
      after.push(blank);
    }
    for (const line of kept) after.push(line);

    const tops: number[] = [];
    let agg = 0;
    let holes = 0;
    let blocks = 0;
    for (let c = 0; c < width; c += 1) {
      let top = height;
      let seen = false;
      for (let r = 0; r < height; r += 1) {
        if (after[r][c] === 1) {
          if (!seen) {
            top = r;
            seen = true;
          }
          blocks += 1;
        } else if (seen) {
          holes += 1;
        }
      }
      tops.push(top);
      agg += height - top;
    }
    let bump = 0;
    for (let c = 0; c + 1 < width; c += 1) bump += Math.abs(tops[c] - tops[c + 1]);
    let wells = 0;
    for (let c = 0; c < width; c += 1) {
      const left = c > 0 ? tops[c - 1] : 0;
      const right = c + 1 < width ? tops[c + 1] : 0;
      const depth = Math.min(left, right) - tops[c];
      if (depth > 2) wells += depth - 2;
    }
    const maxTop = Math.min.apply(null, tops);
    const danger = height - maxTop;

    let clearScore = 0;
    for (let i = 0; i < cleared; i += 1) {
      clearScore += (i + 1) * (10 + (height - clearedRows[i]));
    }
    let sweep = 0;
    if (cleared > 0 && blocks === 0) sweep = 1000;
    const dropScore = Math.floor((minos * Math.max(0, height - dropRow)) / 10);

    let score =
      minos +
      dropScore +
      clearScore +
      sweep -
      0.52 * agg -
      7.5 * holes -
      0.9 * bump -
      0.6 * wells;
    if (danger > height - 5) score -= 4 * (danger - (height - 5));
    return { score, row, col };
  }

  let bestScore = Number.NEGATIVE_INFINITY;
  let bestLog = "";

  function consider(
    cells: Cells,
    row: number,
    col: number,
    dropRow: number,
    log: string,
    penalty: number,
  ): void {
    const res = evaluate(cells, row, col, dropRow);
    if (res === null) return;
    const value = res.score - penalty;
    if (value > bestScore) {
      bestScore = value;
      bestLog = log;
    }
  }

  for (let k = 0; k < n; k += 1) {
    const cells = orientations[k];
    const forward = k;
    const backward = n - k;
    const useBackward = n > 1 && backward < forward;
    const rotCount = n === 1 ? 0 : useBackward ? backward : forward;
    const rotChar = useBackward ? "A" : "C";
    const rotPrefix = rotChar.repeat(rotCount);

    for (let target = 0; target < width; target += 1) {
      const delta = target - position.column;
      const moveChar = delta < 0 ? "L" : "R";
      const moves = Math.abs(delta);

      // Straight-drop placement: rotate high, steer, hard drop.
      let row = position.row;
      let col = position.column;
      let alive = true;
      let idx = k;
      for (let i = 0; i < rotCount; i += 1) {
        idx = useBackward ? (idx + n - 1) % n : (idx + 1) % n;
        const kicked = rotateAt(orientations[idx], row, col);
        if (kicked === null) {
          alive = false;
          break;
        }
        row = kicked.row;
        col = kicked.col;
        if (fits(orientations[idx], row + 1, col)) row += 1;
        else {
          alive = false;
          break;
        }
      }
      if (alive) {
        for (let i = 0; i < moves; i += 1) {
          const nc = col + (delta < 0 ? -1 : 1);
          if (fits(cells, row, nc)) col = nc;
          if (fits(cells, row + 1, col)) row += 1;
          else {
            alive = false;
            break;
          }
        }
      }
      if (alive) {
        const land = landingRow(cells, col);
        if (land !== null) {
          consider(
            cells,
            land,
            col,
            row,
            rotPrefix + moveChar.repeat(moves) + "H",
            0.15 * (rotCount + moves),
          );

          // Pocket: one side-step after the hard drop, only when the straight
          // drop in the destination column cannot reach this cell.
          for (const step of [-1, 1]) {
            const pocketCol = col + step;
            if (pocketCol < 0 || pocketCol >= width) continue;
            if (!fits(cells, land, pocketCol)) continue;
            const direct = landingRow(cells, pocketCol);
            if (direct !== null && direct >= land) continue;
            let finalRow = land;
            while (fits(cells, finalRow + 1, pocketCol)) finalRow += 1;
            consider(
              cells,
              finalRow,
              pocketCol,
              row,
              rotPrefix + moveChar.repeat(moves) + "H" + (step < 0 ? "L" : "R"),
              0.15 * (rotCount + moves + 1) + 1.5,
            );
          }
        }
      }
    }
  }

  if (bestLog === "") {
    const land = landingRow(orientations[0], position.column);
    if (land !== null) return "H";
    return "";
  }
  return bestLog;
}

export const plan = adaptAuthoredPlan(authoredPlan)
