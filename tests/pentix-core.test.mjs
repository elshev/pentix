import assert from 'node:assert/strict'
import test from 'node:test'

import {
  advancePentixGameSession,
  createBoardSnapshot,
  createPentixGame,
  createTetrisGame,
  ensurePentixGamePieceAtIndex,
  createPentixGameSession,
  createUser,
  gameSessionEngine,
  Board,
  DEFAULT_BOARD_SIZE,
  PIECE_CATALOG,
  PIECES_BY_KEY,
  Piece,
  getOccupiedOffsets,
  normalizeAngle,
  canDemoPieceMoveDown,
  planDemoDestination,
  planDemoLastTickMove,
  replayPentixGameSession,
} from '../packages/pentix-core/dist/index.js'

const expectedCatalog = [
  [0, '1Line', 'none', [[0, 0]]],
  [1, '2Line', 'half', [[0, 0], [0, 1]]],
  [2, '3Line', 'half', [[0, 0], [-1, 0], [1, 0]]],
  [3, '3Corner', 'full', [[0, 0], [0, -1], [1, 0]]],
  [4, '4Line', 'half', [[0, 0], [-2, 0], [-1, 0], [1, 0]]],
  [5, '4Square', 'none', [[0, 0], [0, 1], [1, 1], [1, 0]]],
  [6, '4T', 'full', [[0, 0], [-1, 0], [1, 0], [0, -1]]],
  [7, '4L', 'full', [[0, 0], [-1, 0], [1, 0], [1, -1]]],
  [8, '4LMir', 'full', [[0, 0], [-1, -1], [-1, 0], [1, 0]]],
  [9, '4S', 'half', [[0, 0], [-1, 0], [0, -1], [1, -1]]],
  [10, '4SMir', 'half', [[0, 0], [-1, -1], [0, -1], [1, 0]]],
  [11, '5Line', 'half', [[0, 0], [-2, 0], [-1, 0], [1, 0], [2, 0]]],
  [12, '5Corner', 'full', [[-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1]]],
  [13, '5Cross', 'none', [[0, 0], [0, -1], [-1, 0], [0, 1], [1, 0]]],
  [14, '5T', 'full', [[0, 0], [1, -1], [0, -1], [-1, -1], [0, 1]]],
  [15, '5W', 'full', [[0, 0], [-1, 1], [0, 1], [1, 0], [1, -1]]],
  [16, '5U', 'full', [[0, 0], [-1, -1], [-1, 0], [1, 0], [1, -1]]],
  [17, '5L', 'full', [[0, 0], [-2, 0], [-1, 0], [1, 0], [1, -1]]],
  [18, '5LMir', 'full', [[0, 0], [-1, -1], [-1, 0], [1, 0], [2, 0]]],
  [19, '5S', 'full', [[0, 0], [0, -1], [-2, 0], [-1, 0], [1, -1]]],
  [20, '5SMir', 'full', [[0, 0], [0, -1], [-1, -1], [1, 0], [2, 0]]],
  [21, '5F', 'full', [[0, 0], [0, -1], [-1, 1], [0, 1], [1, 0]]],
  [22, '5FMir', 'full', [[0, 0], [0, -1], [-1, 0], [0, 1], [1, 1]]],
  [23, '5P', 'full', [[0, 0], [1, 0], [1, -1], [0, -1], [0, 1]]],
  [24, '5PMir', 'full', [[0, 0], [0, -1], [-1, -1], [-1, 0], [0, 1]]],
  [25, '5Z', 'half', [[0, 0], [0, -1], [-1, -1], [0, 1], [1, 1]]],
  [26, '5ZMir', 'half', [[0, 0], [1, -1], [0, -1], [-1, 1], [0, 1]]],
  [27, '5R', 'full', [[0, 0], [2, 0], [1, 0], [0, -1], [-1, 0]]],
  [28, '5RMir', 'full', [[0, 0], [1, 0], [0, -1], [-2, 0], [-1, 0]]],
]

function offsetsToPairs(offsets) {
  return offsets.map(({ x, y }) => [x, y])
}

function createSelector(pieceIds) {
  let selectionIndex = 0
  return () => pieceIds[selectionIndex++]
}

test('piece catalog matches the Delphi source definitions', () => {
  assert.equal(PIECE_CATALOG.length, 29)

  const actualCatalog = PIECE_CATALOG.map((piece) => [
    piece.id,
    piece.key,
    piece.rotationMode,
    offsetsToPairs(piece.offsets),
  ])

  assert.deepEqual(actualCatalog, expectedCatalog)
  assert.equal(new Set(PIECE_CATALOG.map((piece) => piece.id)).size, 29)
  assert.equal(new Set(PIECE_CATALOG.map((piece) => piece.key)).size, 29)
  assert.equal(
    PIECE_CATALOG.some((piece) => piece.key.startsWith('bi') || 'name' in piece),
    false,
  )
})

test('rotation normalization follows the Delphi rules', () => {
  assert.equal(normalizeAngle(270, 'full'), 270)
  assert.equal(normalizeAngle(270, 'half'), 90)
  assert.equal(normalizeAngle(90, 'none'), 0)
  assert.equal(normalizeAngle(95, 'full'), 0)

  const piece = new Piece(PIECES_BY_KEY['3Corner'], 90)
  assert.deepEqual(offsetsToPairs(piece.occupiedOffsets), [
    [0, 0],
    [-1, 0],
    [0, -1],
  ])
})

test('5Corner preserves the legacy empty-origin geometry', () => {
  const cornerOffsets = offsetsToPairs(PIECES_BY_KEY['5Corner'].offsets)
  assert.equal(
    cornerOffsets.some(([x, y]) => x === 0 && y === 0),
    false,
  )
})

test('shared piece definitions stay immutable at runtime', () => {
  const cornerOffset = PIECES_BY_KEY['3Corner'].offsets[0]

  assert.equal(Object.isFrozen(cornerOffset), true)
  assert.throws(() => {
    cornerOffset.x = 99
  }, TypeError)
  assert.deepEqual(offsetsToPairs(PIECES_BY_KEY['3Corner'].offsets), [
    [0, 0],
    [0, -1],
    [1, 0],
  ])
})

test('board cells can be addressed consistently', () => {
  const board = new Board(DEFAULT_BOARD_SIZE.width, DEFAULT_BOARD_SIZE.height)

  assert.equal(board.width, 12)
  assert.equal(board.height, 22)
  assert.equal(board.getCell(0, 0).isOccupied, false)

  board.setCell(5, 4, '4T')
  assert.deepEqual(board.getCell(5, 4), {
    row: 5,
    column: 4,
    isOccupied: true,
    pieceKey: '4T',
  })

  board.clearCell(5, 4)
  assert.equal(board.getCell(5, 4).isOccupied, false)
})

test('board cell snapshots cannot be mutated directly', () => {
  const board = new Board(DEFAULT_BOARD_SIZE.width, DEFAULT_BOARD_SIZE.height)
  const cell = board.setCell(5, 4, '4T')
  const rows = board.toRows()

  assert.equal(Object.isFrozen(cell), true)
  assert.equal(Object.isFrozen(rows), true)
  assert.equal(Object.isFrozen(rows[5]), true)
  assert.throws(() => {
    cell.pieceKey = '3Corner'
  }, TypeError)
  assert.deepEqual(board.getCell(5, 4), {
    row: 5,
    column: 4,
    isOccupied: true,
    pieceKey: '4T',
  })
})

test('occupied offsets can be computed without a Piece instance', () => {
  assert.deepEqual(
    offsetsToPairs(getOccupiedOffsets(PIECES_BY_KEY['2Line'].offsets, 270, 'half')),
    [
      [0, 0],
      [1, 0],
    ],
  )
})

test('game initializer creates an independent serializable default game', () => {
  const game = createPentixGame({
    id: 'game-1',
    selectPieceId: createSelector([3, 14]),
  })

  assert.equal(game.id, 'game-1')
  assert.equal(game.name, '')
  assert.deepEqual([game.board.width, game.board.height], [12, 22])
  assert.equal(game.board.rows.flat().some((cell) => cell.isOccupied), false)
  assert.deepEqual(game.pieceIds, [3, 14])
  assert.ok(
    game.pieceIds.every((pieceId) =>
      PIECE_CATALOG.some((piece) => piece.id === pieceId),
    ),
  )
  assert.doesNotThrow(() => JSON.stringify(game))
})

test('game initializer accepts a custom name and validates piece IDs', () => {
  const game = createPentixGame({
    id: 'game-2',
    name: 'Evening game',
    selectPieceId: createSelector([1, 2]),
  })

  assert.equal(game.name, 'Evening game')
  assert.throws(
    () =>
      createPentixGame({
        id: 'game-3',
        selectPieceId: () => 99,
      }),
    /Unknown Pentix piece id/,
  )
})

test('game session initializer starts from its parent game', () => {
  const game = createPentixGame({
    id: 'game-1',
    selectPieceId: createSelector([3, 14]),
  })
  const session = createPentixGameSession({
    id: 'session-1',
    userId: 'user-1',
    game,
  })

  assert.equal(session.id, 'session-1')
  assert.equal(session.userId, 'user-1')
  assert.equal(session.gameId, 'game-1')
  assert.equal(session.status, 'active')
  assert.equal('sessionId' in session, false)
  assert.notEqual(session.board, game.board)
  assert.deepEqual([session.board.width, session.board.height], [12, 22])
  assert.equal(session.board.rows.flat().some((cell) => cell.isOccupied), false)
  assert.deepEqual(session.statistics, {
    score: 0,
    level: 1,
    clearedLines: 0,
    blocks: 0,
  })
  assert.deepEqual(session.activePiece.origin, { row: 1, column: 6 })
  assert.equal(session.activePiece.angle, 0)
  assert.equal(session.activePiece.key, '3Corner')
  assert.equal(session.nextPieceKey, '5T')
  assert.equal(session.nextPieceIndex, 1)
  assert.doesNotThrow(() => JSON.stringify(session))
})


test('next-piece advancement extends the game and preserves session fields', () => {
  let game = createPentixGame({
    id: 'game-1',
    selectPieceId: createSelector([3, 14]),
  })
  let session = createPentixGameSession({
    id: 'session-1',
    userId: 'user-1',
    game,
  })

  const firstAdvance = advancePentixGameSession(
    session,
    game,
    () => 6,
  )
  game = firstAdvance.game
  session = firstAdvance.session

  assert.deepEqual(game.pieceIds, [3, 14, 6])
  assert.equal(session.activePiece.key, '5T')
  assert.equal(session.activePiece.angle, 0)
  assert.deepEqual(session.activePiece.origin, { row: 1, column: 6 })
  assert.equal(session.nextPieceKey, '4T')
  assert.equal(session.nextPieceIndex, 2)
  assert.equal(session.userId, 'user-1')
  assert.equal(session.gameId, 'game-1')
  assert.deepEqual(session.statistics, {
    score: 0,
    level: 1,
    clearedLines: 0,
    blocks: 0,
  })

  const secondAdvance = advancePentixGameSession(
    session,
    game,
    () => 1,
  )
  assert.deepEqual(secondAdvance.game.pieceIds, [3, 14, 6, 1])
  assert.equal(secondAdvance.session.activePiece.key, '4T')
  assert.equal(secondAdvance.session.nextPieceKey, '2Line')
  assert.equal(secondAdvance.session.nextPieceIndex, 3)
})

test('sessions using one game share sequence values without sharing state', () => {
  const game = createPentixGame({
    id: 'shared-game',
    selectPieceId: createSelector([3, 14]),
  })
  const firstSession = createPentixGameSession({
    id: 'session-1',
    userId: 'user-1',
    game,
  })
  const secondSession = createPentixGameSession({
    id: 'session-2',
    userId: 'user-1',
    game,
  })

  assert.notEqual(firstSession.board, secondSession.board)
  assert.equal(firstSession.activePiece.key, secondSession.activePiece.key)
  assert.equal(firstSession.nextPieceKey, secondSession.nextPieceKey)

  const advanced = advancePentixGameSession(
    firstSession,
    game,
    () => 6,
  )

  assert.deepEqual(advanced.game.pieceIds, [3, 14, 6])
  assert.equal(advanced.session.nextPieceIndex, 2)
  assert.equal(advanced.session.activePiece.key, '5T')
  assert.equal(secondSession.nextPieceIndex, 1)
  assert.equal(secondSession.activePiece.key, '3Corner')
})

test('user initializer creates a frozen snapshot with a trimmed name', () => {
  const user = createUser({
    id: 'user-1',
    name: '  Ada  ',
  })

  assert.deepEqual(user, { id: 'user-1', name: 'Ada' })
  assert.equal(Object.isFrozen(user), true)
  assert.doesNotThrow(() => JSON.stringify(user))
})

test('user initializer rejects empty ids and names', () => {
  assert.throws(
    () => createUser({ id: '   ', name: 'Ada' }),
    /User id must not be empty/,
  )
  assert.throws(
    () => createUser({ id: 'user-1', name: '   ' }),
    /User name must not be empty/,
  )
})

test('game session creation requires a non-empty userId', () => {
  const game = createPentixGame({
    id: 'game-1',
    selectPieceId: createSelector([3, 14]),
  })

  assert.throws(
    () =>
      createPentixGameSession({
        id: 'session-1',
        userId: '   ',
        game,
      }),
    /userId must not be empty/,
  )
})

test('movement shifts the active piece and respects walls', () => {
  const game = createPentixGame({
    id: 'game-1',
    selectPieceId: createSelector([3, 14]),
  })
  const session = createPentixGameSession({
    id: 'session-1',
    userId: 'user-1',
    game,
  })

  const movedRight = gameSessionEngine.move(session, 'right')
  assert.equal(movedRight.activePiece.origin.column, 7)
  assert.equal(movedRight.activePiece.origin.row, 1)

  const movedLeft = gameSessionEngine.move(session, 'left')
  assert.equal(movedLeft.activePiece.origin.column, 5)

  let atWall = session
  for (let i = 0; i < 10; i++) {
    atWall = gameSessionEngine.move(atWall, 'left')
  }
  assert.equal(atWall.activePiece.origin.column, 0)
  assert.equal(gameSessionEngine.move(atWall, 'left'), atWall)
})

test('rotation advances the angle in open space', () => {
  const game = createPentixGame({
    id: 'game-1',
    selectPieceId: createSelector([3, 14]),
  })
  const session = createPentixGameSession({
    id: 'session-1',
    userId: 'user-1',
    game,
  })

  const clockwise = gameSessionEngine.rotate(session, 'clockwise')
  assert.equal(clockwise.activePiece.angle, 270)
  assert.deepEqual(clockwise.activePiece.origin, { row: 1, column: 6 })
  assert.equal(clockwise.board, session.board)
})

test('a tick moves the active piece down one row', () => {
  const game = createPentixGame({
    id: 'game-1',
    selectPieceId: createSelector([3, 14]),
  })
  const session = createPentixGameSession({
    id: 'session-1',
    userId: 'user-1',
    game,
  })

  const ticked = gameSessionEngine.tick(session, game)
  assert.equal(ticked.session.activePiece.origin.row, 2)
  assert.equal(
    ticked.session.board.rows.flat().some((cell) => cell.isOccupied),
    false,
  )
})

test('a drop scores and moves to the bottom without locking', () => {
  const game = createPentixGame({
    id: 'game-1',
    selectPieceId: createSelector([3, 14, 6]),
  })
  const session = createPentixGameSession({
    id: 'session-1',
    userId: 'user-1',
    game,
  })

  const dropped = gameSessionEngine.drop(session, game)
  assert.equal(dropped.session.status, 'active')
  assert.equal(dropped.session.activePiece.origin.row, 21)
  assert.equal(
    dropped.session.board.rows.flat().some((cell) => cell.isOccupied),
    false,
  )
  assert.equal(dropped.session.statistics.score, 6)
})

test('a tick after a drop locks, scores, and spawns the next piece', () => {
  const game = createPentixGame({
    id: 'game-1',
    selectPieceId: createSelector([3, 14, 6]),
  })
  const session = createPentixGameSession({
    id: 'session-1',
    userId: 'user-1',
    game,
  })

  const dropped = gameSessionEngine.drop(session, game)
  const settled = gameSessionEngine.tick(dropped.session, dropped.game, () => 6)

  assert.equal(settled.session.status, 'active')
  assert.equal(settled.session.statistics.score, 9)
  assert.equal(settled.session.statistics.blocks, 1)
  assert.equal(settled.session.statistics.clearedLines, 0)
  assert.equal(settled.session.activePiece.key, '5T')
  assert.deepEqual(settled.session.activePiece.origin, { row: 1, column: 6 })
  assert.equal(settled.session.nextPieceKey, '4T')
  assert.equal(settled.session.nextPieceIndex, 2)
  assert.equal(
    settled.session.board.rows.flat().filter((cell) => cell.isOccupied).length,
    3,
  )
})

test('settling clears a full line and awards line and empty-field bonuses', () => {
  const game = createPentixGame({
    id: 'game-1',
    selectPieceId: createSelector([3, 14, 6]),
  })
  const board = new Board(12, 22)
  for (let column = 0; column < 12; column++) {
    if (column !== 6) {
      board.setCell(21, column, '4Square')
    }
  }
  const session = Object.freeze({
    id: 'session-1',
    userId: 'user-1',
    gameId: game.id,
    status: 'active',
    board: createBoardSnapshot(board),
    statistics: Object.freeze({ score: 0, level: 1, clearedLines: 0, blocks: 0 }),
    activePiece: Object.freeze({
      key: '1Line',
      angle: 0,
      origin: Object.freeze({ row: 21, column: 6 }),
    }),
    nextPieceKey: '5T',
    nextPieceIndex: 1,
  })

  const settled = gameSessionEngine.tick(session, game, () => 6)

  assert.equal(settled.session.status, 'active')
  assert.equal(settled.session.statistics.score, 1012)
  assert.equal(settled.session.statistics.clearedLines, 1)
  assert.equal(settled.session.statistics.blocks, 1)
  assert.equal(
    settled.session.board.rows.flat().every((cell) => !cell.isOccupied),
    true,
  )
})

test('a blocked spawn sets game-over', () => {
  const game = createPentixGame({
    id: 'game-1',
    selectPieceId: createSelector([3, 14, 6]),
  })
  const board = new Board(12, 22)
  for (let column = 4; column <= 8; column++) {
    board.setCell(1, column, '4Square')
  }
  const session = Object.freeze({
    id: 'session-1',
    userId: 'user-1',
    gameId: game.id,
    status: 'active',
    board: createBoardSnapshot(board),
    statistics: Object.freeze({ score: 0, level: 1, clearedLines: 0, blocks: 0 }),
    activePiece: Object.freeze({
      key: '1Line',
      angle: 0,
      origin: Object.freeze({ row: 21, column: 6 }),
    }),
    nextPieceKey: '5T',
    nextPieceIndex: 1,
  })

  const settled = gameSessionEngine.tick(session, game, () => 6)

  assert.equal(settled.session.status, 'game-over')
  assert.equal(settled.session.statistics.blocks, 1)
  assert.equal(settled.session.activePiece.key, '5T')
})

test('a piece cannot move into a buried cell', () => {
  const board = new Board(12, 22)
  board.setCell(1, 6, '4Square')
  const game = createPentixGame({
    id: 'game-1',
    selectPieceId: createSelector([1, 3]),
  })
  const session = Object.freeze({
    id: 'session-1',
    userId: 'user-1',
    gameId: game.id,
    status: 'active',
    board: createBoardSnapshot(board),
    statistics: Object.freeze({ score: 0, level: 1, clearedLines: 0, blocks: 0 }),
    activePiece: Object.freeze({
      key: '2Line',
      angle: 0,
      origin: Object.freeze({ row: 1, column: 5 }),
    }),
    nextPieceKey: '3Corner',
    nextPieceIndex: 1,
  })

  assert.equal(gameSessionEngine.move(session, 'right'), session)
})

test('rotation kicks away from the right wall', () => {
  const board = new Board(12, 22)
  const game = createPentixGame({
    id: 'game-1',
    selectPieceId: createSelector([1, 3]),
  })
  const session = Object.freeze({
    id: 'session-1',
    userId: 'user-1',
    gameId: game.id,
    status: 'active',
    board: createBoardSnapshot(board),
    statistics: Object.freeze({ score: 0, level: 1, clearedLines: 0, blocks: 0 }),
    activePiece: Object.freeze({
      key: '2Line',
      angle: 0,
      origin: Object.freeze({ row: 1, column: 11 }),
    }),
    nextPieceKey: '3Corner',
    nextPieceIndex: 1,
  })

  const rotated = gameSessionEngine.rotate(session, 'clockwise')
  assert.equal(rotated.activePiece.angle, 90)
  assert.equal(rotated.activePiece.origin.column, 10)
})

test('a blocked rotation leaves the session unchanged', () => {
  const board = new Board(12, 22)
  board.setCell(1, 6, '4Square')
  const game = createPentixGame({
    id: 'game-1',
    selectPieceId: createSelector([1, 3]),
  })
  const session = Object.freeze({
    id: 'session-1',
    userId: 'user-1',
    gameId: game.id,
    status: 'active',
    board: createBoardSnapshot(board),
    statistics: Object.freeze({ score: 0, level: 1, clearedLines: 0, blocks: 0 }),
    activePiece: Object.freeze({
      key: '2Line',
      angle: 0,
      origin: Object.freeze({ row: 1, column: 5 }),
    }),
    nextPieceKey: '3Corner',
    nextPieceIndex: 1,
  })

  assert.equal(gameSessionEngine.rotate(session, 'clockwise'), session)
})

test('level advances after thirty locked pieces', () => {
  const game = createPentixGame({
    id: 'game-1',
    selectPieceId: createSelector([3, 14, 6]),
  })
  const board = new Board(12, 22)
  const session = Object.freeze({
    id: 'session-1',
    userId: 'user-1',
    gameId: game.id,
    status: 'active',
    board: createBoardSnapshot(board),
    statistics: Object.freeze({ score: 0, level: 1, clearedLines: 0, blocks: 29 }),
    activePiece: Object.freeze({
      key: '1Line',
      angle: 0,
      origin: Object.freeze({ row: 21, column: 5 }),
    }),
    nextPieceKey: '5T',
    nextPieceIndex: 1,
  })

  const settled = gameSessionEngine.tick(session, game, () => 6)
  assert.equal(settled.session.statistics.blocks, 30)
  assert.equal(settled.session.statistics.level, 2)
})

test('finished sessions ignore gameplay commands', () => {
  const game = createPentixGame({
    id: 'game-1',
    selectPieceId: createSelector([3, 14]),
  })
  const board = new Board(12, 22)
  const session = Object.freeze({
    id: 'session-1',
    userId: 'user-1',
    gameId: game.id,
    status: 'game-over',
    board: createBoardSnapshot(board),
    statistics: Object.freeze({ score: 0, level: 1, clearedLines: 0, blocks: 0 }),
    activePiece: Object.freeze({
      key: '3Corner',
      angle: 0,
      origin: Object.freeze({ row: 1, column: 6 }),
    }),
    nextPieceKey: '5T',
    nextPieceIndex: 1,
  })

  assert.equal(gameSessionEngine.move(session, 'left'), session)
  assert.equal(gameSessionEngine.rotate(session, 'clockwise'), session)
  assert.equal(gameSessionEngine.tick(session, game).session, session)
  assert.equal(gameSessionEngine.drop(session, game).session, session)
})

test('createPentixGame exposes the full catalog as its available piece set', () => {
  const game = createPentixGame({
    id: 'game-1',
    selectPieceId: createSelector([3, 14]),
  })

  assert.deepEqual(
    [...game.availablePieceIds],
    PIECE_CATALOG.map((piece) => piece.id),
  )
})

test('createTetrisGame exposes the four-mino set and Tetris board size', () => {
  const game = createTetrisGame({
    id: 'game-tetris',
    selectPieceId: createSelector([4, 5]),
  })
  const tetrominoIds = PIECE_CATALOG.filter(
    (piece) => piece.offsets.length === 4,
  ).map((piece) => piece.id)

  assert.deepEqual([...game.availablePieceIds], tetrominoIds)
  assert.deepEqual([game.board.width, game.board.height], [10, 20])
  assert.equal(game.pieceIds.length, 2)
  assert.ok(
    game.pieceIds.every((pieceId) => tetrominoIds.includes(pieceId)),
  )
})

test('a preset sequence is drawn only from its available piece set', () => {
  const game = createTetrisGame({ id: 'game-tetris' })
  const extended = ensurePentixGamePieceAtIndex(game, 40)

  assert.ok(extended.pieceIds.length >= 41)
  assert.ok(
    extended.pieceIds.every((pieceId) =>
      extended.availablePieceIds.includes(pieceId),
    ),
  )
})

test('the arbitrary game builder is not part of the public API', async () => {
  const publicApi = await import('../packages/pentix-core/dist/index.js')

  assert.equal('createPentixGameWithPieces' in publicApi, false)
  assert.equal(typeof publicApi.createTetrisGame, 'function')
})
test('replay reconstructs moves and rotations like live play', () => {
  const game = createPentixGame({
    id: 'game-1',
    selectPieceId: createSelector([3, 14]),
  })
  let live = createPentixGameSession({ id: 'session-1', userId: 'user-1', game })
  live = gameSessionEngine.move(live, 'right')
  live = gameSessionEngine.move(live, 'right')
  live = gameSessionEngine.rotate(live, 'clockwise')

  const log = {
    sessionId: 'session-1',
    userId: 'user-1',
    gameId: 'game-1',
    pieces: [{ pieceId: 3, actions: 'RRC' }],
  }

  assert.deepEqual(replayPentixGameSession(log, game), live)

  let anticlockwise = createPentixGameSession({
    id: 'session-2',
    userId: 'user-1',
    game,
  })
  anticlockwise = gameSessionEngine.move(anticlockwise, 'left')
  anticlockwise = gameSessionEngine.rotate(anticlockwise, 'counterclockwise')

  const anticlockwiseLog = {
    sessionId: 'session-2',
    userId: 'user-1',
    gameId: 'game-1',
    pieces: [{ pieceId: 3, actions: 'LA' }],
  }

  assert.deepEqual(replayPentixGameSession(anticlockwiseLog, game), anticlockwise)
})

test('replay folds a gravity tick like live play', () => {
  const game = createPentixGame({
    id: 'game-1',
    selectPieceId: createSelector([3, 14]),
  })
  const live = createPentixGameSession({ id: 'session-1', userId: 'user-1', game })
  const ticked = gameSessionEngine.tick(live, game)

  const log = {
    sessionId: 'session-1',
    userId: 'user-1',
    gameId: 'game-1',
    pieces: [{ pieceId: 3, actions: 'T' }],
  }

  assert.deepEqual(replayPentixGameSession(log, game), ticked.session)
})

test('replay folds a hard drop like live play', () => {
  const game = createPentixGame({
    id: 'game-1',
    selectPieceId: createSelector([3, 14]),
  })
  const live = createPentixGameSession({ id: 'session-1', userId: 'user-1', game })
  const dropped = gameSessionEngine.drop(live, game)

  const log = {
    sessionId: 'session-1',
    userId: 'user-1',
    gameId: 'game-1',
    pieces: [{ pieceId: 3, actions: 'H' }],
  }

  assert.deepEqual(replayPentixGameSession(log, game), dropped.session)
})
test('a hard drop with no space below settles immediately without drop score', () => {
  const game = createPentixGame({
    id: 'game-1',
    selectPieceId: createSelector([5, 6]),
  })
  const board = new Board(12, 22)
  const session = Object.freeze({
    id: 'session-1',
    userId: 'user-1',
    gameId: game.id,
    status: 'active',
    board: createBoardSnapshot(board),
    statistics: Object.freeze({ score: 0, level: 2, clearedLines: 0, blocks: 0 }),
    activePiece: Object.freeze({
      key: '4Square',
      angle: 0,
      origin: Object.freeze({ row: 20, column: 5 }),
    }),
    nextPieceKey: '4T',
    nextPieceIndex: 1,
  })

  const result = gameSessionEngine.drop(session, game)

  // The piece is already resting on the bottom, so the drop locks it instead
  // of awarding fall-distance score for no movement.
  assert.equal(result.session.statistics.blocks, 1)
  assert.equal(result.session.activePiece.key, '4T')
  assert.equal(result.session.statistics.score, 8)
})

test('a hard drop with space below still awards fall-distance score', () => {
  const game = createPentixGame({
    id: 'game-1',
    selectPieceId: createSelector([5, 6]),
  })
  const live = createPentixGameSession({ id: 'session-1', userId: 'user-1', game })

  const result = gameSessionEngine.drop(live, game)

  assert.equal(result.session.statistics.blocks, 0)
  assert.ok(result.session.statistics.score > 0)
  assert.equal(result.session.status, 'active')
})

test('demo planner randomly picks among equally best destinations', () => {
  const game = createPentixGame({ id: 'game-1', selectPieceId: () => 0 })
  const session = createPentixGameSession({
    id: 'session-1',
    userId: 'user-1',
    game,
  })

  const destination = planDemoDestination(session)

  // `1Line` can drop anywhere on an empty board. Only the two corner columns
  // reach two contacts (floor + side wall); they tie on every criterion, so the
  // planner picks one of them at random.
  assert.equal(destination.angle, 0)
  assert.ok(destination.column === 0 || destination.column === 11)
})

test('demo planner completes a line when one placement would clear it', () => {
  const board = new Board(3, 3)
  board.setCell(2, 0, '4Square')
  board.setCell(2, 1, '4Square')

  const session = {
    board: createBoardSnapshot(board),
    activePiece: { key: '1Line', angle: 0, origin: { row: 1, column: 1 } },
  }

  const destination = planDemoDestination(session)

  // Dropping into column 2 fills the bottom row; the `fullLines²` term makes
  // that placement beat the shallower columns 0 and 1.
  assert.deepEqual(destination, { angle: 0, column: 2 })
})

test('demo planner returns null when the active piece cannot be placed', () => {
  const board = new Board(3, 3)
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      board.setCell(row, column, '4Square')
    }
  }

  const session = {
    board: createBoardSnapshot(board),
    activePiece: { key: '1Line', angle: 0, origin: { row: 1, column: 1 } },
  }

  assert.equal(planDemoDestination(session), null)
})

test('demo planner prefers the equal-scoring placement with more contacts', () => {
  const board = new Board(4, 3)
  board.setCell(0, 0, '4Square')
  board.setCell(0, 3, '4Square')
  board.setCell(1, 0, '4Square')
  board.setCell(2, 0, '4Square')
  board.setCell(2, 1, '4Square')
  board.setCell(2, 2, '4Square')
  board.setCell(2, 3, '4Square')

  const session = {
    board: createBoardSnapshot(board),
    activePiece: { key: '1Line', angle: 0, origin: { row: 0, column: 1 } },
  }

  const destination = planDemoDestination(session)

  // Columns 1 and 2 both drop onto the full bottom row at the same depth and
  // score. Column 1 lands beside the settled mino at (1,0) for two contacts,
  // while a drop in column 2 can side-step right on the last tick into the
  // column-3 pocket, touching the floor, the side wall, and the mino at (0,3)
  // for three contacts — so the planner steers to column 2.
  assert.deepEqual(destination, { angle: 0, column: 2 })
})

test('demo planner counts contacts per mino and prefers settled-mino contacts', () => {
  const board = new Board(5, 3)
  board.setCell(1, 0, '4Square')
  board.setCell(2, 0, '4Square')
  board.setCell(1, 4, '4Square')

  const session = {
    board: createBoardSnapshot(board),
    activePiece: { key: '4Square', angle: 0, origin: { row: 1, column: 1 } },
  }

  const destination = planDemoDestination(session)

  // Columns 1 and 2 settle at the same depth with no score difference. The
  // column-1 2x2 block rests against the two settled minos on its left while
  // the column-2 block touches only one, so the planner prefers column 1.
  assert.deepEqual(destination, { angle: 0, column: 1 })
})

test('demo planner prefers non-wall placements when contacts tie', () => {
  const board = new Board(6, 3)
  for (let column = 0; column < 6; column += 1) {
    board.setCell(2, column, '4Square')
  }
  board.setCell(1, 3, '4Square')

  const session = {
    board: createBoardSnapshot(board),
    activePiece: { key: '1Line', angle: 0, origin: { row: 1, column: 2 } },
  }

  const destination = planDemoDestination(session)

  // Every column settles on the full bottom row for the same score. Columns 2
  // and 4 touch the extra settled mino at (1,3) for two contacts, matching the
  // wall columns 0 and 5. Because the contacts tie, the planner avoids the
  // wall-touching placements and picks one of columns 2 or 4 at random.
  assert.equal(destination.angle, 0)
  assert.ok(destination.column === 2 || destination.column === 4)
})

// --- Demo last-tick move -----------------------------------------------------

/** A session-like fixture: a fresh board plus the piece at a given placement. */
function demoSession({ width, height, filled = [], key, angle = 0, row, column }) {
  const board = new Board(width, height)
  for (const [filledRow, filledColumn] of filled) {
    board.setCell(filledRow, filledColumn, '4Square')
  }

  return {
    board: createBoardSnapshot(board),
    activePiece: { key, angle, origin: { row, column } },
  }
}

test('the demo descent check reports whether the active piece can move down', () => {
  const falling = demoSession({
    width: 3,
    height: 3,
    key: '1Line',
    row: 0,
    column: 1,
  })
  assert.equal(canDemoPieceMoveDown(falling), true)

  const onFloor = demoSession({
    width: 3,
    height: 3,
    key: '1Line',
    row: 2,
    column: 1,
  })
  assert.equal(canDemoPieceMoveDown(onFloor), false)

  const onStack = demoSession({
    width: 3,
    height: 3,
    filled: [[2, 1]],
    key: '1Line',
    row: 1,
    column: 1,
  })
  assert.equal(canDemoPieceMoveDown(onStack), false)
})

test('the last-tick planner stays idle while the piece can still fall', () => {
  const session = demoSession({
    width: 3,
    height: 3,
    key: '1Line',
    row: 0,
    column: 1,
  })

  assert.equal(planDemoLastTickMove(session), null)
})

test('the last-tick planner slides a resting piece onto a deeper ledge', () => {
  const session = demoSession({
    width: 3,
    height: 4,
    filled: [
      [2, 0],
      [3, 0],
    ],
    key: '1Line',
    row: 1,
    column: 0,
  })

  // Column 0 is stacked two rows high, so the piece rests at row 1. Stepping
  // right lets it fall to the floor in column 1, which scores strictly better.
  assert.equal(canDemoPieceMoveDown(session), false)
  assert.deepEqual(planDemoLastTickMove(session), {
    angle: 0,
    column: 1,
  })
})

test('the last-tick planner takes the side-step that keeps the piece falling', () => {
  const session = demoSession({
    width: 3,
    height: 4,
    filled: [
      [2, 0],
      [3, 0],
    ],
    key: '1Line',
    row: 1,
    column: 0,
  })

  // Column 0 is stacked two rows high, so the piece rests at row 1. Stepping
  // right lets it fall to the floor in column 1, so that side-step is scored at
  // the deeper landing and wins.
  assert.equal(canDemoPieceMoveDown(session), false)
  assert.deepEqual(planDemoLastTickMove(session), { angle: 0, column: 1 })
})

test('the last-tick planner side-steps under a settled mino even without falling', () => {
  const session = demoSession({
    width: 12,
    height: 22,
    filled: [[20, 11]],
    key: '1Line',
    row: 21,
    column: 10,
  })

  // The piece rests on the floor beside a mino one row above the right wall.
  // Stepping right parks it on the floor again (it cannot fall), but the corner
  // placement touches the floor, the side wall, and the settled mino, so it is
  // the better position.
  assert.equal(canDemoPieceMoveDown(session), false)
  assert.deepEqual(planDemoLastTickMove(session), { angle: 0, column: 11 })

  const parked = {
    ...session,
    activePiece: { ...session.activePiece, origin: { row: 21, column: 11 } },
  }
  assert.equal(canDemoPieceMoveDown(parked), false)
})

test('the last-tick planner keeps a placement that no side-step improves', () => {
  const session = demoSession({
    width: 3,
    height: 4,
    filled: [0, 1, 2].map((column) => [3, column]),
    key: '1Line',
    row: 2,
    column: 0,
  })

  // The piece already sits in the floor corner; stepping right drops the wall
  // contact, so there is nothing better to move to.
  assert.equal(planDemoLastTickMove(session), null)
})

test('the last-tick planner ignores a resting piece with no legal side-step', () => {
  const session = demoSession({
    width: 3,
    height: 5,
    filled: [0, 2].flatMap((column) =>
      [0, 1, 2, 3, 4].map((row) => [row, column]),
    ),
    key: '1Line',
    row: 4,
    column: 1,
  })

  // The piece sits in a one-wide well: both side walls are solid.
  assert.equal(planDemoLastTickMove(session), null)
})

test('the last-tick planner ignores a side-step that scores worse', () => {
  const session = demoSession({
    width: 4,
    height: 5,
    filled: [[4, 3]],
    key: '4Line',
    angle: 90,
    row: 2,
    column: 2,
  })

  // The vertical bar rests on the floor of column 2. Stepping right is legal once
  // it lands across the ledge, but that covers three holes, so staying scores
  // better.
  assert.equal(canDemoPieceMoveDown(session), false)
  assert.equal(planDemoLastTickMove(session), null)
})

test('the destination planner steers to the column the side-step starts from', () => {
  const board = new Board(12, 22)
  board.setCell(20, 11, '4Square')
  const session = {
    board: createBoardSnapshot(board),
    activePiece: { key: '1Line', angle: 0, origin: { row: 1, column: 6 } },
  }

  // The best placement is on the floor under the settled mino, which is only
  // reachable by dropping in the column beside it and side-stepping right on the
  // last tick — so the destination is that neighbour column, not the far corner.
  assert.deepEqual(planDemoDestination(session), { angle: 0, column: 10 })
})

test('the destination planner prefers the placement that needs no side-step', () => {
  const session = demoSession({
    width: 3,
    height: 2,
    key: '1Line',
    row: 0,
    column: 1,
  })

  const destination = planDemoDestination(session)

  // Both floor corners score identically with or without a side-step, so the
  // planner must never pick the middle column (which would only reach a corner
  // by side-stepping) — it steers straight at a corner instead.
  assert.equal(destination.angle, 0)
  assert.ok(destination.column === 0 || destination.column === 2)
})

test('a taken side-step ends the last-tick loop', () => {
  const session = demoSession({
    width: 12,
    height: 22,
    filled: [[20, 11]],
    key: '1Line',
    row: 21,
    column: 10,
  })

  assert.deepEqual(planDemoLastTickMove(session), { angle: 0, column: 11 })

  // After the side-step the piece is in the better placement and cannot be
  // improved again, so the repeat-on-every-last-tick loop ends there.
  const stepped = {
    ...session,
    activePiece: { ...session.activePiece, origin: { row: 21, column: 11 } },
  }
  assert.equal(planDemoLastTickMove(stepped), null)
})

