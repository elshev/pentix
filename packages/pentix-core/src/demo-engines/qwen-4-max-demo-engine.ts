/**
 * Qwen 4 in Max mode (Chat): replays every orientation, column, and side-step candidate and ranks them by clear and drop points minus survival penalties.
 *
 * Authored from docs/demo-engine-task.md and wrapped by the shared adapter;
 * the planning body is kept as authored.
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
  const orientations = piece.length;
  if (height === 0 || width === 0 || orientations === 0 || piece[0].length === 0) {
    return "";
  }
  const minos = piece[0].length;

  const fits = (ori: number, row: number, col: number): boolean => {
    const cells = piece[ori];
    for (let i = 0; i < cells.length; i += 1) {
      const r = row + cells[i].row;
      const c = col + cells[i].column;
      if (c < 0 || c >= width || r >= height) return false;
      if (r >= 0 && board[r][c] !== 0) return false;
    }
    return true;
  };

  const dropTo = (ori: number, row: number, col: number): number => {
    let r = row;
    while (fits(ori, r + 1, col)) r += 1;
    return r;
  };

  // Replay a candidate string with the engine's tick/lock rules. Returns the locked
  // placement plus the rotation-point row at the moment H was applied, or null when a
  // rotation would need an unpredictable wall kick or the piece locks before H.
  const simulate = (
    actions: string,
  ): { row: number; col: number; ori: number; dropRow: number } | null => {
    let r = position.row;
    let c = position.column;
    let o = 0;
    let dropRow = -1;
    let locked = false;
    for (let i = 0; i < actions.length; i += 1) {
      const ch = actions[i];
      const wasResting = !fits(o, r + 1, c);
      if (ch === "L" || ch === "R") {
        const nc = c + (ch === "L" ? -1 : 1);
        if (fits(o, r, nc)) c = nc;
      } else if (ch === "C" || ch === "A") {
        const no = (o + (ch === "C" ? 1 : -1) + orientations) % orientations;
        if (!fits(no, r, c)) return null;
        o = no;
      } else if (ch === "H") {
        dropRow = r;
        r = dropTo(o, r, c);
      }
      if (fits(o, r + 1, c)) {
        r += 1;
      } else if (wasResting) {
        locked = true;
        break;
      }
    }
    if (dropRow < 0) return null;
    if (!locked) {
      while (fits(o, r + 1, c)) r += 1;
    }
    return { row: r, col: c, ori: o, dropRow };
  };

  // Score the board that results from locking the piece here: real clear/empty points
  // minus a survival heuristic (covered holes, stack height, bumpiness, top-out risk).
  const evaluate = (row: number, col: number, ori: number): number => {
    const cells = piece[ori];
    let above = 0;
    const b: number[][] = board.map((rw) => rw.slice());
    for (let i = 0; i < cells.length; i += 1) {
      const r = row + cells[i].row;
      const c = col + cells[i].column;
      if (r < 0) {
        above += 1;
      } else if (r < height && c >= 0 && c < width) {
        b[r][c] = 1;
      }
    }
    let clearScore = 0;
    let cleared = 0;
    const kept: number[][] = [];
    for (let r = 0; r < height; r += 1) {
      let full = true;
      for (let c = 0; c < width; c += 1) {
        if (b[r][c] === 0) {
          full = false;
          break;
        }
      }
      if (full) {
        cleared += 1;
        clearScore += cleared * (10 + height - r);
      } else {
        kept.push(b[r]);
      }
    }
    const nb: number[][] = [];
    for (let r = 0; r < cleared; r += 1) nb.push(new Array<number>(width).fill(0));
    for (let r = 0; r < kept.length; r += 1) nb.push(kept[r]);
    let empty = true;
    for (let r = 0; r < height && empty; r += 1) {
      for (let c = 0; c < width; c += 1) {
        if (nb[r][c] !== 0) {
          empty = false;
          break;
        }
      }
    }
    let aggregate = 0;
    let holes = 0;
    let maxHeight = 0;
    const heights: number[] = [];
    for (let c = 0; c < width; c += 1) {
      let top = height;
      for (let r = 0; r < height; r += 1) {
        if (nb[r][c] !== 0) {
          top = r;
          break;
        }
      }
      const h = height - top;
      heights.push(h);
      aggregate += h;
      if (h > maxHeight) maxHeight = h;
      for (let r = top + 1; r < height; r += 1) {
        if (nb[r][c] === 0) holes += 1;
      }
    }
    let bumpiness = 0;
    for (let c = 0; c + 1 < width; c += 1) {
      bumpiness += Math.abs(heights[c] - heights[c + 1]);
    }
    let score = clearScore + (empty ? 1000 : 0);
    score -= 12 * holes + 0.4 * aggregate + 1.8 * bumpiness + 0.8 * maxHeight;
    const danger = height - 5;
    if (maxHeight > danger) score -= 3 * (maxHeight - danger);
    score -= above * 10000;
    return score;
  };

  let bestScore = Number.NEGATIVE_INFINITY;
  let bestActions = "H";

  for (let ori = 0; ori < orientations; ori += 1) {
    const forward = ori;
    const backward = orientations - ori;
    const rotStr = forward <= backward ? "C".repeat(forward) : "A".repeat(backward);
    const cells = piece[ori];
    let minOff = 0;
    let maxOff = 0;
    for (let i = 0; i < cells.length; i += 1) {
      if (cells[i].column < minOff) minOff = cells[i].column;
      if (cells[i].column > maxOff) maxOff = cells[i].column;
    }
    const lo = -minOff;
    const hi = width - 1 - maxOff;
    for (let dc = lo; dc <= hi; dc += 1) {
      const delta = dc - position.column;
      const latStr = delta < 0 ? "L".repeat(-delta) : "R".repeat(delta);
      for (let s = 0; s < 3; s += 1) {
        const side = s === 0 ? "" : s === 1 ? "L" : "R";
        const actions = rotStr + latStr + "H" + side;
        const res = simulate(actions);
        if (res === null) continue;
        const dropScore = Math.floor((minos * (height - res.dropRow)) / 10);
        const total = dropScore + evaluate(res.row, res.col, res.ori) - actions.length * 0.001;
        if (total > bestScore) {
          bestScore = total;
          bestActions = actions;
        }
      }
    }
  }
  return bestActions;
}

export const plan = adaptAuthoredPlan(authoredPlan)
