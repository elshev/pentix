import {
  createBoard,
  createBoardSnapshot,
  type Board,
  type BoardSnapshot,
} from './board.js'
import {
  getPieceDefinitionById,
  type PieceKey,
} from './catalog.js'
import {
  ensurePentixGamePieceAtIndex,
  type PentixGame,
  type PieceIdSelector,
} from './game.js'
import type { RotationAngle } from './piece.js'

export type GameSessionStatus = 'active'

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
  readonly key: PieceKey
  readonly angle: RotationAngle
  readonly origin: BoardPosition
}

export interface PentixGameSession {
  readonly id: string
  readonly userId: string
  readonly gameId: string
  readonly status: GameSessionStatus
  readonly board: BoardSnapshot
  readonly statistics: GameSessionStatistics
  readonly activePiece: ActivePieceState
  readonly nextPieceKey: PieceKey
  readonly nextPieceIndex: number
}

export interface CreatePentixGameSessionOptions {
  readonly id: string
  readonly userId: string
  readonly game: PentixGame
}

export interface AdvancePentixGameSessionResult {
  readonly game: PentixGame
  readonly session: PentixGameSession
}

function assertSessionId(id: string): string {
  const normalizedId = id.trim()
  if (normalizedId.length === 0) {
    throw new Error('PentixGameSession id must not be empty.')
  }

  return normalizedId
}

function assertUserId(userId: string): string {
  const normalizedUserId = userId.trim()
  if (normalizedUserId.length === 0) {
    throw new Error('PentixGameSession userId must not be empty.')
  }

  return normalizedUserId
}

function createBoardFromSnapshot(snapshot: BoardSnapshot): Board {
  const board = createBoard({
    width: snapshot.width,
    height: snapshot.height,
  })

  for (const row of snapshot.rows) {
    for (const cell of row) {
      if (cell.isOccupied) {
        if (cell.pieceKey === undefined) {
          throw new Error('An occupied board cell must have a piece key.')
        }

        board.setCell(cell.row, cell.column, cell.pieceKey)
      }
    }
  }

  return board
}

function getGamePieceKey(game: PentixGame, pieceIndex: number): PieceKey {
  const pieceId = game.pieceIds[pieceIndex]
  if (pieceId === undefined) {
    throw new RangeError(
      `PentixGame ${game.id} does not have a piece at index ${pieceIndex}.`,
    )
  }

  return getPieceDefinitionById(pieceId).key
}

function createActivePieceState(
  key: PieceKey,
  boardWidth: number,
): ActivePieceState {
  return Object.freeze({
    key,
    angle: 0 as RotationAngle,
    origin: Object.freeze({
      row: 1,
      column: Math.floor(boardWidth / 2),
    }),
  })
}

export function createPentixGameSession(
  options: CreatePentixGameSessionOptions,
): PentixGameSession {
  const id = assertSessionId(options.id)
  const board = createBoardFromSnapshot(options.game.board)
  const activePieceKey = getGamePieceKey(options.game, 0)
  const nextPieceKey = getGamePieceKey(options.game, 1)

  return Object.freeze({
    id,
    userId: assertUserId(options.userId),
    gameId: options.game.id,
    status: 'active' as const,
    board: createBoardSnapshot(board),
    statistics: Object.freeze({
      score: 0,
      level: 1,
      clearedLines: 0,
    }),
    activePiece: createActivePieceState(activePieceKey, board.width),
    nextPieceKey,
    nextPieceIndex: 1,
  })
}

export function advancePentixGameSession(
  session: PentixGameSession,
  game: PentixGame,
  selectPieceId?: PieceIdSelector,
): AdvancePentixGameSessionResult {
  if (session.gameId !== game.id) {
    throw new Error(
      `PentixGameSession ${session.id} does not belong to PentixGame ${game.id}.`,
    )
  }

  const activePieceKey = getGamePieceKey(game, session.nextPieceIndex)
  const nextPieceIndex = session.nextPieceIndex + 1
  const nextGame = ensurePentixGamePieceAtIndex(
    game,
    nextPieceIndex,
    selectPieceId,
  )
  const nextPieceKey = getGamePieceKey(nextGame, nextPieceIndex)

  return Object.freeze({
    game: nextGame,
    session: Object.freeze({
      ...session,
      activePiece: createActivePieceState(
        activePieceKey,
        session.board.width,
      ),
      nextPieceKey,
      nextPieceIndex,
    }),
  })
}
