import assert from 'node:assert/strict'
import test from 'node:test'

import { buildRenderGrid, getActiveCells } from '../apps/pentix-web/src/engine/projection.ts'
import {
  DEFAULT_SETTINGS,
  createGameReducer,
  createInitialState,
} from '../apps/pentix-web/src/engine/gameReducer.ts'
import { getTickInterval } from '../apps/pentix-web/src/engine/gameLoop.ts'
import { mapKeyToAction } from '../apps/pentix-web/src/engine/keyMap.ts'

function createDeps(pieceIds = [0]) {
  let idCounter = 0
  let pieceCursor = 0
  return {
    createId: () => `id-${idCounter++}`,
    userId: '11111111-1111-7111-8111-111111111111',
    selectPieceId: () => pieceIds[pieceCursor++ % pieceIds.length],
  }
}

function settings(overrides = {}) {
  return { ...DEFAULT_SETTINGS, ...overrides }
}

test('buildRenderGrid colors occupied cells and overlays the active piece', () => {
  const session = {
    activePiece: { key: '1Line', angle: 0, origin: { row: 1, column: 1 } },
    board: {
      width: 3,
      height: 2,
      rows: [
        [
          { row: 0, column: 0, isOccupied: true, pieceKey: '4Square' },
          { row: 0, column: 1, isOccupied: false },
          { row: 0, column: 2, isOccupied: false },
        ],
        [
          { row: 1, column: 0, isOccupied: false },
          { row: 1, column: 1, isOccupied: false },
          { row: 1, column: 2, isOccupied: false },
        ],
      ],
    },
  }

  const grid = buildRenderGrid(session)

  assert.deepEqual(grid[0][0], { pieceKey: '4Square', isActive: false })
  assert.deepEqual(grid[1][1], { pieceKey: '1Line', isActive: true })
  assert.deepEqual(grid[0][1], { pieceKey: undefined, isActive: false })
})

test('getActiveCells maps the origin plus rotated offsets', () => {
  const session = {
    activePiece: { key: '1Line', angle: 0, origin: { row: 1, column: 6 } },
    board: { width: 12, height: 22, rows: [] },
  }

  assert.deepEqual(getActiveCells(session), [{ row: 1, column: 6 }])
})

test('default settings use anticlockwise rotation, hide next, start at level 1', () => {
  const state = createInitialState(createDeps([0]))

  assert.equal(state.phase, 'ready')
  assert.equal(state.settings.rotateDirection, 'counterclockwise')
  assert.equal(state.settings.showNextPiece, false)
  assert.equal(state.settings.startingLevel, 1)
  assert.equal(state.gravityEpoch, 0)
})

test('start begins a fresh session at the configured starting level', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  const initial = createInitialState(deps, 'ready', settings({ startingLevel: 5 }))

  const started = reducer(initial, { type: 'start' })

  assert.equal(started.phase, 'playing')
  assert.equal(started.session.status, 'active')
  assert.equal(started.session.statistics.level, 5)
  assert.notEqual(started.session.id, initial.session.id)
})

test('rotate follows the configured direction and the toggle flips it', () => {
  const deps = createDeps([6])
  const reducer = createGameReducer(deps)
  const playing = createInitialState(deps, 'playing')

  assert.equal(playing.settings.rotateDirection, 'counterclockwise')

  const rotatedCcw = reducer(playing, { type: 'rotate' })
  assert.equal(rotatedCcw.session.activePiece.angle, 90)

  const toggled = reducer(playing, { type: 'toggleRotateDirection' })
  assert.equal(toggled.settings.rotateDirection, 'clockwise')

  const rotatedCw = reducer(toggled, { type: 'rotate' })
  assert.equal(rotatedCw.session.activePiece.angle, 270)
})

test('toggleNextPiece flips the preview flag', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  const ready = createInitialState(deps)

  assert.equal(ready.settings.showNextPiece, false)

  const on = reducer(ready, { type: 'toggleNextPiece' })
  assert.equal(on.settings.showNextPiece, true)

  const off = reducer(on, { type: 'toggleNextPiece' })
  assert.equal(off.settings.showNextPiece, false)
})

test('starting level can be set directly, clamped, and increased', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  let state = createInitialState(deps)

  state = reducer(state, { type: 'setStartingLevel', level: 7 })
  assert.equal(state.settings.startingLevel, 7)

  state = reducer(state, { type: 'setStartingLevel', level: 42 })
  assert.equal(state.settings.startingLevel, 9)

  state = reducer(state, { type: 'setStartingLevel', level: -3 })
  assert.equal(state.settings.startingLevel, 0)

  state = reducer(state, { type: 'increaseLevel' })
  assert.equal(state.settings.startingLevel, 1)

  const capped = reducer(
    { ...state, settings: { ...state.settings, startingLevel: 9 } },
    { type: 'increaseLevel' },
  )
  assert.equal(capped.settings.startingLevel, 9)
})

test('move shifts the active piece and is ignored when not playing', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  const playing = createInitialState(deps, 'playing')
  const startColumn = playing.session.activePiece.origin.column

  const moved = reducer(playing, { type: 'move', direction: 'right' })
  assert.equal(moved.session.activePiece.origin.column, startColumn + 1)

  const ignored = reducer({ ...playing, phase: 'ready' }, { type: 'move', direction: 'right' })
  assert.equal(ignored.phase, 'ready')
  assert.equal(ignored.session.activePiece.origin.column, startColumn)
})

test('tick advances the active piece one row while there is room', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  const playing = createInitialState(deps, 'playing')
  const startRow = playing.session.activePiece.origin.row

  const ticked = reducer(playing, { type: 'tick' })
  assert.equal(ticked.session.activePiece.origin.row, startRow + 1)
})

test('drop advances the piece and awards fall-distance score', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  const playing = createInitialState(deps, 'playing')

  const dropped = reducer(playing, { type: 'drop' })
  assert.ok(dropped.session.statistics.score > 0)
  assert.equal(dropped.phase, 'playing')
})

test('a game-over session moves the phase to game-over', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  const playing = createInitialState(deps, 'playing')
  const overState = {
    ...playing,
    session: { ...playing.session, status: 'game-over' },
  }

  const next = reducer(overState, { type: 'tick' })
  assert.equal(next.phase, 'game-over')
})

test('pause and resume toggle the playing phase', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  const playing = createInitialState(deps, 'playing')

  const paused = reducer(playing, { type: 'pause' })
  assert.equal(paused.phase, 'paused')

  const resumed = reducer(paused, { type: 'resume' })
  assert.equal(resumed.phase, 'playing')
})

test('higher levels tick faster', () => {
  assert.ok(getTickInterval(1) > getTickInterval(5))
  assert.ok(getTickInterval(1) > 0)
  assert.ok(getTickInterval(20) >= 120)
})

test('numeric keys move and rotate while playing', () => {
  assert.deepEqual(mapKeyToAction('7', 'playing'), { type: 'move', direction: 'left' })
  assert.deepEqual(mapKeyToAction('9', 'playing'), { type: 'move', direction: 'right' })
  assert.deepEqual(mapKeyToAction('8', 'playing'), { type: 'rotate' })
  assert.deepEqual(mapKeyToAction('5', 'playing'), { type: 'rotate' })
})

test('digits set the starting level before a game starts', () => {
  assert.deepEqual(mapKeyToAction('3', 'ready'), { type: 'setStartingLevel', level: 3 })
  assert.deepEqual(mapKeyToAction('8', 'ready'), { type: 'setStartingLevel', level: 8 })
})

test('arrows map to movement and rotate keys to rotation', () => {
  assert.deepEqual(mapKeyToAction('ArrowLeft', 'playing'), { type: 'move', direction: 'left' })
  assert.deepEqual(mapKeyToAction('ArrowRight', 'playing'), { type: 'move', direction: 'right' })
  assert.deepEqual(mapKeyToAction('ArrowUp', 'playing'), { type: 'rotate' })
  assert.equal(mapKeyToAction('ArrowDown', 'playing'), undefined)
  assert.deepEqual(mapKeyToAction('z', 'playing'), { type: 'rotate' })
})

test('drop and start restart the gravity clock via the epoch', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  const playing = createInitialState(deps, 'playing')

  const dropped = reducer(playing, { type: 'drop' })
  assert.equal(dropped.gravityEpoch, playing.gravityEpoch + 1)

  const started = reducer(playing, { type: 'start' })
  assert.equal(started.gravityEpoch, playing.gravityEpoch + 1)
})

test('move and tick do not restart the gravity clock', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  const playing = createInitialState(deps, 'playing')

  assert.equal(
    reducer(playing, { type: 'move', direction: 'left' }).gravityEpoch,
    playing.gravityEpoch,
  )
  assert.equal(reducer(playing, { type: 'tick' }).gravityEpoch, playing.gravityEpoch)
})