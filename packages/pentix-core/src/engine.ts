import {
  createBoard,
  createBoardSnapshot,
  type BoardSnapshot,
} from './board.js'
import {
  getPieceDefinition,
  getPieceDefinitionById,
  type PieceKey,
} from './catalog.js'
import {
  ensurePentixGamePieceAtIndex,
  type PentixGame,
  type PieceIdSelector,
} from './game.js'
import {
  normalizeAngle,
  Piece,
  type Offset,
  type RotationAngle,
} from './piece.js'
import type {
  ActivePieceState,
  AdvancePentixGameSessionResult,
  BoardPosition,
  GameSessionStatistics,
  PentixGameSession,
} from './session.js'

export type MoveDirection = 'left' | 'right'
export type RotateDirection = 'clockwise' | 'counterclockwise'

const MAX_LEVEL = 9
const BLOCKS_PER_LEVEL = 30
const LINE_CLEAR_BASE = 10
const LINE_CLEAR_BONUS = 1000
const DROP_SCORE_DIVISOR = 10

type PlacementError = 'none' | 'left' | 'right' | 'top' | 'bottom' | 'buried'

function getActivePiece(session: PentixGameSession): Piece {
  return new Piece(
    getPieceDefinition(session.activePiece.key),
    session.activePiece.angle,
  )
}

function getOccupiedCells(
  piece: Piece,
  origin: BoardPosition,
): BoardPosition[] {
  return piece.occupiedOffsets.map((offset) => ({
    row: origin.row + offset.y,
    column: origin.column + offset.x,
  }))
}

function checkPlacement(
  board: BoardSnapshot,
  cells: BoardPosition[],
): PlacementError {
  for (const cell of cells) {
    if (cell.column < 0) {
      return 'left'
    }
    if (cell.column >= board.width) {
      return 'right'
    }
    if (cell.row < 0) {
      return 'top'
    }
    if (cell.row >= board.height) {
      return 'bottom'
    }
    if (board.rows[cell.row][cell.column].isOccupied) {
      return 'buried'
    }
  }

  return 'none'
}

function canPlace(board: BoardSnapshot, cells: BoardPosition[]): boolean {
  return checkPlacement(board, cells) === 'none'
}

function rotatedExtremes(offsets: readonly Offset[]): {
  minX: number
  maxX: number
  minY: number
} {
  let minX = 0
  let maxX = 0
  let minY = 0

  for (const offset of offsets) {
    if (offset.x < minX) {
      minX = offset.x
    }
    if (offset.x > maxX) {
      maxX = offset.x
    }
    if (offset.y < minY) {
      minY = offset.y
    }
  }

  return { minX, maxX, minY }
}

function withActivePiece(
  session: PentixGameSession,
  angle: RotationAngle,
  origin: BoardPosition,
): PentixGameSession {
  return Object.freeze({
    ...session,
    activePiece: Object.freeze({
      key: session.activePiece.key,
      angle,
      origin: Object.freeze({ ...origin }),
    }),
  })
}

function withStatistics(
  session: PentixGameSession,
  statistics: GameSessionStatistics,
): PentixGameSession {
  return Object.freeze({
    ...session,
    statistics: Object.freeze({ ...statistics }),
  })
}

function createSpawnActive(key: PieceKey, width: number): ActivePieceState {
  return Object.freeze({
    key,
    angle: 0 as RotationAngle,
    origin: Object.freeze({
      row: 1,
      column: Math.floor(width / 2),
    }),
  })
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

function isBoardEmpty(board: BoardSnapshot): boolean {
  return board.rows.every((row) => row.every((cell) => !cell.isOccupied))
}

function lockAndClear(
  session: PentixGameSession,
  cells: BoardPosition[],
  pieceKey: PieceKey,
): { board: BoardSnapshot; clearedRows: number[] } {
  const width = session.board.width
  const height = session.board.height
  const grid: (PieceKey | undefined)[][] = session.board.rows.map((row) =>
    row.map((cell) => (cell.isOccupied ? cell.pieceKey : undefined)),
  )

  for (const cell of cells) {
    grid[cell.row][cell.column] = pieceKey
  }

  const surviving: (PieceKey | undefined)[][] = []
  const clearedRows: number[] = []
  for (let row = 0; row < height; row++) {
    if (grid[row].every((key) => key !== undefined)) {
      clearedRows.push(row)
    } else {
      surviving.push(grid[row])
    }
  }

  const nextGrid = [
    ...Array.from({ length: clearedRows.length }, () =>
      Array(width).fill(undefined),
    ),
    ...surviving,
  ]

  const board = createBoard({ width, height })
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      const key = nextGrid[row][column]
      if (key !== undefined) {
        board.setCell(row, column, key)
      }
    }
  }

  return { board: createBoardSnapshot(board), clearedRows }
}

function spawn(
  session: PentixGameSession,
  game: PentixGame,
  board: BoardSnapshot,
  statistics: GameSessionStatistics,
  selectPieceId?: PieceIdSelector,
): AdvancePentixGameSessionResult {
  const spawnKey = session.nextPieceKey
  const spawnActive = createSpawnActive(spawnKey, board.width)
  const spawnPiece = new Piece(getPieceDefinition(spawnKey), 0)

  if (!canPlace(board, getOccupiedCells(spawnPiece, spawnActive.origin))) {
    return {
      game,
      session: Object.freeze({
        ...session,
        status: 'game-over',
        board,
        statistics,
        activePiece: spawnActive,
      }),
    }
  }

  const nextPieceIndex = session.nextPieceIndex + 1
  const nextGame = ensurePentixGamePieceAtIndex(
    game,
    nextPieceIndex,
    selectPieceId,
  )
  const nextPieceKey = getGamePieceKey(nextGame, nextPieceIndex)

  return {
    game: nextGame,
    session: Object.freeze({
      ...session,
      board,
      statistics,
      activePiece: spawnActive,
      nextPieceKey,
      nextPieceIndex,
    }),
  }
}

function settle(
  session: PentixGameSession,
  game: PentixGame,
  selectPieceId?: PieceIdSelector,
): AdvancePentixGameSessionResult {
  const piece = getActivePiece(session)
  const cells = getOccupiedCells(piece, session.activePiece.origin)
  const level = session.statistics.level

  let score = session.statistics.score + piece.points * level

  const { board, clearedRows } = lockAndClear(session, cells, piece.key)

  let clearedLines = session.statistics.clearedLines
  let lineIndex = 0
  for (const row of clearedRows) {
    lineIndex += 1
    score +=
      lineIndex * (LINE_CLEAR_BASE + (session.board.height - row)) * level
    clearedLines += 1
  }

  if (
    clearedRows.includes(session.board.height - 1) &&
    isBoardEmpty(board)
  ) {
    score += LINE_CLEAR_BONUS
  }

  const blocks = session.statistics.blocks + 1
  let nextLevel = level
  if (blocks % BLOCKS_PER_LEVEL === 0 && nextLevel < MAX_LEVEL) {
    nextLevel += 1
  }

  const statistics = Object.freeze({
    score,
    level: nextLevel,
    clearedLines,
    blocks,
  })

  return spawn(session, game, board, statistics, selectPieceId)
}

export function moveActivePiece(
  session: PentixGameSession,
  direction: MoveDirection,
): PentixGameSession {
  if (session.status !== 'active') {
    return session
  }

  const piece = getActivePiece(session)
  const delta = direction === 'left' ? -1 : 1
  const origin = {
    row: session.activePiece.origin.row,
    column: session.activePiece.origin.column + delta,
  }

  if (!canPlace(session.board, getOccupiedCells(piece, origin))) {
    return session
  }

  return withActivePiece(session, session.activePiece.angle, origin)
}

export function rotateActivePiece(
  session: PentixGameSession,
  direction: RotateDirection,
): PentixGameSession {
  if (session.status !== 'active') {
    return session
  }

  const piece = getActivePiece(session)
  const step = direction === 'clockwise' ? -90 : 90
  const nextAngle = normalizeAngle(
    session.activePiece.angle + step,
    piece.rotationMode,
  )
  if (nextAngle === session.activePiece.angle) {
    return session
  }

  const nextPiece = piece.withAngle(nextAngle)
  const origin = session.activePiece.origin
  if (canPlace(session.board, getOccupiedCells(nextPiece, origin))) {
    return withActivePiece(session, nextAngle, origin)
  }

  const { minX, maxX, minY } = rotatedExtremes(nextPiece.occupiedOffsets)
  const width = session.board.width
  const kick: Partial<Record<PlacementError, BoardPosition>> = {
    right: { row: origin.row, column: width - maxX - 1 },
    left: { row: origin.row, column: -minX },
    top: { row: -minY, column: origin.column },
  }
  const error = checkPlacement(
    session.board,
    getOccupiedCells(nextPiece, origin),
  )
  const kickOrigin = kick[error]
  if (
    kickOrigin !== undefined &&
    canPlace(session.board, getOccupiedCells(nextPiece, kickOrigin))
  ) {
    return withActivePiece(session, nextAngle, kickOrigin)
  }

  return session
}

export function tickSession(
  session: PentixGameSession,
  game: PentixGame,
  selectPieceId?: PieceIdSelector,
): AdvancePentixGameSessionResult {
  if (session.status !== 'active') {
    return { game, session }
  }

  const piece = getActivePiece(session)
  const down = {
    row: session.activePiece.origin.row + 1,
    column: session.activePiece.origin.column,
  }

  if (canPlace(session.board, getOccupiedCells(piece, down))) {
    return { game, session: withActivePiece(session, session.activePiece.angle, down) }
  }

  return settle(session, game, selectPieceId)
}

export function dropSession(
  session: PentixGameSession,
  game: PentixGame,
): AdvancePentixGameSessionResult {
  if (session.status !== 'active') {
    return { game, session }
  }

  const piece = getActivePiece(session)
  const dropScore = Math.floor(
    (piece.points *
      (session.board.height - session.activePiece.origin.row) *
      session.statistics.level) /
      DROP_SCORE_DIVISOR,
  )

  let row = session.activePiece.origin.row
  while (
    canPlace(
      session.board,
      getOccupiedCells(piece, {
        row: row + 1,
        column: session.activePiece.origin.column,
      }),
    )
  ) {
    row += 1
  }

  const moved = withActivePiece(session, session.activePiece.angle, {
    row,
    column: session.activePiece.origin.column,
  })
  const scored = withStatistics(moved, {
    ...moved.statistics,
    score: moved.statistics.score + dropScore,
  })

  return { game, session: scored }
}

