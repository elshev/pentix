import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
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
  planDemoDestinationForOrientations,
  planDemoLastTickMove,
  DEFAULT_DEMO_ENGINE_ID,
  DEMO_ACTION_CODES,
  SESSION_ACTIONS,
  DemoEngineRegistry,
  actionsToward,
  adaptAuthoredPlan,
  builtInDemoEngines,
  createDemoEngineInput,
  demoCanPlaceAt,
  demoEngineRegistry,
  demoLandingRow,
  demoPieceCells,
  delphi5DemoEngine,
  getDemoEngine,
  isDemoAction,
  randomDemoEngine,
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

const expectedDemoEngineIds = [
  'delphi5',
  'random',
  'claude-opus-5-5-extra',
  'claude-sonnet-5-5-extra',
  'deepseek-v4-flash-1107-max',
  'deepseek-v4-pro-max',
  'glm-5-3-flash-extra',
  'minimax-m3-1-flash-extra',
  'qwen-4-max',
]

function offsetsToPairs(offsets) {
  return offsets.map(({ x, y }) => [x, y])
}

function createSelector(pieceIds) {
  let selectionIndex = 0
  return () => pieceIds[selectionIndex++]
}

/** Zeroed per-piece counts keyed by every catalog piece. */
const zeroPieceCounts = Object.freeze(
  Object.fromEntries(PIECE_CATALOG.map((piece) => [piece.key, 0])),
)

/** A complete statistics snapshot for hand-built sessions. */
function statisticsFixture(overrides = {}) {
  return Object.freeze({
    score: 0,
    level: 1,
    clearedLines: 0,
    blocks: 0,
    actions: Object.freeze({ moves: 0, rotates: 0, drops: 0 }),
    pieceCounts: zeroPieceCounts,
    ...overrides,
  })
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
  assert.deepEqual(session.statistics, statisticsFixture())
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
  assert.deepEqual(session.statistics, statisticsFixture())

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
    statistics: statisticsFixture(),
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
    statistics: statisticsFixture(),
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
    statistics: statisticsFixture(),
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
    statistics: statisticsFixture(),
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
    statistics: statisticsFixture(),
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

test('successful moves, rotations, and drops are counted as actions', () => {
  const game = createPentixGame({
    id: 'game-1',
    selectPieceId: createSelector([3, 14, 6]),
  })
  let session = createPentixGameSession({
    id: 'session-1',
    userId: 'user-1',
    game,
  })
  assert.deepEqual(session.statistics.actions, {
    moves: 0,
    rotates: 0,
    drops: 0,
  })

  session = gameSessionEngine.move(session, 'left')
  session = gameSessionEngine.move(session, 'right')
  assert.deepEqual(session.statistics.actions, {
    moves: 2,
    rotates: 0,
    drops: 0,
  })

  session = gameSessionEngine.rotate(session, 'clockwise')
  assert.equal(session.statistics.actions.rotates, 1)

  session = gameSessionEngine.drop(session, game).session
  assert.equal(session.statistics.actions.drops, 1)
})

test('blocked moves and rotations are not counted as actions', () => {
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
    statistics: statisticsFixture(),
    activePiece: Object.freeze({
      key: '2Line',
      angle: 0,
      origin: Object.freeze({ row: 1, column: 5 }),
    }),
    nextPieceKey: '3Corner',
    nextPieceIndex: 1,
  })

  assert.equal(gameSessionEngine.move(session, 'right'), session)
  assert.equal(gameSessionEngine.rotate(session, 'clockwise'), session)
  assert.equal(session.statistics.actions.moves, 0)
  assert.equal(session.statistics.actions.rotates, 0)
})

test('gravity ticks do not count as actions', () => {
  const game = createPentixGame({
    id: 'game-1',
    selectPieceId: createSelector([3, 14, 6]),
  })
  const session = createPentixGameSession({
    id: 'session-1',
    userId: 'user-1',
    game,
  })

  const ticked = gameSessionEngine.tick(session, game).session

  assert.equal(ticked.activePiece.origin.row, 2)
  assert.deepEqual(ticked.statistics.actions, {
    moves: 0,
    rotates: 0,
    drops: 0,
  })
})

test('a fresh session starts with zeroed action and per-piece statistics', () => {
  const game = createPentixGame({
    id: 'game-1',
    selectPieceId: createSelector([3, 14, 6]),
  })
  const session = createPentixGameSession({
    id: 'session-1',
    userId: 'user-1',
    game,
  })

  assert.deepEqual(session.statistics.actions, {
    moves: 0,
    rotates: 0,
    drops: 0,
  })
  assert.deepEqual(
    Object.keys(session.statistics.pieceCounts).sort(),
    PIECE_CATALOG.map((piece) => piece.key).sort(),
  )
  for (const piece of PIECE_CATALOG) {
    assert.equal(session.statistics.pieceCounts[piece.key], 0)
  }
})

test('a settle increments only the locked piece count', () => {
  const game = createPentixGame({
    id: 'game-1',
    selectPieceId: createSelector([0, 1, 3]),
  })
  const session = createPentixGameSession({
    id: 'session-1',
    userId: 'user-1',
    game,
  })
  const lockedKey = session.activePiece.key

  const dropped = gameSessionEngine.drop(session, game)
  assert.equal(dropped.session.statistics.pieceCounts[lockedKey], 0)

  const settled = gameSessionEngine.tick(dropped.session, dropped.game).session
  assert.equal(settled.statistics.blocks, 1)
  assert.equal(settled.statistics.pieceCounts[lockedKey], 1)
  for (const piece of PIECE_CATALOG) {
    if (piece.key !== lockedKey) {
      assert.equal(settled.statistics.pieceCounts[piece.key], 0)
    }
  }
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
    statistics: statisticsFixture({ blocks: 29 }),
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
    statistics: statisticsFixture(),
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

test('replay reproduces the recorded action and per-piece statistics', () => {
  const game = createPentixGame({
    id: 'game-1',
    selectPieceId: createSelector([3, 14, 6]),
  })
  let live = createPentixGameSession({
    id: 'session-1',
    userId: 'user-1',
    game,
  })
  live = gameSessionEngine.move(live, 'right')
  live = gameSessionEngine.rotate(live, 'clockwise')
  live = gameSessionEngine.drop(live, game).session
  live = gameSessionEngine.tick(live, game).session

  const log = {
    sessionId: 'session-1',
    userId: 'user-1',
    gameId: 'game-1',
    pieces: [{ pieceId: 3, actions: 'RCHT' }],
  }
  const replayed = replayPentixGameSession(log, game)

  assert.deepEqual(replayed.statistics.actions, live.statistics.actions)
  assert.deepEqual(replayed.statistics.pieceCounts, live.statistics.pieceCounts)
  assert.deepEqual(live.statistics.actions, {
    moves: 1,
    rotates: 1,
    drops: 1,
  })
  assert.equal(live.statistics.pieceCounts['3Corner'], 1)
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
    statistics: statisticsFixture({ level: 2 }),
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
  assert.equal(result.session.statistics.actions.drops, 1)
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
  // that placement beat the shallower columns 0 and 1. The row completes either
  // way, so the planner prefers the straight drop over the side-step into it.
  assert.deepEqual(destination, {
    angle: 0,
    column: 2,
    lastTickMove: null,
  })
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
  // for three contacts — so the planner steers to column 2 and side-steps right
  // after its hard drop.
  assert.deepEqual(destination, {
    angle: 0,
    column: 2,
    lastTickMove: 'R',
  })
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
  // the column-2 block touches only one, so the planner prefers column 1 with no
  // side-step.
  assert.deepEqual(destination, {
    angle: 0,
    column: 1,
    lastTickMove: null,
  })
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
    lastTickMove: null,
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
  assert.deepEqual(planDemoLastTickMove(session), {
    angle: 0,
    column: 1,
    lastTickMove: null,
  })
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
  assert.deepEqual(planDemoLastTickMove(session), {
    angle: 0,
    column: 11,
    lastTickMove: null,
  })

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
  // last tick — so the destination is that neighbour column, not the far corner,
  // and it reports the side-step for the log to append after its drop.
  assert.deepEqual(planDemoDestination(session), {
    angle: 0,
    column: 10,
    lastTickMove: 'R',
  })
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

  assert.deepEqual(planDemoLastTickMove(session), {
    angle: 0,
    column: 11,
    lastTickMove: null,
  })

  // After the side-step the piece is in the better placement and cannot be
  // improved again, so the repeat-on-every-last-tick loop ends there.
  const stepped = {
    ...session,
    activePiece: { ...session.activePiece, origin: { row: 21, column: 11 } },
  }
  assert.equal(planDemoLastTickMove(stepped), null)
})

/** Runs `fn` with `Math.random` pinned to `value`, restoring it afterwards. */
function withFixedRandom(value, fn) {
  const original = Math.random
  Math.random = () => value
  try {
    return fn()
  } finally {
    Math.random = original
  }
}

/** A minimal demo-engine input built from a demo fixture. */
function demoInput({
  width,
  height,
  filled = [],
  key,
  angle = 0,
  row = 1,
  column = 0,
}) {
  const board = Array.from({ length: height }, () => Array(width).fill(0))
  for (const [filledRow, filledColumn] of filled) {
    board[filledRow][filledColumn] = 1
  }

  const definition = PIECES_BY_KEY[key]
  const turns =
    definition.rotationMode === 'none'
      ? 0
      : definition.rotationMode === 'half'
        ? 1
        : 3

  const orientations = []
  const seen = new Set()
  let currentAngle = angle

  for (let turn = 0; turn <= turns; turn += 1) {
    const cells = getOccupiedOffsets(
      definition.offsets,
      currentAngle,
      definition.rotationMode,
    ).map((offset) => ({ row: offset.y, column: offset.x }))
    const signature = cells
      .map((cell) => `${cell.row},${cell.column}`)
      .sort()
      .join(';')
    if (!seen.has(signature)) {
      seen.add(signature)
      orientations.push(cells)
    }
    // The game rotates clockwise by -90 and normalizes for the piece mode.
    currentAngle = normalizeAngle(currentAngle - 90, definition.rotationMode)
  }

  return { board, piece: orientations, position: { row, column } }
}

/** Calls an engine with the three minimal inputs. */
function planWith(engine, input) {
  return engine.plan(input.board, input.piece, input.position)
}

/** True when every character of `log` is a demo action code. */
function actionAlphabetOnly(log) {
  return [...log].every((code) => isDemoAction(code))
}

test('the demo action alphabet excludes ticks', () => {
  assert.deepEqual(Object.values(DEMO_ACTION_CODES).sort(), [
    'A',
    'C',
    'H',
    'L',
    'R',
  ])
  for (const code of ['L', 'R', 'C', 'A', 'H']) {
    assert.equal(isDemoAction(code), true)
  }
  for (const code of ['T', 'X', '', 'l']) {
    assert.equal(isDemoAction(code), false)
  }
})

test('the demo alphabet is the session alphabet minus ticks', () => {
  const sessionCodes = new Set(Object.values(SESSION_ACTIONS))
  const demoCodes = Object.values(DEMO_ACTION_CODES)

  assert.equal(demoCodes.length, sessionCodes.size - 1)
  for (const code of demoCodes) {
    assert.equal(sessionCodes.has(code), true)
  }
  assert.equal(demoCodes.includes(SESSION_ACTIONS.tick), false)
  assert.equal(isDemoAction(SESSION_ACTIONS.tick), false)
})

test('the engine input orientation order matches repeated clockwise rotations', () => {
  const sortCells = (list) =>
    [...list]
      .map((cell) => `${cell.row},${cell.column}`)
      .sort()
      .join(';')

  for (const piece of PIECE_CATALOG) {
    const game = createPentixGame({
      id: `game-orient-${piece.id}`,
      selectPieceId: () => piece.id,
    })
    let session = createPentixGameSession({
      id: `session-orient-${piece.id}`,
      userId: 'user-orient',
      game,
    })
    const input = createDemoEngineInput(session)

    for (let index = 0; index < input.piece.length; index += 1) {
      const current = getOccupiedOffsets(
        piece.offsets,
        session.activePiece.angle,
        piece.rotationMode,
      ).map((offset) => ({ row: offset.y, column: offset.x }))

      assert.equal(
        sortCells(input.piece[index]),
        sortCells(current),
        `${piece.key} orientation ${index}`,
      )

      session = gameSessionEngine.rotate(session, 'clockwise')
    }
  }
})

test('demoLandingRow finds the resting row of a dropped piece', () => {
  const input = demoInput({ width: 3, height: 3, key: '1Line', column: 1 })
  assert.equal(demoLandingRow(input.board, input.piece[0], 1), 2)

  const sealed = demoInput({
    width: 3,
    height: 3,
    filled: [[0, 1]],
    key: '1Line',
    column: 1,
  })
  assert.equal(demoLandingRow(sealed.board, sealed.piece[0], 1), null)
})

test('actionsToward turns, moves, and hard-drops', () => {
  const position = { row: 1, column: 5 }

  assert.equal(actionsToward(2, position, 2), 'CCLLLH')
  assert.equal(actionsToward(0, position, 7), 'RRH')
  assert.equal(actionsToward(1, position, 5), 'CH')
})

test('the authored-plan adapter copies its inputs before planning', () => {
  const board = [
    [0, 0],
    [0, 0],
  ]
  const piece = [
    [{ row: 0, column: 0 }],
  ]
  const position = { row: 0, column: 0 }
  const plan = adaptAuthoredPlan((mutableBoard, mutablePiece, mutablePosition) => {
    mutableBoard[0][0] = 1
    mutablePiece[0][0].row = 5
    mutablePosition.row = 5
    mutablePosition.column = 5
    return 'H'
  })

  assert.equal(plan(board, piece, position), 'H')
  assert.deepEqual(board, [
    [0, 0],
    [0, 0],
  ])
  assert.deepEqual(piece, [[{ row: 0, column: 0 }]])
  assert.deepEqual(position, { row: 0, column: 0 })
})

test('the authored-plan adapter keeps only demo action codes', () => {
  const board = [[0]]
  const piece = [[{ row: 0, column: 0 }]]
  const position = { row: 0, column: 0 }
  const adapt = (result) => adaptAuthoredPlan(() => result)

  assert.equal(adapt('LLXH!')(board, piece, position), 'LLH')
  assert.equal(adapt('RHHLC')(board, piece, position), 'RHL')
  assert.equal(adapt('CLRHR')(board, piece, position), 'CLRHR')
})

test('the authored-plan adapter returns the empty log for a non-string result', () => {
  const plan = adaptAuthoredPlan(() => 42)

  assert.equal(plan([[0]], [[{ row: 0, column: 0 }]], { row: 0, column: 0 }), '')
})

test('the authored-plan adapter returns the empty log when the plan throws', () => {
  const plan = adaptAuthoredPlan(() => {
    throw new Error('broken')
  })

  assert.equal(plan([[0]], [[{ row: 0, column: 0 }]], { row: 0, column: 0 }), '')
})

test('the demo engine registry resolves the built-in engines', () => {
  assert.equal(DEFAULT_DEMO_ENGINE_ID, 'delphi5')
  assert.equal(getDemoEngine(), delphi5DemoEngine)
  assert.equal(getDemoEngine('delphi5'), delphi5DemoEngine)
  assert.equal(getDemoEngine('random'), randomDemoEngine)
  assert.deepEqual(
    demoEngineRegistry.list().map((engine) => engine.id),
    expectedDemoEngineIds,
  )
  assert.equal(delphi5DemoEngine.name, 'Delphi 5')
  assert.equal(randomDemoEngine.name, 'Random')
})

test('the demo engine registry summarizes engines for the UI', () => {
  const summaries = demoEngineRegistry.summaries()

  assert.deepEqual(
    summaries.map((summary) => summary.id),
    expectedDemoEngineIds,
  )
  for (const summary of summaries) {
    assert.ok(summary.name.length > 0)
    assert.ok(summary.description.trim().length > 0)
    assert.equal('plan' in summary, false)
  }
})

test('the demo engine registry rejects an unknown engine id', () => {
  assert.throws(
    () => getDemoEngine('missing'),
    /Unknown demo engine 'missing'\./,
  )
})

test('the demo engine registry rejects a duplicate id', () => {
  const registry = new DemoEngineRegistry()
  registry.register(delphi5DemoEngine)

  assert.throws(
    () => registry.register(delphi5DemoEngine),
    /Demo engine 'delphi5' is already registered\./,
  )
  assert.equal(registry.get('delphi5'), delphi5DemoEngine)
})

test('the demo engine registry rejects an engine without the required shape', () => {
  const registry = new DemoEngineRegistry()
  const validEngine = {
    id: 'valid-engine',
    name: 'Valid engine',
    description: 'A valid engine.',
    plan: () => '',
  }
  registry.register(validEngine)

  const candidates = [
    { engine: { ...validEngine, id: 'Not-Kebab' }, error: /lowercase kebab-case/ },
    { engine: { ...validEngine, name: '   ' }, error: /non-empty name/ },
    { engine: { ...validEngine, description: '' }, error: /non-empty description/ },
    { engine: { ...validEngine, plan: undefined }, error: /plan function/ },
  ]

  for (const { engine, error } of candidates) {
    assert.throws(() => registry.register(engine), error)
  }
  assert.equal(registry.get('valid-engine'), validEngine)
})

test('every built-in engine module follows the four-export convention', () => {
  assert.deepEqual(
    builtInDemoEngines.map((engine) => engine.id),
    expectedDemoEngineIds,
  )

  for (const engine of builtInDemoEngines) {
    assert.equal(typeof engine.id, 'string')
    assert.ok(engine.id.length > 0)
    assert.ok(engine.name.length > 0)
    assert.ok(engine.description.trim().length > 0)
    assert.equal(typeof engine.plan, 'function')
  }
})

test('demo engine modules follow the <engine-id>-demo-engine.ts name', () => {
  const engineDirectory = new URL(
    '../packages/pentix-core/src/demo-engines/',
    import.meta.url,
  )
  const engineModules = readdirSync(engineDirectory)
    .filter((name) => name.endsWith('.ts') && name !== 'index.ts')
    .sort()

  assert.deepEqual(
    engineModules,
    expectedDemoEngineIds.map((id) => `${id}-demo-engine.ts`).sort(),
  )
  for (const name of engineModules) {
    assert.match(name, /^[a-z0-9]+(?:-[a-z0-9]+)*-demo-engine\.ts$/)
  }
  for (const engine of builtInDemoEngines) {
    assert.ok(engineModules.includes(`${engine.id}-demo-engine.ts`))
  }
})

test('every registered engine plans a legal log without mutating its input', () => {
  const input = demoInput({
    width: 12,
    height: 22,
    filled: [
      [21, 0],
      [21, 1],
      [20, 1],
      [21, 4],
      [20, 4],
      [19, 4],
      [21, 7],
      [20, 7],
      [21, 8],
      [21, 9],
    ],
    key: '4T',
    row: 1,
    column: 5,
  })
  const boardBefore = JSON.stringify(input.board)
  const pieceBefore = JSON.stringify(input.piece)
  const positionBefore = JSON.stringify(input.position)

  for (const engine of demoEngineRegistry.list()) {
    const log = planWith(engine, input)

    assert.equal(actionAlphabetOnly(log), true, engine.id)
    assert.equal(log.includes('T'), false, engine.id)
    const afterDrop = log.indexOf('H')
    if (afterDrop >= 0) {
      assert.ok(
        log.slice(afterDrop + 1).length <= 1,
        `${engine.id} emits more than one action after the drop`,
      )
      assert.equal(/^[LR]?$/.test(log.slice(afterDrop + 1)), true, engine.id)
    }
    assert.equal(JSON.stringify(input.board), boardBefore, engine.id)
    assert.equal(JSON.stringify(input.piece), pieceBefore, engine.id)
    assert.equal(JSON.stringify(input.position), positionBefore, engine.id)
  }
})

test('a newly registered engine plans from the minimal input', () => {
  const registry = new DemoEngineRegistry()
  const engine = {
    id: 'left-wall',
    name: 'Left wall',
    description: 'Drops every piece in the leftmost column.',
    plan: (board, piece, position) => actionsToward(0, position, 0),
  }
  registry.register(engine)

  const input = demoInput({
    width: 12,
    height: 22,
    key: '1Line',
    row: 1,
    column: 5,
  })

  assert.deepEqual(
    registry.summaries().map((summary) => summary.id),
    ['left-wall'],
  )
  assert.equal(registry.get('left-wall').plan(input.board, input.piece, input.position), 'LLLLLH')
})

test('the engine input is the visible board, the piece cells, and the rotation point', () => {
  const game = createPentixGame({
    id: 'game-input',
    selectPieceId: createSelector([0, 1]),
  })
  const session = createPentixGameSession({
    id: 'session-input',
    userId: 'user-input',
    game,
  })

  const input = createDemoEngineInput(session)

  assert.equal(input.board.length, session.board.height)
  assert.equal(input.board[0].length, session.board.width)
  assert.equal(input.board.flat().every((value) => value === 0), true)
  // The first catalog piece is the single-cell 1Line.
  assert.deepEqual(input.piece, [[{ row: 0, column: 0 }]])
  assert.deepEqual(input.position, session.activePiece.origin)
})

test('the engine input lists exactly the reachable orientations', () => {
  const inputFor = (pieceId) => {
    const game = createPentixGame({
      id: `game-${pieceId}`,
      selectPieceId: createSelector([pieceId, pieceId]),
    })
    return createDemoEngineInput(
      createPentixGameSession({
        id: `session-${pieceId}`,
        userId: 'user-input',
        game,
      }),
    )
  }

  assert.equal(inputFor(0).piece.length, 1) // 1Line does not rotate
  assert.equal(inputFor(1).piece.length, 2) // 2Line turns in half turns
  assert.equal(inputFor(6).piece.length, 4) // 4T rotates fully
})

test('the delphi5 engine plans an action log from the minimal input', () => {
  const input = demoInput({
    width: 12,
    height: 22,
    key: '1Line',
    row: 1,
    column: 5,
  })

  const log = withFixedRandom(0, () => planWith(delphi5DemoEngine, input))

  assert.equal(actionAlphabetOnly(log), true)
  assert.equal(log.includes('T'), false)
  assert.ok(log.endsWith('H'))
})

test('the delphi5 engine plans nothing when no placement exists', () => {
  const filled = [0, 1, 2].flatMap((row) =>
    [0, 1, 2].map((column) => [row, column]),
  )
  const input = demoInput({
    width: 3,
    height: 3,
    filled,
    key: '1Line',
    row: 0,
    column: 1,
  })

  assert.equal(planWith(delphi5DemoEngine, input), '')
})

test('the random engine picks among reachable destinations', () => {
  // Column 1 is sealed from the top, so only columns 0 and 2 are reachable.
  const input = demoInput({
    width: 3,
    height: 4,
    filled: [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
    ],
    key: '1Line',
    row: 0,
    column: 1,
  })

  const first = withFixedRandom(0, () => planWith(randomDemoEngine, input))
  const last = withFixedRandom(0.999, () => planWith(randomDemoEngine, input))

  assert.equal(first, 'LH')
  assert.equal(last, 'RH')
  assert.equal(actionAlphabetOnly(first), true)
  assert.equal(actionAlphabetOnly(last), true)
})

test('the random engine plans nothing when every column is sealed', () => {
  const filled = [0, 1, 2].flatMap((row) =>
    [0, 1, 2].map((column) => [row, column]),
  )
  const input = demoInput({
    width: 3,
    height: 3,
    filled,
    key: '1Line',
    row: 0,
    column: 1,
  })

  assert.equal(planWith(randomDemoEngine, input), '')
})

/** A board with a single settled cell in the bottom-right corner. */
function boardWithBottomRightMono(width = 12, height = 22) {
  const board = Array.from({ length: height }, () => Array(width).fill(0))
  board[height - 1][width - 1] = 1
  return board
}

/** A real session for `pieceId` whose board is `boardRows`, plus its game. */
function sessionWithBoard(pieceId, boardRows) {
  const game = createPentixGame({
    id: `game-board-${pieceId}`,
    selectPieceId: () => pieceId,
  })
  const session = createPentixGameSession({
    id: `session-board-${pieceId}`,
    userId: 'user-board',
    game,
  })

  return {
    game,
    session: {
      ...session,
      board: {
        width: boardRows[0].length,
        height: boardRows.length,
        rows: boardRows.map((row, rowIndex) =>
          row.map((value, column) => ({
            row: rowIndex,
            column,
            isOccupied: value === 1,
            // A settled cell needs its piece key, otherwise locking the piece
            // would drop it when the board is rebuilt.
            pieceKey: value === 1 ? '4Square' : undefined,
          })),
        ),
      },
    },
  }
}

// --- Replaying a demo log the way the driver does ---------------------------

/** Applies one demo code to a demo replay state through the shared engine. */
function applyDemoCode(state, code) {
  switch (code) {
    case 'L':
      return {
        game: state.game,
        session: gameSessionEngine.move(state.session, 'left'),
      }
    case 'R':
      return {
        game: state.game,
        session: gameSessionEngine.move(state.session, 'right'),
      }
    case 'C':
      return {
        game: state.game,
        session: gameSessionEngine.rotate(state.session, 'clockwise'),
      }
    case 'A':
      return {
        game: state.game,
        session: gameSessionEngine.rotate(state.session, 'counterclockwise'),
      }
    case 'H':
      return gameSessionEngine.drop(state.session, state.game)
    default:
      assert.fail(`unexpected demo action: ${code}`)
  }
}

/**
 * Replays a demo action log with the driver's rule: one action, then the log's
 * last-tick move when that action is a hard drop that left the same piece
 * falling, then exactly one gravity tick.
 */
function replayDemoLog(current, log) {
  let state = { game: current.game, session: current.session }

  for (let index = 0; index < log.length; index += 1) {
    const code = log[index]
    const pieceIndex = state.session.nextPieceIndex
    let next = applyDemoCode(state, code)

    if (code === 'H') {
      const lastTickMove = log[index + 1]
      if (
        next.session.status === 'active' &&
        next.session.nextPieceIndex === pieceIndex &&
        (lastTickMove === 'L' || lastTickMove === 'R')
      ) {
        index += 1
        next = applyDemoCode(next, lastTickMove)
      }
    }

    state = gameSessionEngine.tick(next.session, next.game)
  }

  return state
}

/** Applies ticks until the replay's piece locks. */
function settleDemoPiece(current, limit = 40) {
  let state = current
  for (let ticks = 0; ticks < limit; ticks += 1) {
    if (
      state.session.status !== 'active' ||
      state.session.statistics.blocks > 0
    ) {
      break
    }
    state = gameSessionEngine.tick(state.session, state.game)
  }
  return state
}

/** The column the log's lateral moves reach before its hard drop. */
function dropColumnOf(position, log) {
  let column = position.column
  for (const code of log.slice(0, log.indexOf('H'))) {
    if (code === 'L') {
      column -= 1
    } else if (code === 'R') {
      column += 1
    }
  }
  return column
}

/** The board cells a destination settles, following its post-drop side-step. */
function settledCellsOf(board, cells, destination) {
  const landing = demoLandingRow(board, cells, destination.column)
  if (landing === null) {
    return null
  }

  let row = landing
  let column = destination.column
  if (destination.lastTickMove !== null) {
    const shifted =
      destination.lastTickMove === 'L' ? column - 1 : column + 1
    if (demoCanPlaceAt(board, cells, row, shifted)) {
      column = shifted
      while (demoCanPlaceAt(board, cells, row + 1, column)) {
        row += 1
      }
    }
  }

  return demoPieceCells(cells, { row, column })
    .map((cell) => `${cell.row},${cell.column}`)
    .sort()
}

test('the delphi5 engine rotates 4T and 4S as planned next to a corner mono', () => {
  const sortCells = (cells) =>
    [...cells]
      .map((cell) => `${cell.row},${cell.column}`)
      .sort()
      .join(';')

  const cornerMono = boardWithBottomRightMono()
  const cornerWall = boardWithBottomRightMono()
  cornerWall[19][11] = 1

  const boards = [
    { name: 'corner mono', rows: cornerMono },
    { name: 'corner mono with a wall cell above', rows: cornerWall },
  ]

  for (const [pieceId, key] of [
    [6, '4T'],
    [9, '4S'],
  ]) {
    const piece = PIECES_BY_KEY[key]

    for (const boardCase of boards) {
      const boardRows = boardCase.rows
      const label = `${key} next to a ${boardCase.name}`
      const { game, session } = sessionWithBoard(pieceId, boardRows)
      const input = createDemoEngineInput(session)

      const classic = withFixedRandom(0.5, () => planDemoDestination(session))
      const log = withFixedRandom(0.5, () =>
        delphi5DemoEngine.plan(input.board, input.piece, input.position),
      )

      const rotations = [...log].filter((code) => code === 'C').length
      const dropColumn = dropColumnOf(input.position, log)
      const lastTickMove = log.slice(log.indexOf('H') + 1)

      // The engine must choose the classic planner's orientation and column, and
      // append the side-step the planner reports.
      const classicShape = getOccupiedOffsets(
        piece.offsets,
        classic.angle,
        piece.rotationMode,
      ).map((offset) => ({ row: offset.y, column: offset.x }))
      assert.equal(
        sortCells(input.piece[rotations]),
        sortCells(classicShape),
        `wrong orientation for ${label}`,
      )
      assert.equal(dropColumn, classic.column, `wrong column for ${label}`)
      assert.equal(
        lastTickMove,
        classic.lastTickMove ?? '',
        `wrong last-tick move for ${label}`,
      )

      // ...and replaying the log must settle the same cells the plan describes.
      const settled = settleDemoPiece(
        replayDemoLog({ game, session }, log),
      )

      const plannedCells = settledCellsOf(
        input.board,
        input.piece[rotations],
        classic,
      )
      assert.notEqual(
        plannedCells,
        null,
        `planned placement is unreachable for ${label}`,
      )

      const isFixture = (cell) => boardRows[cell.row][cell.column] === 1
      const actualCells = settled.session.board.rows
        .flat()
        .filter((cell) => cell.isOccupied && !isFixture(cell))
        .map((cell) => `${cell.row},${cell.column}`)
        .sort()

      assert.deepEqual(
        actualCells,
        plannedCells,
        `wrong placement for ${label}`,
      )
    }
  }
})

test('replaying a delphi5 log as Action then Tick lands at the planned column', () => {
  const game = createPentixGame({
    id: 'game-demo',
    selectPieceId: createSelector([0, 1]),
  })
  const session = createPentixGameSession({
    id: 'session-demo',
    userId: 'user-demo',
    game,
  })
  const input = createDemoEngineInput(session)
  const log = withFixedRandom(0, () =>
    delphi5DemoEngine.plan(input.board, input.piece, input.position),
  )

  const settled = settleDemoPiece(replayDemoLog({ game, session }, log))

  assert.equal(log.includes('T'), false)
  assert.equal(settled.session.statistics.blocks, 1)
  assert.equal(settled.session.activePiece.key, session.nextPieceKey)

  // 1Line is one cell, so the settled cell's column is the drop column plus the
  // log's last-tick move.
  const dropColumn = dropColumnOf(input.position, log)
  const lastTickMove = log.slice(log.indexOf('H') + 1)
  const expectedColumn =
    lastTickMove === 'L'
      ? dropColumn - 1
      : lastTickMove === 'R'
        ? dropColumn + 1
        : dropColumn

  const bottom = settled.session.board.rows[settled.session.board.height - 1]
  const occupied = bottom.filter((cell) => cell.isOccupied)
  assert.equal(occupied.length, 1)
  assert.equal(occupied[0].column, expectedColumn)
})


// --- The last-tick move in the action log -----------------------------------

test('actionsToward appends the last-tick move after the hard drop', () => {
  const position = { row: 1, column: 5 }

  assert.equal(actionsToward(0, position, 5), 'H')
  assert.equal(actionsToward(2, position, 3), 'CCLLH')
  assert.equal(actionsToward(0, position, 5, 'R'), 'HR')
  assert.equal(actionsToward(1, position, 7, 'L'), 'CRRHL')
})

test('the delphi5 engine side-steps under a mino on the row before last', () => {
  const width = 12
  const height = 22
  const minoRow = height - 2

  for (let column = 0; column < width; column += 1) {
    const rows = Array.from({ length: height }, () => Array(width).fill(0))
    rows[minoRow][column] = 1

    const { game, session } = sessionWithBoard(0, rows)
    const input = createDemoEngineInput(session)
    const log = withFixedRandom(0.5, () => planWith(delphi5DemoEngine, input))

    // A straight drop in the mino's column would stop on top of it, so the log
    // steers to a neighbour column and side-steps into the pocket on its last
    // tick.
    const dropColumn = dropColumnOf(input.position, log)
    assert.equal(actionAlphabetOnly(log), true, `alphabet for column ${column}`)
    assert.equal(Math.abs(dropColumn - column), 1, `drop column ${column}`)
    assert.equal(log.at(-2), 'H', `hard drop before the side-step ${column}`)
    assert.equal(
      log.at(-1),
      dropColumn < column ? 'R' : 'L',
      `side-step direction ${column}`,
    )

    const settled = settleDemoPiece(replayDemoLog({ game, session }, log))
    const occupied = settled.session.board.rows
      .flat()
      .filter((cell) => cell.isOccupied)
    const fixture = occupied.filter(
      (cell) => cell.row === minoRow && cell.column === column,
    )
    const locked = occupied.filter(
      (cell) => !(cell.row === minoRow && cell.column === column),
    )

    // The settled mino is still there and the piece stays in the pocket below it.
    assert.equal(fixture.length, 1, `the settled mino stays for ${column}`)
    assert.deepEqual(
      locked.map((cell) => `${cell.row},${cell.column}`),
      [`${minoRow + 1},${column}`],
      `pocket placement for ${column}`,
    )
  }
})

test('the destination planner reports the side-step it plans', () => {
  const board = Array.from({ length: 22 }, () => Array(12).fill(0))
  board[20][7] = 1

  const destination = planDemoDestinationForOrientations(board, [
    [{ row: 0, column: 0 }],
  ])

  assert.notEqual(destination, null)
  assert.equal(Math.abs(destination.column - 7), 1)
  assert.equal(destination.lastTickMove, destination.column < 7 ? 'R' : 'L')
})

test('a straight-drop destination carries no last-tick move', () => {
  const session = demoSession({
    width: 12,
    height: 22,
    key: '1Line',
    row: 1,
    column: 6,
  })

  const destination = planDemoDestination(session)

  assert.notEqual(destination, null)
  assert.equal(destination.lastTickMove, null)
})

