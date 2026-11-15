/** Gravity timing — the per-level tick interval and the animation-frame cap. */
// Ported from the Delphi client (`Tetris.Speed := 1000 - 100 * FLevel`): every
// level is 100 ms faster, so level 0 ticks at 1000 ms and level 9 at 100 ms.
const BASE_INTERVAL_MS = 1000
const LEVEL_STEP_MS = 100
const MIN_INTERVAL_MS = 100

export const MAX_FRAME_MS = 250

export function getTickInterval(level: number): number {
  const normalized = Number.isFinite(level) ? Math.trunc(level) : 0
  const interval = BASE_INTERVAL_MS - normalized * LEVEL_STEP_MS
  return Math.max(MIN_INTERVAL_MS, interval)
}