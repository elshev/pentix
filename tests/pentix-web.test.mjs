import assert from 'node:assert/strict'
import test from 'node:test'

import { PIECE_CATALOG, demoEngineRegistry, delphi5DemoEngine, getPieceDefinitionById } from '#pentix/core'

import { buildRenderGrid, getActiveCells } from '../apps/pentix-web/src/engine/projection.ts'
import {
  DEFAULT_SETTINGS,
  MAIN_BOARD_ID,
  MAX_DEMO_BOARDS,
  createGameReducer,
  createInitialState,
  mainBoardName,
} from '../apps/pentix-web/src/engine/gameReducer.ts'
import {
  advanceDemoPlan,
  nextDemoAction,
  nextDemoStep,
  resolveDemoPlan,
} from '../apps/pentix-web/src/engine/demo.ts'
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

/** A player game that just ended, still inside its post-game-over cooldown. */
function coolingGameOverState(deps) {
  const base = createInitialState(deps, 'game-over')
  return {
    ...base,
    session: { ...base.session, status: 'game-over' },
    gameOverReady: false,
  }
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

test('level changes follow the live session in the demo and while a player game is raised', () => {
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
  // A running game follows the raise; lowering it stays refused.
  assert.equal(playingUp.session.statistics.level, 6)
  assert.equal(reducer(playingUp, { type: 'decreaseLevel' }), playingUp)
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

/** An empty board with the given `[row, column]` cells settled. */
function boardWith(width, height, filled = []) {
  const board = emptyBoard(width, height)
  for (const [row, column] of filled) {
    board.rows[row][column] = { row, column, isOccupied: true, pieceKey: '4Square' }
  }
  return board
}

/** A demo state whose session is overridden (board, piece placement, status). */
function demoStateWith(deps, overrides) {
  const state = createInitialState(deps, 'demo')
  return { ...state, session: { ...state.session, ...overrides } }
}

/** A `demoStep` action carrying one code from the engine's log. */
function demoStepAction(state, action, overrides = {}) {
  return {
    type: 'demoStep',
    boardId: MAIN_BOARD_ID,
    action,
    lastTickAction: null,
    sessionId: state.session.id,
    pieceIndex: state.session.nextPieceIndex,
    ...overrides,
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

test('a stale demo step does not steer a different piece', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  const demo = createInitialState(deps, 'demo')

  // Simulate a step planned for a previous piece generation; by the time it is
  // applied the demo has already spawned the next piece.
  const stale = reducer(
    demo,
    demoStepAction(demo, 'H', {
      pieceIndex: demo.session.nextPieceIndex - 1,
    }),
  )

  assert.equal(stale, demo)
})

test('a demo step for another session is ignored', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  const demo = createInitialState(deps, 'demo')

  const stale = reducer(
    demo,
    demoStepAction(demo, 'L', { sessionId: 'session-missing' }),
  )

  assert.equal(stale, demo)
})

test('a demo step applies the action and then one gravity tick', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  const demo = createInitialState(deps, 'demo')
  const { row, column } = demo.session.activePiece.origin

  const stepped = reducer(demo, demoStepAction(demo, 'L'))

  // Action then Tick: the move lands first, then gravity descends the piece.
  assert.equal(stepped.session.activePiece.origin.row, row + 1)
  assert.equal(stepped.session.activePiece.origin.column, column - 1)
  assert.equal(stepped.session.statistics.actions.moves, 1)
})

test('a resting piece takes one legal action and then locks', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  // A nearly full floor keeps the piece resting after it steps sideways, and
  // the empty column keeps the lock from clearing the row.
  const demo = demoStateWith(deps, {
    board: boardWith(12, 22, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(
      (column) => [21, column],
    )),
    activePiece: { key: '1Line', angle: 0, origin: { row: 20, column: 5 } },
  })

  const stepped = reducer(demo, demoStepAction(demo, 'R'))

  // The move applies at the resting placement, and the paired tick locks it.
  assert.equal(stepped.session.statistics.blocks, 1)
  assert.equal(stepped.session.activePiece.key, demo.session.nextPieceKey)
  assert.equal(stepped.session.nextPieceIndex, demo.session.nextPieceIndex + 1)
  assert.equal(stepped.session.board.rows[20][6].isOccupied, true)
})

test('a blocked action still ticks and locks the resting piece', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  // The piece rests on the floor (row 21 occupied below) and the cell to its
  // left is settled too, so the left move can never happen.
  const demo = demoStateWith(deps, {
    board: boardWith(12, 22, [
      [21, 5],
      [20, 4],
    ]),
    activePiece: { key: '1Line', angle: 0, origin: { row: 20, column: 5 } },
  })

  const stepped = reducer(demo, demoStepAction(demo, 'L'))

  // The action is a no-op, but its paired tick still settles the piece.
  assert.equal(stepped.session.statistics.blocks, 1)
  assert.equal(stepped.session.activePiece.key, demo.session.nextPieceKey)
  assert.equal(stepped.session.nextPieceIndex, demo.session.nextPieceIndex + 1)
  assert.equal(stepped.session.id, demo.session.id)
  assert.equal(stepped.session.board.rows[20][5].isOccupied, true)
})

test('a null action applies ticks only and settles the resting piece', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  const demo = demoStateWith(deps, {
    board: boardWith(3, 4, [0, 1, 2].map((column) => [3, column])),
    activePiece: { key: '1Line', angle: 0, origin: { row: 2, column: 1 } },
  })

  const settled = reducer(demo, demoStepAction(demo, null))

  assert.equal(settled.session.statistics.blocks, 1)
  assert.equal(settled.session.activePiece.key, demo.session.nextPieceKey)
  assert.equal(settled.session.nextPieceIndex, demo.session.nextPieceIndex + 1)
  assert.equal(settled.session.id, demo.session.id)
})

test('a demo step side-steps after the drop and locks in the pocket', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  // A mino on the row before last leaves a pocket beneath it on the floor. The
  // piece drops in the neighbouring column, side-steps into the pocket on the
  // same interval, and the interval's tick locks it there.
  const demo = demoStateWith(deps, {
    board: boardWith(12, 22, [[20, 7]]),
    activePiece: { key: '1Line', angle: 0, origin: { row: 1, column: 8 } },
  })

  const stepped = reducer(
    demo,
    demoStepAction(demo, 'H', { lastTickAction: 'L' }),
  )

  assert.equal(stepped.session.statistics.blocks, 1)
  assert.equal(stepped.session.board.rows[21][7].isOccupied, true)
  assert.equal(stepped.session.board.rows[21][8].isOccupied, false)
  assert.equal(stepped.session.nextPieceIndex, demo.session.nextPieceIndex + 1)
})

test('a settling drop discards the last-tick move', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  // The piece already rests on the floor, so the drop settles it immediately.
  const demo = demoStateWith(deps, {
    board: boardWith(12, 22, []),
    activePiece: { key: '1Line', angle: 0, origin: { row: 21, column: 5 } },
  })

  const stepped = reducer(
    demo,
    demoStepAction(demo, 'H', { lastTickAction: 'R' }),
  )

  assert.equal(stepped.session.statistics.blocks, 1)
  // The spawned piece keeps its spawn column: the side-step belonged to the
  // settled piece and must not steer its successor.
  assert.equal(
    stepped.session.activePiece.origin.column,
    Math.floor(stepped.session.board.width / 2),
  )
  assert.equal(stepped.session.board.rows[21][5].isOccupied, true)
  assert.equal(stepped.session.board.rows[21][6].isOccupied, false)
})

test('a demo step that ends the demo game keeps the final board until the delay elapses', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  const demo = createInitialState(deps, 'demo')
  const { row, column } = demo.session.activePiece.origin
  // Block the cell below the piece so it settles at the spawn point, and the
  // next spawn has nowhere to go: the demo game ends.
  const blocked = demoStateWith(deps, {
    board: boardWith(12, 22, [[row + 1, column]]),
    activePiece: demo.session.activePiece,
  })

  const over = reducer(
    blocked,
    demoStepAction(blocked, 'H'),
  )

  assert.equal(over.phase, 'demo-over')
  assert.equal(over.session.status, 'game-over')
  assert.equal(over.session.id, blocked.session.id)

  const restarted = reducer(over, { type: 'demoRestart' })
  assert.equal(restarted.phase, 'demo')
  assert.equal(restarted.session.status, 'active')
  assert.notEqual(restarted.session.id, over.session.id)
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
  // The demo's post-game-over delay still lets the player take over or pick a
  // level instead of waiting for the next demo.
  assert.deepEqual(mapKeyToAction(' ', 'demo-over'), { type: 'start' })
  assert.deepEqual(mapKeyToAction('Enter', 'demo-over'), { type: 'start' })
  assert.deepEqual(mapKeyToAction('4', 'demo-over'), {
    type: 'setStartingLevel',
    level: 4,
  })
})

test('a demo game over waits for the demo restart action', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  const demo = createInitialState(deps)
  const overState = {
    ...demo,
    session: { ...demo.session, status: 'game-over' },
  }

  const next = reducer(overState, { type: 'tick' })
  assert.equal(next.phase, 'demo-over')
  assert.equal(next.session.status, 'game-over')
  assert.equal(next.session.id, demo.session.id)
  // The attract loop is only restarted by the delay's own action.
  assert.equal(reducer(demo, { type: 'demoRestart' }), demo)

  const restarted = reducer(next, { type: 'demoRestart' })
  assert.equal(restarted.phase, 'demo')
  assert.equal(restarted.session.status, 'active')
  assert.notEqual(restarted.session.id, demo.session.id)
  // No player-facing cooldown is armed for the attract loop.
  assert.equal(restarted.gameOverReady, true)
})

test('choosing a level on the game-over screen starts that level', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  const over = {
    ...createInitialState(deps, 'game-over', settings({ startingLevel: 9 })),
    gameOverReady: true,
  }

  const started = reducer(over, { type: 'setStartingLevel', level: 3 })

  assert.equal(started.phase, 'playing')
  assert.equal(started.settings.startingLevel, 3)
  assert.equal(started.session.statistics.level, 3)
  assert.notEqual(started.session.id, over.session.id)
})

test('level buttons are inert during the cooldown but may raise a running game', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)

  const cooling = coolingGameOverState(deps)
  assert.equal(reducer(cooling, { type: 'setStartingLevel', level: 3 }), cooling)

  const playing = createInitialState(deps, 'playing', settings({ startingLevel: 2 }))
  // Lowering or keeping the level is refused while a player game runs.
  assert.equal(reducer(playing, { type: 'setStartingLevel', level: 2 }), playing)
  assert.equal(reducer(playing, { type: 'setStartingLevel', level: 0 }), playing)

  // Raising it applies to the live session and to the configured level.
  const raised = reducer(playing, { type: 'setStartingLevel', level: 6 })
  assert.equal(raised.phase, 'playing')
  assert.equal(raised.session.id, playing.session.id)
  assert.equal(raised.session.statistics.level, 6)
  assert.equal(raised.settings.startingLevel, 6)

  // The same rule holds while paused.
  const paused = reducer(playing, { type: 'pause' })
  const pausedRaised = reducer(paused, { type: 'setStartingLevel', level: 5 })
  assert.equal(pausedRaised.phase, 'paused')
  assert.equal(pausedRaised.session.statistics.level, 5)
})

test('the plus key raises a running game while minus cannot lower it', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  const playing = createInitialState(deps, 'playing', settings({ startingLevel: 4 }))

  const up = reducer(playing, { type: 'increaseLevel' })
  assert.equal(up.session.statistics.level, 5)

  const down = reducer(up, { type: 'decreaseLevel' })
  assert.equal(down, up)
})

test('a level chosen during the demo delay applies to the next demo', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  const demo = createInitialState(deps, 'demo', settings({ startingLevel: 2 }))
  const over = {
    ...demo,
    phase: 'demo-over',
    session: { ...demo.session, status: 'game-over' },
  }

  const chosen = reducer(over, { type: 'setStartingLevel', level: 7 })
  assert.equal(chosen.phase, 'demo-over')
  assert.equal(chosen.settings.startingLevel, 7)
  // The finished demo keeps the level it played at.
  assert.equal(chosen.session.statistics.level, 2)

  const restarted = reducer(chosen, { type: 'demoRestart' })
  assert.equal(restarted.phase, 'demo')
  assert.equal(restarted.session.statistics.level, 7)
})

test('a fresh game over ignores start, restart, and demo until the cooldown elapses', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  const over = coolingGameOverState(deps)

  for (const action of [
    { type: 'start' },
    { type: 'restart' },
    { type: 'demo' },
  ]) {
    assert.equal(reducer(over, action), over)
  }

  // The final board the player is looking at survives the stray input.
  assert.equal(over.phase, 'game-over')
  assert.equal(over.session.status, 'game-over')
})

test('the elapsed cooldown re-enables the game-over actions', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  const over = coolingGameOverState(deps)

  const ready = reducer(over, { type: 'gameOverCooldownElapsed' })
  assert.equal(ready.phase, 'game-over')
  assert.equal(ready.gameOverReady, true)
  assert.equal(ready.session, over.session)

  const restarted = reducer(ready, { type: 'restart' })
  assert.equal(restarted.phase, 'playing')
  assert.notEqual(restarted.session.id, over.session.id)

  const demo = reducer(ready, { type: 'demo' })
  assert.equal(demo.phase, 'demo')
  assert.notEqual(demo.session.id, over.session.id)

  // Outside game over the timer event is a no-op.
  const playing = createInitialState(deps, 'playing')
  assert.equal(reducer(playing, { type: 'gameOverCooldownElapsed' }), playing)
})

test('a tick that ends a player game enters game over with the cooldown armed', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  const playing = createInitialState(deps, 'playing')
  const lastMoment = {
    ...playing,
    session: { ...playing.session, status: 'game-over' },
  }

  const over = reducer(lastMoment, { type: 'tick' })
  assert.equal(over.phase, 'game-over')
  assert.equal(over.gameOverReady, false)
  assert.equal(over.session.status, 'game-over')
})

test('start and demo hotkeys are ignored until the game-over cooldown elapses', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  const over = coolingGameOverState(deps)

  for (const key of [' ', 'Enter']) {
    const action = mapKeyToAction(key, over.phase)
    assert.notEqual(action, undefined)
    assert.equal(reducer(over, action), over)
  }
})

test('nextDemoAction replays the plan one code at a time', () => {
  const plan = {
    sessionId: 'session-1',
    pieceIndex: 1,
    actions: 'LRH',
    index: 0,
  }

  assert.equal(nextDemoAction(plan), 'L')

  const second = advanceDemoPlan(plan)
  assert.equal(nextDemoAction(second), 'R')

  const third = advanceDemoPlan(second)
  assert.equal(nextDemoAction(third), 'H')

  const exhausted = advanceDemoPlan(third)
  assert.equal(nextDemoAction(exhausted), null)
  // An exhausted plan stays exhausted and keeps ticking.
  assert.equal(advanceDemoPlan(exhausted), exhausted)
})

test('nextDemoAction ignores characters outside the demo alphabet', () => {
  const plan = {
    sessionId: 'session-1',
    pieceIndex: 1,
    actions: 'TX',
    index: 0,
  }

  assert.equal(nextDemoAction(plan), null)
  assert.equal(nextDemoAction(advanceDemoPlan(plan)), null)
})

test('nextDemoStep consumes the drop and its last-tick move in one step', () => {
  const plan = {
    sessionId: 'session-1',
    pieceIndex: 1,
    actions: 'RHR',
    index: 0,
  }

  const first = nextDemoStep(plan)
  assert.equal(first.action, 'R')
  assert.equal(first.lastTickAction, null)
  assert.equal(first.plan.index, 1)

  const second = nextDemoStep(first.plan)
  assert.equal(second.action, 'H')
  assert.equal(second.lastTickAction, 'R')
  assert.equal(second.plan.index, 3)

  // An exhausted log yields no action and no side-step; the demo keeps ticking.
  const exhausted = nextDemoStep(second.plan)
  assert.equal(exhausted.action, null)
  assert.equal(exhausted.lastTickAction, null)
  assert.equal(exhausted.plan.index, 3)
})

test('nextDemoStep keeps a non-lateral code out of the last-tick slot', () => {
  // A hard drop followed by another drop is not a side-step.
  const doubleDrop = nextDemoStep({
    sessionId: 'session-1',
    pieceIndex: 1,
    actions: 'HH',
    index: 0,
  })
  assert.equal(doubleDrop.action, 'H')
  assert.equal(doubleDrop.lastTickAction, null)
  assert.equal(doubleDrop.plan.index, 2)

  // Neither is a character outside the demo alphabet.
  const invalid = nextDemoStep({
    sessionId: 'session-1',
    pieceIndex: 1,
    actions: 'HX',
    index: 0,
  })
  assert.equal(invalid.action, 'H')
  assert.equal(invalid.lastTickAction, null)
  assert.equal(invalid.plan.index, 2)
})

test('resolveDemoPlan asks the engine once per piece and keeps the log', () => {
  const session = {
    id: 'session-1',
    nextPieceIndex: 1,
    board: emptyBoard(12, 22),
    activePiece: { key: '1Line', angle: 0, origin: { row: 1, column: 0 } },
  }
  let planned = 0
  const engine = {
    id: 'test',
    name: 'Test',
    description: 'Plans a fixed log.',
    plan() {
      planned += 1
      return 'LLH'
    },
  }

  const first = resolveDemoPlan(null, session, engine)
  const second = resolveDemoPlan(first, session, engine)

  assert.equal(planned, 1)
  assert.equal(first.actions, 'LLH')
  assert.equal(first.index, 0)
  assert.equal(second, first)
})

test('resolveDemoPlan re-plans when a new piece spawns or the session changes', () => {
  const session = {
    id: 'session-1',
    nextPieceIndex: 1,
    board: emptyBoard(12, 22),
    activePiece: { key: '1Line', angle: 0, origin: { row: 1, column: 0 } },
  }
  let planned = 0
  const engine = {
    id: 'test',
    name: 'Test',
    description: 'Counts plans.',
    plan() {
      planned += 1
      return 'H'
    },
  }

  const first = resolveDemoPlan(null, session, engine)
  const nextPiece = resolveDemoPlan(
    first,
    { ...session, nextPieceIndex: 2 },
    engine,
  )
  assert.equal(planned, 2)
  assert.equal(nextPiece.pieceIndex, 2)
  assert.equal(nextPiece.index, 0)

  const nextSession = resolveDemoPlan(
    first,
    { ...session, id: 'session-2' },
    engine,
  )
  assert.equal(nextSession.sessionId, 'session-2')
  assert.equal(planned, 3)
})

/** A `demoBoardStep` action carrying one code from the board's engine log. */
function demoBoardStepAction(board, action, overrides = {}) {
  return {
    type: 'demoStep',
    boardId: board.id,
    action,
    lastTickAction: null,
    sessionId: board.session.id,
    pieceIndex: board.session.nextPieceIndex,
    ...overrides,
  }
}

/** The catalog key of the piece at `index` in the shared game. */
function pieceKeyAt(game, index) {
  return getPieceDefinitionById(game.pieceIds[index]).key
}

function filledCellCount(board) {
  return board.rows.flat().filter((cell) => cell.isOccupied).length
}

test('a fresh state starts one demo board per registered engine', () => {
  const state = createInitialState(createDeps([0, 1]))
  const expectedEngines = demoEngineRegistry
    .list()
    .slice(0, MAX_DEMO_BOARDS)
    .map((engine) => engine.id)

  assert.deepEqual(expectedEngines, ['delphi5', 'random'])
  assert.deepEqual(
    state.demoBoards.map((board) => board.engineId),
    expectedEngines,
  )
  assert.deepEqual(
    state.demoBoards.map((board) => board.id),
    expectedEngines.map((_, index) => `demo-slot-${index + 1}`),
  )
  assert.equal(state.mainEngineId, 'random')

  const sessionIds = new Set([state.session.id])
  for (const board of state.demoBoards) {
    assert.equal(board.session.status, 'active')
    assert.equal(board.session.gameId, state.game.id)
    assert.equal(board.session.userId, state.session.userId)
    sessionIds.add(board.session.id)
  }
  assert.equal(sessionIds.size, 3)
})

test('every board draws from the one shared piece list', () => {
  const deps = createDeps([0, 1])
  const reducer = createGameReducer(deps)
  const playing = createInitialState(deps, 'playing')
  const [delphi, random] = playing.demoBoards

  // Boards on the same index hold the same active and next pieces.
  assert.equal(playing.session.nextPieceIndex, delphi.session.nextPieceIndex)
  assert.equal(playing.session.activePiece.key, delphi.session.activePiece.key)
  assert.equal(playing.session.nextPieceKey, delphi.session.nextPieceKey)
  assert.equal(delphi.session.activePiece.key, random.session.activePiece.key)

  // A demo-board lock extends the one list; the main session keeps matching it.
  // One Action-Tick step hard-drops and settles the piece.
  const stepped = reducer(playing, demoBoardStepAction(delphi, 'H'))
  const advanced = stepped.demoBoards[0]

  assert.equal(stepped.game.id, playing.game.id)
  assert.ok(stepped.game.pieceIds.length > playing.game.pieceIds.length)
  assert.equal(advanced.session.statistics.blocks, 1)
  assert.equal(
    stepped.session.activePiece.key,
    pieceKeyAt(stepped.game, stepped.session.nextPieceIndex - 1),
  )
  assert.equal(
    advanced.session.activePiece.key,
    pieceKeyAt(stepped.game, advanced.session.nextPieceIndex - 1),
  )
})

test('a main-board advance extends the shared list for the demo boards', () => {
  const deps = createDeps([0, 1])
  const reducer = createGameReducer(deps)
  const playing = createInitialState(deps, 'playing')

  const dropped = reducer(playing, { type: 'drop' })
  const settled = reducer(dropped, { type: 'drop' })

  assert.equal(settled.game.id, playing.game.id)
  assert.ok(settled.game.pieceIds.length > playing.game.pieceIds.length)
  for (const board of settled.demoBoards) {
    assert.equal(board.session.gameId, settled.game.id)
    assert.equal(
      board.session.activePiece.key,
      pieceKeyAt(settled.game, board.session.nextPieceIndex - 1),
    )
  }
})

test('starting a game starts fresh demo-board sessions in parallel', () => {
  const deps = createDeps([0, 1])
  const reducer = createGameReducer(deps)
  const demo = createInitialState(deps, 'demo')

  const started = reducer(demo, { type: 'start' })

  assert.equal(started.phase, 'playing')
  assert.notEqual(started.game.id, demo.game.id)
  started.demoBoards.forEach((board, index) => {
    assert.notEqual(board.session.id, demo.demoBoards[index].session.id)
    assert.equal(board.session.status, 'active')
    assert.equal(board.session.gameId, started.game.id)
    assert.equal(board.session.statistics.level, started.session.statistics.level)
  })
})

test('restarting replaces the demo-board sessions', () => {
  const deps = createDeps([0, 1])
  const reducer = createGameReducer(deps)
  const playing = createInitialState(deps, 'playing')
  const advanced = reducer(
    playing,
    demoBoardStepAction(playing.demoBoards[0], 'H'),
  )

  assert.equal(advanced.demoBoards[0].session.statistics.blocks, 1)
  assert.ok(filledCellCount(advanced.demoBoards[0].session.board) > 0)

  const restarted = reducer(advanced, { type: 'restart' })

  restarted.demoBoards.forEach((board, index) => {
    assert.notEqual(board.session.id, advanced.demoBoards[index].session.id)
    assert.equal(board.session.statistics.blocks, 0)
    assert.equal(board.session.statistics.score, 0)
    // A fresh demo board carries only its seeded mino.
    assert.equal(filledCellCount(board.session.board), 1)
  })
})

test('a demo session starts with one mino on the row before last', () => {
  const deps = createDeps([0, 1])
  const seeded = withFixedRandom(0.5, () => createInitialState(deps, 'demo'))
  const { width, height } = seeded.session.board
  const seedColumn = Math.floor(0.5 * width)

  const seedCells = seeded.session.board.rows
    .flat()
    .filter((cell) => cell.isOccupied)
  assert.equal(seedCells.length, 1)
  assert.equal(seedCells[0].row, height - 2)
  assert.equal(seedCells[0].column, seedColumn)
  // The seed is a settled mino, not a locked piece: it scores nothing.
  assert.equal(seeded.session.statistics.blocks, 0)
  assert.equal(seeded.session.statistics.score, 0)

  // Every rail demo board starts with its own seeded mino too.
  seeded.demoBoards.forEach((board) => {
    const occupied = board.session.board.rows
      .flat()
      .filter((cell) => cell.isOccupied)
    assert.equal(occupied.length, 1)
    assert.equal(occupied[0].row, height - 2)
  })
})

test('a player session starts on an empty main board', () => {
  const deps = createDeps([0, 1])
  const playing = withFixedRandom(0.5, () => createInitialState(deps, 'playing'))

  assert.equal(filledCellCount(playing.session.board), 0)
  // The rail keeps auto-playing, so its demo boards are still seeded.
  playing.demoBoards.forEach((board) => {
    assert.equal(filledCellCount(board.session.board), 1)
  })
})

test('the seeded mino stays on the demo board while it plays', () => {
  const deps = createDeps([0, 1])
  const reducer = createGameReducer(deps)
  const demo = withFixedRandom(0.5, () => createInitialState(deps, 'demo'))
  const { width, height } = demo.session.board
  const seedColumn = Math.floor(0.5 * width)

  let state = demo
  for (let step = 0; step < 6; step += 1) {
    state = reducer(state, demoStepAction(state, 'H'))
  }

  // Pieces have locked and the seeded mino is still on the board.
  assert.ok(state.session.statistics.blocks > 0)
  assert.equal(state.session.board.rows[height - 2][seedColumn].isOccupied, true)
})

test('a demo start after a player game still runs the swapped engine', () => {
  const deps = createDeps([0, 1])
  const reducer = createGameReducer(deps)
  const demo = createInitialState(deps, 'demo')
  const swapped = reducer(demo, { type: 'swapBoard', boardId: 'demo-slot-1' })

  const playing = reducer(swapped, { type: 'start' })
  assert.equal(playing.mainEngineId, 'delphi5')

  // The game-over screen hands back to the demo with the same engine.
  const over = { ...playing, phase: 'game-over', gameOverReady: true }
  const demoAgain = reducer(over, { type: 'demo' })

  assert.equal(demoAgain.phase, 'demo')
  assert.equal(demoAgain.mainEngineId, 'delphi5')
  // The fresh demo session starts with its seeded mino as well.
  assert.equal(filledCellCount(demoAgain.session.board), 1)
})

test('a level pick on the game-over screen starts a fresh board set', () => {
  const deps = createDeps([0, 1])
  const reducer = createGameReducer(deps)
  const over = {
    ...createInitialState(deps, 'game-over', settings({ startingLevel: 2 })),
    gameOverReady: true,
  }

  const started = reducer(over, { type: 'setStartingLevel', level: 6 })

  assert.equal(started.phase, 'playing')
  assert.equal(started.session.statistics.level, 6)
  assert.deepEqual(
    started.demoBoards.map((board) => board.session.statistics.level),
    [6, 6],
  )
  started.demoBoards.forEach((board, index) => {
    assert.notEqual(board.session.id, over.demoBoards[index].session.id)
  })
})

test('the attract demo restart leaves the demo boards untouched', () => {
  const deps = createDeps([0, 1])
  const reducer = createGameReducer(deps)
  const demo = createInitialState(deps, 'demo')
  const advanced = reducer(
    demo,
    demoBoardStepAction(demo.demoBoards[1], 'H'),
  )
  const over = {
    ...advanced,
    phase: 'demo-over',
    session: { ...advanced.session, status: 'game-over' },
  }

  const restarted = reducer(over, { type: 'demoRestart' })

  assert.equal(restarted.phase, 'demo')
  assert.notEqual(restarted.session.id, over.session.id)
  assert.equal(restarted.settings.startingLevel, demo.settings.startingLevel)
  // Same piece list and the same demo-board sessions: only the main demo restarted.
  assert.equal(restarted.game, advanced.game)
  assert.deepEqual(restarted.demoBoards, advanced.demoBoards)
})


test('a demo-board step advances only the addressed board', () => {
  const deps = createDeps([0, 1])
  const reducer = createGameReducer(deps)
  const demo = createInitialState(deps, 'demo')
  const [delphi] = demo.demoBoards

  const stepped = reducer(
    demo,
    demoBoardStepAction(demo.demoBoards[1], 'H'),
  )

  assert.notEqual(stepped.demoBoards[1].session, demo.demoBoards[1].session)
  assert.equal(stepped.demoBoards[1].session.statistics.actions.drops, 1)
  assert.equal(stepped.demoBoards[0], delphi)
  assert.equal(stepped.session, demo.session)
  assert.equal(stepped.phase, 'demo')
})

test('a stale demo-board step is ignored', () => {
  const deps = createDeps([0, 1])
  const reducer = createGameReducer(deps)
  const demo = createInitialState(deps, 'demo')
  const [delphi] = demo.demoBoards

  for (const overrides of [
    { sessionId: 'session-missing' },
    { pieceIndex: delphi.session.nextPieceIndex - 1 },
    { boardId: 'demo-missing' },
  ]) {
    assert.equal(
      reducer(demo, demoBoardStepAction(delphi, 'H', overrides)),
      demo,
    )
  }
})

test('a finished demo board keeps its final board and ignores steps', () => {
  const deps = createDeps([0, 1])
  const reducer = createGameReducer(deps)
  const demo = createInitialState(deps, 'demo')
  const finished = {
    ...demo,
    demoBoards: demo.demoBoards.map((board, index) =>
      index === 0
        ? { ...board, session: { ...board.session, status: 'game-over' } }
        : board,
    ),
  }

  const stepped = reducer(
    finished,
    demoBoardStepAction(finished.demoBoards[0], 'H'),
  )

  assert.equal(stepped, finished)
  assert.equal(stepped.demoBoards[0].session.status, 'game-over')
})

test('demo-board steps run through the engine at the board’s own level', () => {
  const deps = createDeps([0, 1])
  const reducer = createGameReducer(deps)
  const playing = createInitialState(deps, 'playing', settings({ startingLevel: 4 }))
  const board = playing.demoBoards[1]
  const { row, column } = board.session.activePiece.origin

  const stepped = reducer(
    playing,
    demoBoardStepAction(board, 'L'),
  )

  // One action plus one gravity tick, on that board's own session.
  assert.equal(stepped.demoBoards[1].session.activePiece.origin.row, row + 1)
  assert.equal(stepped.demoBoards[1].session.activePiece.origin.column, column - 1)
  assert.equal(stepped.demoBoards[1].session.statistics.actions.moves, 1)
  assert.equal(stepped.demoBoards[1].session.statistics.level, 4)
})

test('player actions leave the demo boards unchanged', () => {
  const deps = createDeps([0, 1])
  const reducer = createGameReducer(deps)
  const playing = createInitialState(deps, 'playing')

  for (const action of [
    { type: 'move', direction: 'left' },
    { type: 'rotate' },
    { type: 'tick' },
    { type: 'drop' },
    { type: 'pause' },
  ]) {
    assert.equal(reducer(playing, action).demoBoards, playing.demoBoards)
  }
})

test('a fresh session starts with zeroed action and per-piece statistics', () => {
  const state = createInitialState(createDeps([0]))

  assert.deepEqual(state.session.statistics.actions, {
    moves: 0,
    rotates: 0,
    drops: 0,
  })
  assert.equal(
    Object.keys(state.session.statistics.pieceCounts).length,
    PIECE_CATALOG.length,
  )
  for (const piece of PIECE_CATALOG) {
    assert.equal(state.session.statistics.pieceCounts[piece.key], 0)
  }
})

test('player actions increment the session action counts', () => {
  const deps = createDeps([6])
  const reducer = createGameReducer(deps)
  const playing = createInitialState(deps, 'playing')

  const moved = reducer(playing, { type: 'move', direction: 'left' })
  const movedRight = reducer(moved, { type: 'move', direction: 'right' })
  const rotated = reducer(movedRight, { type: 'rotate' })
  const dropped = reducer(rotated, { type: 'drop' })

  assert.deepEqual(dropped.session.statistics.actions, {
    moves: 2,
    rotates: 1,
    drops: 1,
  })
})

test('a settled piece increments its own per-piece count', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  const playing = createInitialState(deps, 'playing')

  // Hard drop lowers the piece but does not lock it on an empty board.
  const dropped = reducer(playing, { type: 'drop' })
  assert.equal(dropped.session.statistics.blocks, 0)
  assert.equal(dropped.session.statistics.pieceCounts['1Line'], 0)

  // The next tick cannot move down, so the piece locks and spawns the next.
  const settled = reducer(dropped, { type: 'tick' })
  assert.equal(settled.session.statistics.blocks, 1)
  assert.equal(settled.session.statistics.pieceCounts['1Line'], 1)

  for (const piece of PIECE_CATALOG) {
    if (piece.key !== '1Line') {
      assert.equal(settled.session.statistics.pieceCounts[piece.key], 0)
    }
  }
})

test('the demo accumulates statistics on its own session', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  const demo = createInitialState(deps, 'demo')

  const moved = reducer(demo, { type: 'move', direction: 'left' })
  assert.equal(moved.session.statistics.actions.moves, 1)

  const dropped = reducer(moved, { type: 'drop' })
  const settled = reducer(dropped, { type: 'tick' })

  assert.equal(settled.session.statistics.actions.drops, 1)
  assert.equal(settled.session.statistics.pieceCounts['1Line'], 1)
})

test('starting a new game resets the session statistics', () => {
  const deps = createDeps([6])
  const reducer = createGameReducer(deps)
  const playing = createInitialState(deps, 'playing')

  const moved = reducer(playing, { type: 'move', direction: 'right' })
  const rotated = reducer(moved, { type: 'rotate' })
  const dropped = reducer(rotated, { type: 'drop' })

  assert.deepEqual(dropped.session.statistics.actions, {
    moves: 1,
    rotates: 1,
    drops: 1,
  })

  const restarted = reducer(dropped, { type: 'restart' })
  assert.deepEqual(restarted.session.statistics.actions, {
    moves: 0,
    rotates: 0,
    drops: 0,
  })
  assert.equal(restarted.session.statistics.pieceCounts['4T'], 0)
})
test('changing the level during the attract demo retunes every demo board', () => {
  const deps = createDeps([0, 1])
  const reducer = createGameReducer(deps)
  const demo = createInitialState(deps, 'demo', settings({ startingLevel: 2 }))

  const retuned = reducer(demo, { type: 'setStartingLevel', level: 5 })

  assert.equal(retuned.phase, 'demo')
  assert.equal(retuned.settings.startingLevel, 5)
  assert.equal(retuned.session.statistics.level, 5)
  assert.deepEqual(
    retuned.demoBoards.map((board) => board.session.statistics.level),
    [5, 5],
  )
  // The same sessions keep playing; only their level changes.
  retuned.demoBoards.forEach((board, index) => {
    assert.equal(board.session.id, demo.demoBoards[index].session.id)
    assert.equal(
      board.session.board.height,
      demo.demoBoards[index].session.board.height,
    )
  })
})

test('raising the level during a player game leaves the demo boards alone', () => {
  const deps = createDeps([0, 1])
  const reducer = createGameReducer(deps)
  const playing = createInitialState(
    deps,
    'playing',
    settings({ startingLevel: 2 }),
  )

  const raised = reducer(playing, { type: 'setStartingLevel', level: 4 })

  assert.equal(raised.session.statistics.level, 4)
  assert.equal(raised.demoBoards, playing.demoBoards)
})

test('the level step keys retune the demo boards while the demo runs', () => {
  const deps = createDeps([0, 1])
  const reducer = createGameReducer(deps)
  const demo = createInitialState(deps, 'demo', settings({ startingLevel: 3 }))

  const raised = reducer(demo, { type: 'increaseLevel' })
  assert.deepEqual(
    raised.demoBoards.map((board) => board.session.statistics.level),
    [4, 4],
  )

  const lowered = reducer(raised, { type: 'decreaseLevel' })
  assert.deepEqual(
    lowered.demoBoards.map((board) => board.session.statistics.level),
    [3, 3],
  )
})

test('a level chosen during the demo delay retunes the demo boards at once', () => {
  const deps = createDeps([0, 1])
  const reducer = createGameReducer(deps)
  const demo = createInitialState(deps, 'demo', settings({ startingLevel: 2 }))
  const over = {
    ...demo,
    phase: 'demo-over',
    session: { ...demo.session, status: 'game-over' },
  }

  const chosen = reducer(over, { type: 'setStartingLevel', level: 7 })

  // The finished demo keeps the level it played at; the rail, still playing,
  // follows the chosen level immediately.
  assert.equal(chosen.phase, 'demo-over')
  assert.equal(chosen.session.statistics.level, 2)
  assert.deepEqual(
    chosen.demoBoards.map((board) => board.session.statistics.level),
    [7, 7],
  )
})


test('double-clicking a demo board exchanges it with the main board', () => {
  const deps = createDeps([0, 1])
  const reducer = createGameReducer(deps)
  const demo = createInitialState(deps, 'demo')
  const [delphi, random] = demo.demoBoards

  const swapped = reducer(demo, { type: 'swapBoard', boardId: delphi.id })

  // The clicked board's session and engine take over the main board.
  assert.equal(swapped.phase, 'demo')
  assert.equal(swapped.session, delphi.session)
  assert.equal(swapped.mainEngineId, 'delphi5')

  // The main board's session and engine land in that rail slot, under its id.
  const received = swapped.demoBoards[0]
  assert.equal(received.id, 'demo-slot-1')
  assert.equal(received.session, demo.session)
  assert.equal(received.engineId, 'random')

  // The other slot, the shared game, and the board order are untouched.
  assert.equal(swapped.demoBoards[1], random)
  assert.equal(swapped.demoBoards[1].engineId, 'random')
  assert.equal(swapped.game, demo.game)
  assert.deepEqual(
    swapped.demoBoards.map((board) => board.id),
    ['demo-slot-1', 'demo-slot-2'],
  )

  // A second swap with the same slot restores the original assignment.
  const back = reducer(swapped, { type: 'swapBoard', boardId: 'demo-slot-1' })
  assert.equal(back.session, demo.session)
  assert.equal(back.mainEngineId, 'random')
  assert.equal(back.demoBoards[0].session, delphi.session)
  assert.equal(back.demoBoards[0].engineId, 'delphi5')
})

test('a swap is ignored while a player game owns the main board', () => {
  const deps = createDeps([0, 1])
  const reducer = createGameReducer(deps)

  for (const phase of ['playing', 'paused', 'game-over']) {
    const state = createInitialState(deps, phase)
    assert.equal(
      reducer(state, { type: 'swapBoard', boardId: 'demo-slot-1' }),
      state,
    )
  }

  const demo = createInitialState(deps, 'demo')
  assert.equal(reducer(demo, { type: 'swapBoard', boardId: 'demo-slot-9' }), demo)
})

test('a finished demo board can be swapped in and restarts after the delay', () => {
  const deps = createDeps([0, 1])
  const reducer = createGameReducer(deps)
  const demo = createInitialState(deps, 'demo')
  const [delphi] = demo.demoBoards
  const finished = {
    ...demo,
    demoBoards: demo.demoBoards.map((board) =>
      board.id === delphi.id
        ? { ...board, session: { ...board.session, status: 'game-over' } }
        : board,
    ),
  }

  const swapped = reducer(finished, { type: 'swapBoard', boardId: delphi.id })

  assert.equal(swapped.phase, 'demo-over')
  assert.equal(swapped.session.status, 'game-over')
  assert.equal(swapped.mainEngineId, 'delphi5')
  // The active main session keeps playing in the freed slot.
  assert.equal(swapped.demoBoards[0].session, demo.session)
  assert.equal(swapped.demoBoards[0].session.status, 'active')
  assert.equal(swapped.demoBoards[0].engineId, 'random')

  const restarted = reducer(swapped, { type: 'demoRestart' })

  assert.equal(restarted.phase, 'demo')
  assert.equal(restarted.session.status, 'active')
  assert.notEqual(restarted.session.id, swapped.session.id)
  assert.equal(restarted.mainEngineId, 'delphi5')
  assert.equal(restarted.demoBoards[0].session.id, demo.session.id)
  assert.equal(
    restarted.demoBoards[0].session.nextPieceIndex,
    demo.session.nextPieceIndex,
  )
})

test('a fresh board set keeps the swapped engine and re-applies the rail slots', () => {
  const deps = createDeps([0, 1])
  const reducer = createGameReducer(deps)
  const demo = createInitialState(deps, 'demo')
  const swapped = reducer(demo, { type: 'swapBoard', boardId: 'demo-slot-1' })
  assert.equal(swapped.mainEngineId, 'delphi5')

  const started = reducer(swapped, { type: 'start' })
  assert.equal(started.phase, 'playing')
  // A player game must not throw the player's chosen demo engine away.
  assert.equal(started.mainEngineId, 'delphi5')
  assert.deepEqual(
    started.demoBoards.map((board) => board.engineId),
    ['delphi5', 'random'],
  )
  assert.deepEqual(
    started.demoBoards.map((board) => board.id),
    ['demo-slot-1', 'demo-slot-2'],
  )

  const restarted = reducer(swapped, { type: 'restart' })
  assert.equal(restarted.mainEngineId, 'delphi5')
  assert.deepEqual(
    restarted.demoBoards.map((board) => board.engineId),
    ['delphi5', 'random'],
  )
})

test('steps planned before a swap are ignored after it', () => {
  const deps = createDeps([0, 1])
  const reducer = createGameReducer(deps)
  const demo = createInitialState(deps, 'demo')
  const [delphi] = demo.demoBoards
  const mainStep = demoStepAction(demo, 'H')
  const slotStep = demoBoardStepAction(delphi, 'H')

  const swapped = reducer(demo, { type: 'swapBoard', boardId: delphi.id })

  // Neither plan matches the session that now sits at its old address.
  assert.equal(reducer(swapped, mainStep), swapped)
  assert.equal(reducer(swapped, slotStep), swapped)

  // A step planned for the swapped-in session advances only its slot.
  const forSlot = demoBoardStepAction(swapped.demoBoards[0], 'H')
  const stepped = reducer(swapped, forSlot)

  assert.notEqual(stepped.demoBoards[0].session, swapped.demoBoards[0].session)
  assert.equal(stepped.session, swapped.session)
  assert.equal(stepped.demoBoards[1], swapped.demoBoards[1])
})

test('a level change after a swap retunes the rail and keeps the engines', () => {
  const deps = createDeps([0, 1])
  const reducer = createGameReducer(deps)
  const demo = createInitialState(deps, 'demo', settings({ startingLevel: 2 }))
  const swapped = reducer(demo, { type: 'swapBoard', boardId: 'demo-slot-1' })

  const retuned = reducer(swapped, { type: 'setStartingLevel', level: 7 })

  assert.equal(retuned.phase, 'demo')
  assert.equal(retuned.session.statistics.level, 7)
  assert.deepEqual(
    retuned.demoBoards.map((board) => board.session.statistics.level),
    [7, 7],
  )
  assert.equal(retuned.mainEngineId, 'delphi5')
  assert.deepEqual(
    retuned.demoBoards.map((board) => board.engineId),
    ['random', 'random'],
  )
})

test('a swapped-in main demo still restarts after its game over delay', () => {
  const deps = createDeps([0, 1])
  const reducer = createGameReducer(deps)
  const demo = createInitialState(deps, 'demo')
  const swapped = reducer(demo, { type: 'swapBoard', boardId: 'demo-slot-1' })
  const over = {
    ...swapped,
    session: { ...swapped.session, status: 'game-over' },
  }

  const next = reducer(over, { type: 'tick' })

  assert.equal(next.phase, 'demo-over')
  assert.equal(next.mainEngineId, 'delphi5')
  assert.equal(next.session.id, swapped.session.id)
  // No player-facing cooldown is armed for the attract loop.
  assert.equal(next.gameOverReady, true)

  const restarted = reducer(next, { type: 'demoRestart' })

  assert.equal(restarted.phase, 'demo')
  assert.equal(restarted.session.status, 'active')
  assert.notEqual(restarted.session.id, swapped.session.id)
  assert.equal(restarted.mainEngineId, 'delphi5')
  assert.equal(restarted.demoBoards[0].session, swapped.demoBoards[0].session)
})

test('the main board names the player or the demo engine', () => {
  const deps = createDeps([0])
  const reducer = createGameReducer(deps)
  const playing = createInitialState(deps, 'playing')

  assert.equal(mainBoardName(playing), 'Player01')
  assert.equal(mainBoardName({ ...playing, phase: 'paused' }), 'Player01')
  assert.equal(mainBoardName({ ...playing, phase: 'game-over' }), 'Player01')

  const demo = createInitialState(deps, 'demo')
  assert.equal(mainBoardName(demo), 'Random')
  assert.equal(mainBoardName({ ...demo, phase: 'demo-over' }), 'Random')

  const swapped = reducer(demo, { type: 'swapBoard', boardId: 'demo-slot-1' })
  assert.equal(mainBoardName(swapped), 'Delphi 5')
})

