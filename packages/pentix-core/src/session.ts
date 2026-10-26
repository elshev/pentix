import {
  createBoard,
  DEFAULT_BOARD_SIZE,
  type Board,
  type BoardCell,
  type BoardSize,
} from './board.js'
import { PIECE_CATALOG, type LegacyPieceKey } from './catalog.js'
import type { RotationAngle } from './piece.js'

export type GameSessionStatus = 'active'

export interface BoardSnapshot {
  readonly width: number
  readonly height: number
  readonly rows: readonly (readonly BoardCell[])[]
}

export interface GameSessionStatistics {
  readonly score: number
  readonly level: number
  readonly clearedLines: number
}

export interface BoardPosition {
  readonly row: number
  readonly column: number
}

export interface ActivePieceState {
  readonly key: LegacyPieceKey
  readonly angle: RotationAngle
  readonly origin: BoardPosition
}

export interface PentixGameSession {
  readonly sessionId: string
  readonly status: GameSessionStatus
  readonly board: BoardSnapshot
  readonly statistics: GameSessionStatistics
  readonly activePiece: ActivePieceState
  readonly nextPieceKey: LegacyPieceKey
}

export interface CreatePentixGameSessionOptions {
  readonly sessionId: string
  readonly boardSize?: BoardSize
  readonly selectPieceKey?: () => LegacyPieceKey
}

function chooseRandomPieceKey(): LegacyPieceKey {
  const index = Math.floor(Math.random() * PIECE_CATALOG.length)
  return PIECE_CATALOG[index].key as LegacyPieceKey
}

function createBoardSnapshot(board: Board): BoardSnapshot {
  return Object.freeze({
    width: board.width,
    height: board.height,
    rows: board.toRows(),
  })
}

function assertSessionId(sessionId: string): string {
  const normalizedSessionId = sessionId.trim()
  if (normalizedSessionId.length === 0) {
    throw new Error('PentixGameSession sessionId must not be empty.')
  }

  return normalizedSessionId
}

export function createPentixGameSession(
  options: CreatePentixGameSessionOptions,
): PentixGameSession {
  const sessionId = assertSessionId(options.sessionId)
  const board = createBoard(options.boardSize ?? DEFAULT_BOARD_SIZE)
  const selectPieceKey = options.selectPieceKey ?? chooseRandomPieceKey
  const activePieceKey = selectPieceKey()
  const nextPieceKey = selectPieceKey()
  const origin = Object.freeze({
    row: 1,
    column: Math.floor(board.width / 2),
  })

  return Object.freeze({
    sessionId,
    status: 'active' as const,
    board: createBoardSnapshot(board),
    statistics: Object.freeze({
      score: 0,
      level: 1,
      clearedLines: 0,
    }),
    activePiece: Object.freeze({
      key: activePieceKey,
      angle: 0 as RotationAngle,
      origin,
    }),
    nextPieceKey,
  })
}
