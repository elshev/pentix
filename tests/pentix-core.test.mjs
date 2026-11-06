import assert from 'node:assert/strict'
import test from 'node:test'

import {
  advancePentixGameSession,
  createBoardSnapshot,
  createPentixGame,
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
