import type { HighScoreEntry } from './entities.js'

/**
 * Orders two high-score rows: the higher score first, then the earlier
 * achievement, then the smaller session id. The total order keeps a table
 * stable across a reload and a backfill.
 */
export function compareHighScoreEntries(
  a: HighScoreEntry,
  b: HighScoreEntry,
): number {
  return (
    b.score - a.score ||
    (a.achievedAt < b.achievedAt ? -1 : a.achievedAt > b.achievedAt ? 1 : 0) ||
    (a.sessionId < b.sessionId ? -1 : a.sessionId > b.sessionId ? 1 : 0)
  )
}

/** Sorts the rows and keeps the first `tableLimit` of them. */
export function orderHighScoreEntries(
  entries: readonly HighScoreEntry[],
  tableLimit: number,
): readonly HighScoreEntry[] {
  return [...entries].sort(compareHighScoreEntries).slice(0, tableLimit)
}
