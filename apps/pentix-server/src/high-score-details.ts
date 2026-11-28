/**
 * Builds one high-score detail from lifecycle memory: the row, its replayed
 * session statistics, the stored game, and the best finished sessions of that
 * game.
 *
 * The builder reads no repository. `PentixGameLifecycle.load` already replayed
 * every stored log, so the detail answers from the retained sessions and logs.
 */
import type {
  GameSessionActionCounts,
  GameSessionStatistics,
  PentixGame,
  SessionActionLog,
  UserType,
} from '../../../packages/pentix-core/dist/index.js'
import { encodeBoardLine, encodePieceIds } from './compact-game.js'
import {
  achievedAtFromSessionId,
  type HighScoreService,
} from './high-scores.js'
import type { GameSessionRecord, PentixGameLifecycle } from './server.js'

/** The best-session count a detail request uses when it names none. */
export const DEFAULT_BEST_SESSION_COUNT = 9

/** The most best sessions one detail response carries. */
export const MAX_BEST_SESSION_COUNT = 32

/** The session statistics of the expanded row, without the piece counts. */
export interface HighScoreDetailStatistics {
  readonly score: number
  readonly level: number
  readonly clearedLines: number
  readonly blocks: number
  readonly actions: GameSessionActionCounts
}

/** The stored game as one compact replay input. */
export interface HighScoreGameView {
  readonly id: string
  readonly name: string
  readonly width: number
  readonly height: number
  /** One row-major line of `0` and `1`, `width * height` characters long. */
  readonly board: string
  /** One byte per piece id, base64 encoded. */
  readonly pieceIds: string
}

/** One best session of the game, reduced for the detail response. */
export interface HighScoreSessionSummary {
  readonly sessionId: string
  readonly userId: string
  readonly name: string
  readonly engineId?: string
  readonly type: UserType
  readonly level?: number
  readonly seedColumn?: number
  readonly score: number
  readonly clearedLines: number
  readonly blocks: number
  readonly achievedAt: string
  /** Per-piece action strings, aligned with `game.pieceIds`. */
  readonly actions: readonly string[]
}

/** One row with its session, its game, and the best sessions of that game. */
export interface HighScoreDetail {
  readonly sessionId: string
  readonly name: string
  readonly score: number
  readonly achievedAt: string
  readonly type: UserType
  readonly gameId: string
  readonly statistics: HighScoreDetailStatistics
  readonly game: HighScoreGameView
  readonly bestSessions: readonly HighScoreSessionSummary[]
}

interface RankedSession {
  readonly record: GameSessionRecord
  readonly achievedAt: string
}

function toStatistics(
  statistics: GameSessionStatistics,
): HighScoreDetailStatistics {
  return Object.freeze({
    score: statistics.score,
    level: statistics.level,
    clearedLines: statistics.clearedLines,
    blocks: statistics.blocks,
    actions: statistics.actions,
  })
}

function toGameView(game: PentixGame): HighScoreGameView {
  return Object.freeze({
    id: game.id,
    name: game.name,
    width: game.board.width,
    height: game.board.height,
    board: encodeBoardLine(game.board),
    pieceIds: encodePieceIds(game.pieceIds),
  })
}

/**
 * Returns the per-piece action strings of one log, aligned with the game piece
 * sequence. An AI log drops every `T` code, because demo playback adds the tick
 * after each action and after the log ends.
 */
function toActions(
  log: SessionActionLog,
  type: UserType,
): readonly string[] {
  return Object.freeze(
    log.pieces.map((piece) =>
      type === 'ai' ? piece.actions.replaceAll('T', '') : piece.actions,
    ),
  )
}


function compareRankedSessions(a: RankedSession, b: RankedSession): number {
  return (
    b.record.session.statistics.score - a.record.session.statistics.score ||
    (a.achievedAt < b.achievedAt ? -1 : a.achievedAt > b.achievedAt ? 1 : 0) ||
    (a.record.session.id < b.record.session.id
      ? -1
      : a.record.session.id > b.record.session.id
        ? 1
        : 0)
  )
}

function toSummary(ranked: RankedSession): HighScoreSessionSummary {
  const { session, log, user } = ranked.record
  const type: UserType = user?.type ?? 'human'
  return Object.freeze({
    sessionId: session.id,
    userId: session.userId,
    name: user?.name ?? session.userId,
    ...(user?.engineId === undefined ? {} : { engineId: user.engineId }),
    type,
    ...(log.level === undefined ? {} : { level: log.level }),
    ...(log.seedColumn === undefined ? {} : { seedColumn: log.seedColumn }),
    score: session.statistics.score,
    clearedLines: session.statistics.clearedLines,
    blocks: session.statistics.blocks,
    achievedAt: ranked.achievedAt,
    actions: toActions(log, type),
  })
}

/**
 * Returns the detail of one high-score row, or `undefined` when the row, its
 * stored log, or its stored game is absent.
 */
export function buildHighScoreDetail(
  lifecycle: PentixGameLifecycle,
  highScores: HighScoreService,
  sessionId: string,
  bestSessionCount: number,
): HighScoreDetail | undefined {
  const row = highScores.find(sessionId)
  const session = lifecycle.getReplayedSession(sessionId)
  if (
    row === undefined ||
    session === undefined ||
    lifecycle.getSessionLog(sessionId) === undefined
  ) {
    return undefined
  }

  const game = lifecycle.getGame(session.gameId)
  if (game === undefined) {
    return undefined
  }

  const ranked: RankedSession[] = []
  for (const record of lifecycle.listGameSessions(session.gameId)) {
    if (record.session.status !== 'game-over') {
      continue
    }

    const achievedAt =
      highScores.find(record.session.id)?.achievedAt ??
      achievedAtFromSessionId(record.session.id)
    if (achievedAt === undefined) {
      continue
    }

    ranked.push({ record, achievedAt })
  }

  ranked.sort(compareRankedSessions)
  const bestSessions = ranked
    .slice(0, bestSessionCount)
    .map((entry) => toSummary(entry))

  return Object.freeze({
    sessionId: row.sessionId,
    name: row.name,
    score: row.score,
    achievedAt: row.achievedAt,
    type: row.type,
    gameId: session.gameId,
    statistics: toStatistics(session.statistics),
    game: toGameView(game),
    bestSessions: Object.freeze(bestSessions),
  })
}
