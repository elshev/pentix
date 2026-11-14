/** A Pentix game — board, available pieces, and a lazily extended piece sequence. */
import {
  createBoard,
  createBoardSnapshot,
  DEFAULT_BOARD_SIZE,
  type BoardSize,
  type BoardSnapshot,
} from './board.js'
import { PIECES_BY_ID, PIECE_CATALOG } from './catalog.js'

export interface PentixGame {
  readonly id: string
  readonly name: string
  readonly board: BoardSnapshot
  readonly availablePieceIds: readonly number[]
  readonly pieceIds: readonly number[]
}

export type PieceIdSelector = () => number

export interface CreatePentixGameOptions {
  readonly id: string
  readonly name?: string
  readonly selectPieceId?: PieceIdSelector
}

interface BuildPentixGameOptions {
  readonly id: string
  readonly name?: string
  readonly boardSize: BoardSize
  readonly pieceIds: readonly number[]
  readonly selectPieceId?: PieceIdSelector
}

const PENTIX_PIECE_IDS = Object.freeze(
  PIECE_CATALOG.map((piece) => piece.id),
)

const TETROMINO_PIECE_IDS = Object.freeze(
  PIECE_CATALOG.filter((piece) => piece.offsets.length === 4).map(
    (piece) => piece.id,
  ),
)

const TETRIS_BOARD_SIZE: BoardSize = Object.freeze({ width: 10, height: 20 })

function assertEntityId(id: string, entityName: string): string {
  const normalizedId = id.trim()
  if (normalizedId.length === 0) {
    throw new Error(`${entityName} id must not be empty.`)
  }

  return normalizedId
}

function assertPieceId(id: number): number {
  if (PIECES_BY_ID[id] === undefined) {
    throw new Error(`Unknown Pentix piece id: ${id}.`)
  }

  return id
}

function normalizeAvailablePieceIds(
  pieceIds: readonly number[],
): readonly number[] {
  const availablePieceIds: number[] = []
  for (const pieceId of pieceIds) {
    const catalogPieceId = assertPieceId(pieceId)
    if (!availablePieceIds.includes(catalogPieceId)) {
      availablePieceIds.push(catalogPieceId)
    }
  }

  if (availablePieceIds.length < 2) {
    throw new Error('A PentixGame must have at least two available pieces.')
  }

  return Object.freeze(availablePieceIds)
}

function createPieceSelector(
  availablePieceIds: readonly number[],
  selectPieceId?: PieceIdSelector,
): PieceIdSelector {
  if (selectPieceId === undefined) {
    return () => {
      const index = Math.floor(Math.random() * availablePieceIds.length)
      return availablePieceIds[index]
    }
  }

  return () => {
    const pieceId = assertPieceId(selectPieceId())
    if (!availablePieceIds.includes(pieceId)) {
      throw new Error(
        `PentixGame piece id ${pieceId} is not in its available piece set.`,
      )
    }

    return pieceId
  }
}

function createPentixGameWithPieces(
  build: BuildPentixGameOptions,
): PentixGame {
  const availablePieceIds = normalizeAvailablePieceIds(build.pieceIds)
  const nextPieceId = createPieceSelector(
    availablePieceIds,
    build.selectPieceId,
  )
  const board = createBoard(build.boardSize)

  return Object.freeze({
    id: assertEntityId(build.id, 'PentixGame'),
    name: build.name ?? '',
    board: createBoardSnapshot(board),
    availablePieceIds,
    pieceIds: Object.freeze([nextPieceId(), nextPieceId()]),
  })
}

export function createPentixGame(options: CreatePentixGameOptions): PentixGame {
  return createPentixGameWithPieces({
    id: options.id,
    name: options.name,
    boardSize: DEFAULT_BOARD_SIZE,
    pieceIds: PENTIX_PIECE_IDS,
    selectPieceId: options.selectPieceId,
  })
}

export function createTetrisGame(options: CreatePentixGameOptions): PentixGame {
  return createPentixGameWithPieces({
    id: options.id,
    name: options.name,
    boardSize: TETRIS_BOARD_SIZE,
    pieceIds: TETROMINO_PIECE_IDS,
    selectPieceId: options.selectPieceId,
  })
}

export function ensurePentixGamePieceAtIndex(
  game: PentixGame,
  pieceIndex: number,
  selectPieceId?: PieceIdSelector,
): PentixGame {
  if (!Number.isInteger(pieceIndex) || pieceIndex < 0) {
    throw new RangeError('PentixGame piece index must be a non-negative integer.')
  }

  if (pieceIndex < game.pieceIds.length) {
    return game
  }

  const nextPieceId = createPieceSelector(game.availablePieceIds, selectPieceId)
  const pieceIds = [...game.pieceIds]
  while (pieceIds.length <= pieceIndex) {
    pieceIds.push(nextPieceId())
  }

  return Object.freeze({
    ...game,
    pieceIds: Object.freeze(pieceIds),
  })
}
