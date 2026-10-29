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
  readonly pieceIds: readonly number[]
}

export type PieceIdSelector = () => number

export interface CreatePentixGameOptions {
  readonly id: string
  readonly name?: string
  readonly boardSize?: BoardSize
  readonly selectPieceId?: PieceIdSelector
}

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

function chooseRandomPieceId(): number {
  const index = Math.floor(Math.random() * PIECE_CATALOG.length)
  return PIECE_CATALOG[index].id
}

export function createPentixGame(
  options: CreatePentixGameOptions,
): PentixGame {
  const selectPieceId = options.selectPieceId ?? chooseRandomPieceId
  const board = createBoard(options.boardSize ?? DEFAULT_BOARD_SIZE)

  return Object.freeze({
    id: assertEntityId(options.id, 'PentixGame'),
    name: options.name ?? '',
    board: createBoardSnapshot(board),
    pieceIds: Object.freeze([
      assertPieceId(selectPieceId()),
      assertPieceId(selectPieceId()),
    ]),
  })
}

export function ensurePentixGamePieceAtIndex(
  game: PentixGame,
  pieceIndex: number,
  selectPieceId: PieceIdSelector = chooseRandomPieceId,
): PentixGame {
  if (!Number.isInteger(pieceIndex) || pieceIndex < 0) {
    throw new RangeError('PentixGame piece index must be a non-negative integer.')
  }

  if (pieceIndex < game.pieceIds.length) {
    return game
  }

  const pieceIds = [...game.pieceIds]
  while (pieceIds.length <= pieceIndex) {
    pieceIds.push(assertPieceId(selectPieceId()))
  }

  return Object.freeze({
    ...game,
    pieceIds: Object.freeze(pieceIds),
  })
}
