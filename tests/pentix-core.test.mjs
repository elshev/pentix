import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createPentixGameSession,
  Board,
  DEFAULT_BOARD_SIZE,
  PIECE_CATALOG,
  PIECES_BY_KEY,
  Piece,
  getOccupiedOffsets,
  normalizeAngle,
} from '../packages/pentix-core/dist/index.js'

const expectedCatalog = [
  ['bi1Line', '1Line', 'none', [[0, 0]]],
  ['bi2Line', '2Line', 'half', [[0, 0], [0, 1]]],
  ['bi3Line', '3Line', 'half', [[0, 0], [-1, 0], [1, 0]]],
  ['bi3Corner', '3Corner', 'full', [[0, 0], [0, -1], [1, 0]]],
  ['bi4Line', '4Line', 'half', [[0, 0], [-2, 0], [-1, 0], [1, 0]]],
  ['bi4Square', '4Square', 'none', [[0, 0], [0, 1], [1, 1], [1, 0]]],
  ['bi4T', '4T', 'full', [[0, 0], [-1, 0], [1, 0], [0, -1]]],
  ['bi4L', '4L', 'full', [[0, 0], [-1, 0], [1, 0], [1, -1]]],
  ['bi4LMir', '4LMir', 'full', [[0, 0], [-1, -1], [-1, 0], [1, 0]]],
  ['bi4S', '4S', 'half', [[0, 0], [-1, 0], [0, -1], [1, -1]]],
  ['bi4SMir', '4SMir', 'half', [[0, 0], [-1, -1], [0, -1], [1, 0]]],
  ['bi5Line', '5Line', 'half', [[0, 0], [-2, 0], [-1, 0], [1, 0], [2, 0]]],
  ['bi5Corner', '5Corner', 'full', [[-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1]]],
  ['bi5Cross', '5Cross', 'none', [[0, 0], [0, -1], [-1, 0], [0, 1], [1, 0]]],
  ['bi5T', '5T', 'full', [[0, 0], [1, -1], [0, -1], [-1, -1], [0, 1]]],
  ['bi5W', '5W', 'full', [[0, 0], [-1, 1], [0, 1], [1, 0], [1, -1]]],
  ['bi5U', '5U', 'full', [[0, 0], [-1, -1], [-1, 0], [1, 0], [1, -1]]],
  ['bi5L', '5L', 'full', [[0, 0], [-2, 0], [-1, 0], [1, 0], [1, -1]]],
  ['bi5LMir', '5LMir', 'full', [[0, 0], [-1, -1], [-1, 0], [1, 0], [2, 0]]],
  ['bi5S', '5S', 'full', [[0, 0], [0, -1], [-2, 0], [-1, 0], [1, -1]]],
  ['bi5SMir', '5SMir', 'full', [[0, 0], [0, -1], [-1, -1], [1, 0], [2, 0]]],
  ['bi5F', '5F', 'full', [[0, 0], [0, -1], [-1, 1], [0, 1], [1, 0]]],
  ['bi5FMir', '5FMir', 'full', [[0, 0], [0, -1], [-1, 0], [0, 1], [1, 1]]],
  ['bi5P', '5P', 'full', [[0, 0], [1, 0], [1, -1], [0, -1], [0, 1]]],
  ['bi5PMir', '5PMir', 'full', [[0, 0], [0, -1], [-1, -1], [-1, 0], [0, 1]]],
  ['bi5Z', '5Z', 'half', [[0, 0], [0, -1], [-1, -1], [0, 1], [1, 1]]],
  ['bi5ZMir', '5ZMir', 'half', [[0, 0], [1, -1], [0, -1], [-1, 1], [0, 1]]],
  ['bi5R', '5R', 'full', [[0, 0], [2, 0], [1, 0], [0, -1], [-1, 0]]],
  ['bi5RMir', '5RMir', 'full', [[0, 0], [1, 0], [0, -1], [-2, 0], [-1, 0]]],
]

function offsetsToPairs(offsets) {
  return offsets.map(({ x, y }) => [x, y])
}

test('piece catalog matches the Delphi source definitions', () => {
  assert.equal(PIECE_CATALOG.length, 29)

  const actualCatalog = PIECE_CATALOG.map((piece) => [
    piece.key,
    piece.name,
    piece.rotationMode,
    offsetsToPairs(piece.offsets),
  ])

  assert.deepEqual(actualCatalog, expectedCatalog)
})

test('rotation normalization follows the Delphi rules', () => {
  assert.equal(normalizeAngle(270, 'full'), 270)
  assert.equal(normalizeAngle(270, 'half'), 90)
  assert.equal(normalizeAngle(90, 'none'), 0)
  assert.equal(normalizeAngle(95, 'full'), 0)

  const piece = new Piece(PIECES_BY_KEY.bi3Corner, 90)
  assert.deepEqual(offsetsToPairs(piece.occupiedOffsets), [
    [0, 0],
    [-1, 0],
    [0, -1],
  ])
})

test('5Corner preserves the legacy empty-origin geometry', () => {
  const cornerOffsets = offsetsToPairs(PIECES_BY_KEY.bi5Corner.offsets)
  assert.equal(
    cornerOffsets.some(([x, y]) => x === 0 && y === 0),
    false,
  )
})

test('shared piece definitions stay immutable at runtime', () => {
  const cornerOffset = PIECES_BY_KEY.bi3Corner.offsets[0]

  assert.equal(Object.isFrozen(cornerOffset), true)
  assert.throws(() => {
    cornerOffset.x = 99
  }, TypeError)
  assert.deepEqual(offsetsToPairs(PIECES_BY_KEY.bi3Corner.offsets), [
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

  board.setCell(5, 4, 'bi4T')
  assert.deepEqual(board.getCell(5, 4), {
    row: 5,
    column: 4,
    isOccupied: true,
    pieceKey: 'bi4T',
  })

  board.clearCell(5, 4)
  assert.equal(board.getCell(5, 4).isOccupied, false)
})

test('board cell snapshots cannot be mutated directly', () => {
  const board = new Board(DEFAULT_BOARD_SIZE.width, DEFAULT_BOARD_SIZE.height)
  const cell = board.setCell(5, 4, 'bi4T')
  const rows = board.toRows()

  assert.equal(Object.isFrozen(cell), true)
  assert.equal(Object.isFrozen(rows), true)
  assert.equal(Object.isFrozen(rows[5]), true)
  assert.throws(() => {
    cell.pieceKey = 'bi3Corner'
  }, TypeError)
  assert.deepEqual(board.getCell(5, 4), {
    row: 5,
    column: 4,
    isOccupied: true,
    pieceKey: 'bi4T',
  })
})

test('occupied offsets can be computed without a Piece instance', () => {
  assert.deepEqual(
    offsetsToPairs(getOccupiedOffsets(PIECES_BY_KEY.bi2Line.offsets, 270, 'half')),
    [
      [0, 0],
      [1, 0],
    ],
  )
})
test('game session initializer starts with shared defaults', () => {
  const selectedKeys = ['bi3Corner', 'bi5T']
  let selectionIndex = 0
  const session = createPentixGameSession({
    sessionId: 'test-session',
    selectPieceKey: () => selectedKeys[selectionIndex++],
  })

  assert.equal(session.sessionId, 'test-session')
  assert.equal(session.status, 'active')
  assert.deepEqual([session.board.width, session.board.height], [12, 22])
  assert.equal(session.board.rows.flat().some((cell) => cell.isOccupied), false)
  assert.deepEqual(session.statistics, { score: 0, level: 1, clearedLines: 0 })
  assert.deepEqual(session.activePiece.origin, { row: 1, column: 6 })
  assert.equal(session.activePiece.angle, 0)
  assert.equal(session.activePiece.key, selectedKeys[0])
  assert.equal(session.nextPieceKey, selectedKeys[1])
  assert.ok(PIECES_BY_KEY[session.activePiece.key])
  assert.ok(PIECES_BY_KEY[session.nextPieceKey])
  assert.doesNotThrow(() => JSON.stringify(session))
})
