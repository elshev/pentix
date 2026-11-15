import assert from 'node:assert/strict'
import test from 'node:test'

import { PIECE_CATALOG } from '#pentix/core'

import { buildRenderGrid, getActiveCells } from '../apps/pentix-web/src/engine/projection.ts'
import {
  DEFAULT_SETTINGS,
  createGameReducer,
  createInitialState,
} from '../apps/pentix-web/src/engine/gameReducer.ts'
import { actionTowardDestination, nextDemoAction, resolveDemoPlan } from '../apps/pentix-web/src/engine/demo.ts'
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

function withFixedRandom(value, fn) {
  const original = Math.random
  Math.random = () => value
  try {
    return fn()
  } finally {
    Math.random = original
  }
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

test('default settings use anticlockwise rotation, hide next, start at level 9', () => {
  const state = createInitialState(createDeps([0]))

  assert.equal(state.phase, 'demo')
  assert.equal(state.settings.rotateDirection, 'counterclockwise')
  assert.equal(state.settings.showNextPiece, false)
  assert.equal(state.settings.startingLevel, 9)
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

test('starting level can be set directly, clamped, and stepped up or down', () => {
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

  state = reducer(state, { type: 'decreaseLevel' })
  assert.equal(state.settings.startingLevel, 0)

  const floored = reducer(state, { type: 'decreaseLevel' })
  assert.equal(floored.settings.startingLevel, 0)

  const capped = reducer(
    { ...state, settings: { ...state.settings, startingLevel: 9 } },
    { type: 'increaseLevel' },
  )
  assert.equal(capped.settings.startingLevel, 9)
})

test('level changes during the demo update the live session; outside the demo they only update settings', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)

  const demo = createInitialState(deps, 'demo', settings({ startingLevel: 3 }))
  assert.equal(demo.session.statistics.level, 3)

  const demoUp = reducer(demo, { type: 'increaseLevel' })
  assert.equal(demoUp.settings.startingLevel, 4)
  assert.equal(demoUp.session.statistics.level, 4)

  const demoDown = reducer(demoUp, { type: 'decreaseLevel' })
  assert.equal(demoDown.settings.startingLevel, 3)
  assert.equal(demoDown.session.statistics.level, 3)

  const playing = createInitialState(deps, 'playing', settings({ startingLevel: 5 }))
  const playingUp = reducer(playing, { type: 'increaseLevel' })
  assert.equal(playingUp.settings.startingLevel, 6)
  assert.equal(playingUp.session.statistics.level, 5)
})

test('move shifts the active piece and is ignored when not playing', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  const playing = createInitialState(deps, 'playing')
  const startColumn = playing.session.activePiece.origin.column

  const moved = reducer(playing, { type: 'move', direction: 'right' })
  assert.equal(moved.session.activePiece.origin.column, startColumn + 1)

  const ignored = reducer({ ...playing, phase: 'paused' }, { type: 'move', direction: 'right' })
  assert.equal(ignored.phase, 'paused')
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

test('higher levels tick faster on the Delphi schedule', () => {
  assert.equal(getTickInterval(0), 1000)
  assert.equal(getTickInterval(5), 500)
  assert.equal(getTickInterval(9), 100)
  assert.equal(getTickInterval(20), 100)
  assert.ok(getTickInterval(1) > getTickInterval(5))
})

test('numeric keys move and rotate while playing', () => {
  assert.deepEqual(mapKeyToAction('7', 'playing'), { type: 'move', direction: 'left' })
  assert.deepEqual(mapKeyToAction('9', 'playing'), { type: 'move', direction: 'right' })
  assert.deepEqual(mapKeyToAction('8', 'playing'), { type: 'rotate' })
  assert.deepEqual(mapKeyToAction('5', 'playing'), { type: 'rotate' })
})

test('digits set the starting level before a game starts', () => {
  assert.deepEqual(mapKeyToAction('3', 'demo'), { type: 'setStartingLevel', level: 3 })
  assert.deepEqual(mapKeyToAction('8', 'demo'), { type: 'setStartingLevel', level: 8 })
})

test('plus and minus keys step the starting level', () => {
  assert.deepEqual(mapKeyToAction('+', 'demo'), { type: 'increaseLevel' })
  assert.deepEqual(mapKeyToAction('=', 'demo'), { type: 'increaseLevel' })
  assert.deepEqual(mapKeyToAction('-', 'demo'), { type: 'decreaseLevel' })
  assert.deepEqual(mapKeyToAction('_', 'demo'), { type: 'decreaseLevel' })
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

function emptyBoard(width, height) {
  return {
    width,
    height,
    rows: Array.from({ length: height }, (_, row) =>
      Array.from({ length: width }, (_, column) => ({
        row,
        column,
        isOccupied: false,
      })),
    ),
  }
}

function filledBoard(width, height) {
  return {
    width,
    height,
    rows: Array.from({ length: height }, (_, row) =>
      Array.from({ length: width }, (_, column) => ({
        row,
        column,
        isOccupied: true,
        pieceKey: '4Square',
      })),
    ),
  }
}

test('the initial phase is the demo', () => {
  const state = createInitialState(createDeps([0]))
  assert.equal(state.phase, 'demo')
})

test('the demo action creates a fresh demo session', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  const playing = createInitialState(deps, 'playing')

  const demo = reducer(playing, { type: 'demo' })
  assert.equal(demo.phase, 'demo')
  assert.equal(demo.session.status, 'active')
  assert.notEqual(demo.session.id, playing.session.id)
})

test('a stale demo action does not steer a different piece', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  const demo = createInitialState(deps, 'demo')

  // Simulate an action planned for a previous piece generation; by the time it
  // is applied the gravity tick has already spawned the next piece.
  const stale = reducer(demo, {
    type: 'demoAction',
    action: { type: 'drop' },
    sessionId: demo.session.id,
    pieceIndex: demo.session.nextPieceIndex - 1,
  })

  assert.equal(stale, demo)
})

test('a demo action for the active piece is applied', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  const demo = createInitialState(deps, 'demo')
  const startColumn = demo.session.activePiece.origin.column

  const moved = reducer(demo, {
    type: 'demoAction',
    action: { type: 'move', direction: 'left' },
    sessionId: demo.session.id,
    pieceIndex: demo.session.nextPieceIndex,
  })

  assert.equal(moved.session.activePiece.origin.column, startColumn - 1)
})

test('starting from the demo enters a fresh player game', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  const demo = createInitialState(deps)

  const started = reducer(demo, { type: 'start' })
  assert.equal(started.phase, 'playing')
  assert.equal(started.session.status, 'active')
  assert.notEqual(started.session.id, demo.session.id)
})

test('space enters the demo after game over and starts a game from the demo', () => {
  assert.deepEqual(mapKeyToAction(' ', 'game-over'), { type: 'demo' })
  assert.deepEqual(mapKeyToAction(' ', 'demo'), { type: 'start' })
  assert.deepEqual(mapKeyToAction('Enter', 'game-over'), { type: 'start' })
  assert.deepEqual(mapKeyToAction('Enter', 'demo'), { type: 'start' })
  assert.deepEqual(mapKeyToAction(' ', 'playing'), { type: 'drop' })
})

test('a demo game over immediately starts a fresh demo', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  const demo = createInitialState(deps)
  const overState = {
    ...demo,
    session: { ...demo.session, status: 'game-over' },
  }

  const next = reducer(overState, { type: 'tick' })
  assert.equal(next.phase, 'demo')
  assert.equal(next.session.status, 'active')
  assert.notEqual(next.session.id, demo.session.id)
})

test('nextDemoAction moves toward the demo destination', () => {
  const session = {
    board: emptyBoard(12, 22),
    activePiece: { key: '1Line', angle: 0, origin: { row: 1, column: 0 } },
  }

  // Pin the random tie-break so the empty-board destination is the right wall.
  assert.deepEqual(
    withFixedRandom(0, () => nextDemoAction(session)),
    { type: 'move', direction: 'right' },
  )
})

test('nextDemoAction hard-drops once the piece reaches its destination', () => {
  const session = {
    board: emptyBoard(12, 22),
    activePiece: { key: '1Line', angle: 0, origin: { row: 1, column: 11 } },
  }

  // Pin the random tie-break so the empty-board destination is the right wall.
  assert.deepEqual(withFixedRandom(0, () => nextDemoAction(session)), {
    type: 'drop',
  })
})

test('actionTowardDestination rotates before aligning the column', () => {
  const session = {
    board: emptyBoard(12, 22),
    activePiece: { key: '4T', angle: 0, origin: { row: 1, column: 5 } },
  }

  assert.deepEqual(actionTowardDestination(session, { angle: 90, column: 3 }), {
    type: 'rotate',
  })
  assert.deepEqual(actionTowardDestination(session, { angle: 0, column: 3 }), {
    type: 'move',
    direction: 'left',
  })
})

test('nextDemoAction returns undefined when the planner finds no placement', () => {
  const session = {
    board: filledBoard(3, 3),
    activePiece: { key: '1Line', angle: 0, origin: { row: 1, column: 1 } },
  }

  assert.equal(nextDemoAction(session), undefined)
})

test('nextDemoAction uses a precomputed destination', () => {
  const session = {
    board: emptyBoard(12, 22),
    activePiece: { key: '1Line', angle: 0, origin: { row: 1, column: 2 } },
  }

  // The destination is supplied, so the random planner is never consulted.
  assert.deepEqual(nextDemoAction(session, { angle: 0, column: 0 }), {
    type: 'move',
    direction: 'left',
  })
  assert.deepEqual(nextDemoAction(session, { angle: 0, column: 2 }), {
    type: 'drop',
  })
  assert.equal(nextDemoAction(session, null), undefined)
})

test('resolveDemoPlan keeps the destination stable for the same piece', () => {
  const session = {
    id: 'session-1',
    nextPieceIndex: 1,
    board: emptyBoard(12, 22),
    activePiece: { key: '1Line', angle: 0, origin: { row: 1, column: 0 } },
  }

  const first = resolveDemoPlan(null, session)
  const second = resolveDemoPlan(first, session)
  const third = resolveDemoPlan(second, session)

  // The destination must not be re-planned (or re-randomized) while the same
  // piece is active, otherwise the demo would jitter left/right every tick.
  assert.equal(second, first)
  assert.equal(third.destination, first.destination)
})

test('resolveDemoPlan re-plans when a new piece spawns or the session changes', () => {
  const session = {
    id: 'session-1',
    nextPieceIndex: 1,
    board: emptyBoard(12, 22),
    activePiece: { key: '1Line', angle: 0, origin: { row: 1, column: 0 } },
  }
  const first = resolveDemoPlan(null, session)

  const nextPiece = resolveDemoPlan(first, { ...session, nextPieceIndex: 2 })
  assert.notEqual(nextPiece, first)
  assert.equal(nextPiece.pieceIndex, 2)

  const nextSession = resolveDemoPlan(first, { ...session, id: 'session-2' })
  assert.notEqual(nextSession, first)
  assert.equal(nextSession.sessionId, 'session-2')
})

test('collected piece counts start at zero for every catalog piece', () => {
  const state = createInitialState(createDeps([0]))

  assert.equal(
    Object.keys(state.collectedStats.pieceCounts).length,
    PIECE_CATALOG.length,
  )
  for (const piece of PIECE_CATALOG) {
    assert.equal(state.collectedStats.pieceCounts[piece.key], 0)
  }
})

test('player actions increment counts while playing and ignore the demo', () => {
  const deps = createDeps([6])
  const reducer = createGameReducer(deps)
  const playing = createInitialState(deps, 'playing')

  const moved = reducer(playing, { type: 'move', direction: 'left' })
  const movedRight = reducer(moved, { type: 'move', direction: 'right' })
  const rotated = reducer(movedRight, { type: 'rotate' })
  const dropped = reducer(rotated, { type: 'drop' })

  assert.equal(dropped.collectedStats.moveLeft, 1)
  assert.equal(dropped.collectedStats.moveRight, 1)
  assert.equal(dropped.collectedStats.rotate, 1)
  assert.equal(dropped.collectedStats.drop, 1)

  const demo = createInitialState(deps, 'demo')
  const demoMoved = reducer(demo, { type: 'move', direction: 'left' })
  assert.equal(demoMoved.collectedStats.moveLeft, 0)
})

test('a settled piece increments its own per-piece count', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  const playing = createInitialState(deps, 'playing')

  // Hard drop lowers the piece but does not lock it on an empty board.
  const dropped = reducer(playing, { type: 'drop' })
  assert.equal(dropped.session.statistics.blocks, 0)
  assert.equal(dropped.collectedStats.pieceCounts['1Line'], 0)

  // The next tick cannot move down, so the piece locks and spawns the next.
  const settled = reducer(dropped, { type: 'tick' })
  assert.equal(settled.session.statistics.blocks, 1)
  assert.equal(settled.collectedStats.pieceCounts['1Line'], 1)

  for (const piece of PIECE_CATALOG) {
    if (piece.key !== '1Line') {
      assert.equal(settled.collectedStats.pieceCounts[piece.key], 0)
    }
  }
})

test('the demo does not accumulate collected statistics', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  const demo = createInitialState(deps, 'demo')

  const dropped = reducer(demo, { type: 'drop' })
  const settled = reducer(dropped, { type: 'tick' })

  assert.equal(settled.collectedStats.pieceCounts['1Line'], 0)
  assert.equal(settled.collectedStats.drop, 0)
})

test('starting a new game resets collected statistics', () => {
  const deps = createDeps([6])
  const reducer = createGameReducer(deps)
  const playing = createInitialState(deps, 'playing')

  const moved = reducer(playing, { type: 'move', direction: 'right' })
  const rotated = reducer(moved, { type: 'rotate' })
  const dropped = reducer(rotated, { type: 'drop' })

  assert.equal(dropped.collectedStats.moveRight, 1)
  assert.equal(dropped.collectedStats.rotate, 1)
  assert.equal(dropped.collectedStats.drop, 1)

  const restarted = reducer(dropped, { type: 'restart' })
  assert.equal(restarted.collectedStats.moveRight, 0)
  assert.equal(restarted.collectedStats.rotate, 0)
  assert.equal(restarted.collectedStats.drop, 0)
})