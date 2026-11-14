/** Gravity timing — the per-level tick interval and the animation-frame cap. */
const BASE_INTERVAL_MS = 800
const INTERVAL_STEP_MS = 70
const MIN_INTERVAL_MS = 120

export const MAX_FRAME_MS = 250

export function getTickInterval(level: number): number {
  const normalizedLevel = Number.isFinite(level) ? Math.max(1, Math.trunc(level)) : 1
  const interval = BASE_INTERVAL_MS - (normalizedLevel - 1) * INTERVAL_STEP_MS
  return Math.max(MIN_INTERVAL_MS, interval)
}