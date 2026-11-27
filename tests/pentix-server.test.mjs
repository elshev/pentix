import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import { v7 as uuidv7 } from 'uuid'

import { PentixGameLifecycle, startPentixServer } from '../apps/pentix-server/dist/server.js'
import { DemoRunService } from '../apps/pentix-server/dist/demo-runs.js'
import {
  DemoRunSnapshotSchema,
  ErrorResponseSchema,
  PentixGameSchema,
  PentixGameSessionSchema,
  UserListSchema,
  UserSchema,
} from '../apps/pentix-server/dist/api/schemas.js'
import {
  buildPentixRoutes,
  listPentixRouteKeys,
} from '../apps/pentix-server/dist/api/routes.js'
import { createInMemoryStorage } from '../apps/pentix-server/dist/storage/memory.js'
import { createSqliteStorage } from '../apps/pentix-server/dist/storage/sqlite.js'
import {
  createDemoSession,
  createPentixGame,
  createPentixGameSession,
  createUser,
  DEFAULT_DEMO_STARTING_LEVEL,
  demoEngineRegistry,
  PIECE_CATALOG,
  playDemoSession,
  replayPentixGameSession,
} from '../packages/pentix-core/dist/index.js'

const UNKNOWN_UUID_V7 = '018cc251-f400-7000-8000-000000000000'

/** The version prefix the tests expect. Kept local so a server change fails. */
const API_BASE_PATH = '/v1'

function apiPath(path) {
  return `${API_BASE_PATH}${path}`
}

function apiUrl(url, path) {
  return `${url}${apiPath(path)}`
}

function assertUuidV7(value) {
  assert.equal(typeof value, 'string')
  assert.match(
    value,
    /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  )
}

async function startTestServer() {
  return startPentixServer({
    host: '127.0.0.1',
    port: 0,
  })
}

async function post(url, path, body) {
  const options = { method: 'POST' }
  if (body !== undefined) {
    options.headers = { 'content-type': 'application/json' }
    options.body = typeof body === 'string' ? body : JSON.stringify(body)
  }

  return fetch(`${url}${path}`, options)
}

async function createTestUser(handle, name = 'Ada') {
  const response = await post(handle.url, apiPath('/users'), { name })
  assert.equal(response.status, 201)
  return response.json()
}

function assertValidPieceIds(pieceIds) {
  assert.equal(Array.isArray(pieceIds), true)
  assert.ok(pieceIds.length >= 2)
  assert.ok(
    pieceIds.every(
      (pieceId) =>
        Number.isInteger(pieceId) &&
        PIECE_CATALOG.some((piece) => piece.id === pieceId),
    ),
  )
}

function zeroPieceCounts() {
  return Object.fromEntries(PIECE_CATALOG.map((piece) => [piece.key, 0]))
}

function assertOpeningSession(session, gameId, userId) {
  assertUuidV7(session.id)
  assert.equal(session.userId, userId)
  assert.equal(session.gameId, gameId)
  assert.equal(session.status, 'active')
  assert.equal('sessionId' in session, false)
  assert.deepEqual([session.board.width, session.board.height], [12, 22])
  assert.equal(session.board.rows.flat().some((cell) => cell.isOccupied), false)
  assert.deepEqual(session.statistics, {
    score: 0,
    level: 1,
    clearedLines: 0,
    blocks: 0,
    actions: { moves: 0, rotates: 0, drops: 0 },
    pieceCounts: zeroPieceCounts(),
  })
  assert.deepEqual(session.activePiece.origin, { row: 1, column: 6 })
  assert.equal(session.activePiece.angle, 0)
  assert.equal(session.nextPieceIndex, 1)
  assert.ok(
    PIECE_CATALOG.some((piece) => piece.key === session.activePiece.key),
  )
  assert.ok(PIECE_CATALOG.some((piece) => piece.key === session.nextPieceKey))
}

test('PentixServer starts successfully', async () => {
  const handle = await startTestServer()

  try {
    assert.match(handle.url, /^http:\/\/127\.0\.0\.1:\d+$/)
  } finally {
    await handle.close()
  }
})

test('POST /games initializes independent games', async () => {
  const handle = await startTestServer()

  try {
    const firstResponse = await post(handle.url, apiPath('/games'))
    const firstGame = await firstResponse.json()
    const secondResponse = await post(handle.url, apiPath('/games'), {
      name: 'Evening game',
    })
    const secondGame = await secondResponse.json()

    assert.equal(firstResponse.status, 201)
    assert.equal(
      firstResponse.headers.get('content-type'),
      'application/json; charset=utf-8',
    )
    assertUuidV7(firstGame.id)
    assert.equal(firstGame.name, '')
    assert.deepEqual([firstGame.board.width, firstGame.board.height], [12, 22])
    assert.equal(
      firstGame.board.rows.flat().some((cell) => cell.isOccupied),
      false,
    )
    assertValidPieceIds(firstGame.pieceIds)

    assert.equal(secondResponse.status, 201)
    assertUuidV7(secondGame.id)
    assert.notEqual(secondGame.id, firstGame.id)
    assert.equal(secondGame.name, 'Evening game')
    assertValidPieceIds(secondGame.pieceIds)
  } finally {
    await handle.close()
  }
})

test('POST /games validates its optional JSON body', async () => {
  const handle = await startTestServer()

  try {
    for (const body of [
      '{invalid-json',
      JSON.stringify([]),
      JSON.stringify({ name: 42 }),
    ]) {
      const response = await post(handle.url, apiPath('/games'), body)
      const payload = await response.json()

      assert.equal(response.status, 400)
      assert.equal(typeof payload.message, 'string')
    }
  } finally {
    await handle.close()
  }
})

test('POST /games trims supplied names', async () => {
  const handle = await startTestServer()

  try {
    const trimmedResponse = await post(handle.url, apiPath('/games'), {
      name: '  Evening game  ',
    })
    const trimmedGame = await trimmedResponse.json()
    const blankResponse = await post(handle.url, apiPath('/games'), { name: '   ' })
    const blankGame = await blankResponse.json()

    assert.equal(trimmedResponse.status, 201)
    assert.equal(trimmedGame.name, 'Evening game')
    assert.equal(blankResponse.status, 201)
    assert.equal(blankGame.name, '')
  } finally {
    await handle.close()
  }
})

test('POST /games rejects oversized JSON bodies and keeps serving', async () => {
  const handle = await startTestServer()

  try {
    const oversizedBody = JSON.stringify({
      name: 'x'.repeat(1024 * 1024 + 16),
    })
    const oversizedResponse = await post(handle.url, apiPath('/games'), oversizedBody)

    assert.equal(oversizedResponse.status, 400)
    assert.equal(typeof (await oversizedResponse.json()).message, 'string')

    const followUpResponse = await post(handle.url, apiPath('/games'))
    assert.equal(followUpResponse.status, 201)
  } finally {
    await handle.close()
  }
})

test('POST /game-sessions creates a session with a new game by default', async () => {
  const handle = await startTestServer()

  try {
    const user = await createTestUser(handle)
    const response = await post(handle.url, apiPath('/game-sessions'), {
      userId: user.id,
    })
    const session = await response.json()

    assert.equal(response.status, 201)
    assert.equal(
      response.headers.get('content-type'),
      'application/json; charset=utf-8',
    )
    assertOpeningSession(session, session.gameId, user.id)
    assertUuidV7(session.gameId)
  } finally {
    await handle.close()
  }
})

test('POST /game-sessions reuses an existing game', async () => {
  const handle = await startTestServer()

  try {
    const user = await createTestUser(handle)
    const gameResponse = await post(handle.url, apiPath('/games'))
    const game = await gameResponse.json()
    const sessionResponse = await post(handle.url, apiPath('/game-sessions'), {
      userId: user.id,
      gameId: game.id,
    })
    const session = await sessionResponse.json()

    assert.equal(sessionResponse.status, 201)
    assertOpeningSession(session, game.id, user.id)
    assert.equal(
      session.activePiece.key,
      PIECE_CATALOG.find((piece) => piece.id === game.pieceIds[0]).key,
    )
    assert.equal(
      session.nextPieceKey,
      PIECE_CATALOG.find((piece) => piece.id === game.pieceIds[1]).key,
    )
  } finally {
    await handle.close()
  }
})

test('POST /game-sessions treats null and empty game IDs as absent', async () => {
  const handle = await startTestServer()

  try {
    const user = await createTestUser(handle)
    for (const body of [
      { userId: user.id, gameId: null },
      { userId: user.id, gameId: '   ' },
    ]) {
      const response = await post(handle.url, apiPath('/game-sessions'), body)
      const session = await response.json()

      assert.equal(response.status, 201)
      assertOpeningSession(session, session.gameId, user.id)
      assertUuidV7(session.gameId)
    }
  } finally {
    await handle.close()
  }
})

test('POST /game-sessions creates distinct independent sessions', async () => {
  const handle = await startTestServer()

  try {
    const user = await createTestUser(handle)
    const firstResponse = await post(handle.url, apiPath('/game-sessions'), {
      userId: user.id,
    })
    const secondResponse = await post(handle.url, apiPath('/game-sessions'), {
      userId: user.id,
    })
    const firstSession = await firstResponse.json()
    const secondSession = await secondResponse.json()

    assert.notEqual(firstSession.id, secondSession.id)
    assert.notEqual(firstSession.gameId, secondSession.gameId)
    assert.equal(
      firstSession.board.rows.flat().some((cell) => cell.isOccupied),
      false,
    )
    assert.equal(
      secondSession.board.rows.flat().some((cell) => cell.isOccupied),
      false,
    )
  } finally {
    await handle.close()
  }
})

test('POST /game-sessions validates body, user, and game identity', async () => {
  const handle = await startTestServer()

  try {
    const invalidBodies = [
      '{invalid-json',
      JSON.stringify([]),
      JSON.stringify({ gameId: 42 }),
      JSON.stringify({ gameId: 'not-a-uuid' }),
      JSON.stringify({ gameId: '018cc251-f400-4000-8000-000000000000' }),
      JSON.stringify({}),
      JSON.stringify({ userId: null }),
      JSON.stringify({ userId: 42 }),
      JSON.stringify({ userId: 'not-a-uuid' }),
    ]

    for (const body of invalidBodies) {
      const response = await post(handle.url, apiPath('/game-sessions'), body)
      assert.equal(response.status, 400)
    }

    const user = await createTestUser(handle)

    const unknownUserResponse = await post(handle.url, apiPath('/game-sessions'), {
      userId: UNKNOWN_UUID_V7,
    })
    assert.equal(unknownUserResponse.status, 404)

    const unknownGameResponse = await post(handle.url, apiPath('/game-sessions'), {
      userId: user.id,
      gameId: UNKNOWN_UUID_V7,
    })
    assert.equal(unknownGameResponse.status, 404)
  } finally {
    await handle.close()
  }
})

test('POST next-piece promotes the preview and advances retained state', async () => {
  const handle = await startTestServer()

  try {
    const user = await createTestUser(handle)
    const sessionResponse = await post(handle.url, apiPath('/game-sessions'), {
      userId: user.id,
    })
    const session = await sessionResponse.json()

    const firstResponse = await post(
      handle.url,
      apiPath(`/game-sessions/${session.id}/next-piece`),
    )
    const firstAdvance = await firstResponse.json()

    assert.equal(firstResponse.status, 200)
    assert.equal(firstAdvance.id, session.id)
    assert.equal(firstAdvance.gameId, session.gameId)
    assert.equal(firstAdvance.userId, user.id)
    assert.equal(firstAdvance.activePiece.key, session.nextPieceKey)
    assert.equal(firstAdvance.activePiece.angle, 0)
    assert.deepEqual(firstAdvance.activePiece.origin, {
      row: 1,
      column: 6,
    })
    assert.equal(firstAdvance.nextPieceIndex, 2)
    assert.ok(
      PIECE_CATALOG.some(
        (piece) => piece.key === firstAdvance.nextPieceKey,
      ),
    )
    assert.deepEqual(firstAdvance.statistics, session.statistics)
    assert.deepEqual(firstAdvance.board, session.board)

    const secondResponse = await post(
      handle.url,
      apiPath(`/game-sessions/${session.id}/next-piece`),
    )
    const secondAdvance = await secondResponse.json()

    assert.equal(secondResponse.status, 200)
    assert.equal(secondAdvance.activePiece.key, firstAdvance.nextPieceKey)
    assert.equal(secondAdvance.nextPieceIndex, 3)
  } finally {
    await handle.close()
  }
})

test('POST next-piece rejects malformed and unknown session IDs', async () => {
  const handle = await startTestServer()

  try {
    const malformedResponse = await post(
      handle.url,
      apiPath('/game-sessions/not-a-uuid/next-piece'),
    )
    const unknownResponse = await post(
      handle.url,
      apiPath(`/game-sessions/${UNKNOWN_UUID_V7}/next-piece`),
    )

    assert.equal(malformedResponse.status, 400)
    assert.equal(unknownResponse.status, 404)
  } finally {
    await handle.close()
  }
})

test('sessions sharing one game advance independently', async () => {
  const handle = await startTestServer()

  try {
    const user = await createTestUser(handle)
    const game = await (await post(handle.url, apiPath('/games'))).json()
    const firstSession = await (
      await post(handle.url, apiPath('/game-sessions'), {
        userId: user.id,
        gameId: game.id,
      })
    ).json()
    const secondSession = await (
      await post(handle.url, apiPath('/game-sessions'), {
        userId: user.id,
        gameId: game.id,
      })
    ).json()

    assert.equal(firstSession.gameId, game.id)
    assert.equal(secondSession.gameId, game.id)
    assert.equal(firstSession.activePiece.key, secondSession.activePiece.key)
    assert.equal(firstSession.nextPieceKey, secondSession.nextPieceKey)

    const firstAdvance = await (
      await post(handle.url, apiPath(`/game-sessions/${firstSession.id}/next-piece`))
    ).json()
    const secondAdvance = await (
      await post(handle.url, apiPath(`/game-sessions/${secondSession.id}/next-piece`))
    ).json()

    assert.equal(firstAdvance.nextPieceIndex, 2)
    assert.equal(secondAdvance.nextPieceIndex, 2)
    assert.equal(firstAdvance.activePiece.key, firstSession.nextPieceKey)
    assert.equal(secondAdvance.activePiece.key, secondSession.nextPieceKey)
    assert.equal(firstAdvance.nextPieceKey, secondAdvance.nextPieceKey)
  } finally {
    await handle.close()
  }
})

test('server context makes identities and piece selection deterministic', async () => {
  const createdIds = [
    '018cc251-f400-7000-8000-000000000001',
    '018cc251-f400-7000-8000-000000000002',
    '018cc251-f400-7000-8000-000000000003',
    '018cc251-f400-7000-8000-000000000004',
    '018cc251-f400-7000-8000-000000000005',
  ]
  const handle = await startPentixServer({
    host: '127.0.0.1',
    port: 0,
    context: {
      createId: () => createdIds.shift(),
      selectPieceId: () => 3,
      demoEngines: [],
    },
  })

  try {
    const user = await (await post(handle.url, apiPath('/users'), { name: 'Ada' })).json()
    const game = await (await post(handle.url, apiPath('/games'))).json()
    const newGameSession = await (
      await post(handle.url, apiPath('/game-sessions'), { userId: user.id })
    ).json()
    const reusedGameSession = await (
      await post(handle.url, apiPath('/game-sessions'), {
        userId: user.id,
        gameId: game.id,
      })
    ).json()

    assert.equal(user.id, '018cc251-f400-7000-8000-000000000001')
    assert.equal(game.id, '018cc251-f400-7000-8000-000000000002')
    assert.deepEqual(game.pieceIds, [3, 3])
    assert.equal(newGameSession.id, '018cc251-f400-7000-8000-000000000004')
    assert.equal(newGameSession.gameId, '018cc251-f400-7000-8000-000000000003')
    assert.equal(newGameSession.userId, user.id)
    assert.equal(reusedGameSession.id, '018cc251-f400-7000-8000-000000000005')
    assert.equal(reusedGameSession.gameId, game.id)
    assert.equal(reusedGameSession.userId, user.id)
    assert.equal(reusedGameSession.activePiece.key, '3Corner')
    assert.equal(reusedGameSession.nextPieceKey, '3Corner')

    const advanced = await (
      await post(handle.url, apiPath(`/game-sessions/${reusedGameSession.id}/next-piece`))
    ).json()

    assert.equal(advanced.activePiece.key, '3Corner')
    assert.equal(advanced.nextPieceKey, '3Corner')
    assert.equal(advanced.nextPieceIndex, 2)
  } finally {
    await handle.close()
  }
})

test('games and sessions are scoped to their server instance', async () => {
  const firstHandle = await startTestServer()
  const secondHandle = await startTestServer()

  try {
    const gameResponse = await post(firstHandle.url, apiPath('/games'))
    const game = await gameResponse.json()
    const user = await createTestUser(secondHandle)
    const sessionResponse = await post(secondHandle.url, apiPath('/game-sessions'), {
      userId: user.id,
      gameId: game.id,
    })

    assert.equal(sessionResponse.status, 404)
  } finally {
    await firstHandle.close()
    await secondHandle.close()
  }
})

test('POST /users creates and retains a user', async () => {
  const handle = await startTestServer()

  try {
    const response = await post(handle.url, apiPath('/users'), { name: '  Ada  ' })
    const user = await response.json()

    assert.equal(response.status, 201)
    assert.equal(
      response.headers.get('content-type'),
      'application/json; charset=utf-8',
    )
    assertUuidV7(user.id)
    assert.equal(user.name, 'Ada')
  } finally {
    await handle.close()
  }
})

test('POST /users validates its name', async () => {
  const handle = await startTestServer()

  try {
    for (const body of [
      '{invalid-json',
      JSON.stringify([]),
      JSON.stringify({}),
      JSON.stringify({ name: 42 }),
      JSON.stringify({ name: '' }),
      JSON.stringify({ name: '   ' }),
    ]) {
      const response = await post(handle.url, apiPath('/users'), body)
      assert.equal(response.status, 400)
    }
  } finally {
    await handle.close()
  }
})

test('POST /users rejects duplicate names case-insensitively', async () => {
  const handle = await startTestServer()

  try {
    await createTestUser(handle, 'Ada')
    const duplicateResponse = await post(handle.url, apiPath('/users'), {
      name: '  ada  ',
    })

    assert.equal(duplicateResponse.status, 409)

    const listResponse = await fetch(apiUrl(handle.url, '/users'))
    const payload = await listResponse.json()
    assert.equal(
      payload.users.filter((user) => user.type === 'human').length,
      1,
    )
  } finally {
    await handle.close()
  }
})

test('GET /users lists retained human and AI users', async () => {
  const engineCount = demoEngineRegistry.list().length
  const handle = await startTestServer()

  try {
    const seededResponse = await fetch(apiUrl(handle.url, '/users'))
    const seededPayload = await seededResponse.json()
    assert.equal(seededResponse.status, 200)
    assert.equal(seededPayload.users.length, engineCount)
    assert.equal(
      seededPayload.users.every((user) => user.type === 'ai'),
      true,
    )
    assert.deepEqual(
      seededPayload.users.map((user) => user.engineId),
      demoEngineRegistry.list().map((engine) => engine.id),
    )

    await createTestUser(handle, 'Ada')
    await createTestUser(handle, 'Grace')

    const listResponse = await fetch(apiUrl(handle.url, '/users'))
    const payload = await listResponse.json()
    assert.equal(listResponse.status, 200)
    assert.equal(
      payload.users.filter((user) => user.type === 'human').length,
      2,
    )
    assert.deepEqual(
      payload.users
        .filter((user) => user.type === 'human')
        .map((user) => user.name)
        .sort(),
      ['Ada', 'Grace'],
    )
  } finally {
    await handle.close()
  }
})

test('GET /users/{id} returns a user or rejects invalid ids', async () => {
  const handle = await startTestServer()

  try {
    const user = await createTestUser(handle, 'Ada')

    const foundResponse = await fetch(apiUrl(handle.url, `/users/${user.id}`))
    assert.equal(foundResponse.status, 200)
    assert.deepEqual(await foundResponse.json(), user)

    const malformedResponse = await fetch(apiUrl(handle.url, '/users/not-a-uuid'))
    assert.equal(malformedResponse.status, 400)

    const unknownResponse = await fetch(apiUrl(handle.url, `/users/${UNKNOWN_UUID_V7}`))
    assert.equal(unknownResponse.status, 404)
  } finally {
    await handle.close()
  }
})

test('PentixServer returns valid IPv6 URLs', async (t) => {
  let handle

  try {
    handle = await startPentixServer({
      host: '::1',
      port: 0,
    })
  } catch (error) {
    if (error?.code === 'EADDRNOTAVAIL' || error?.code === 'EAFNOSUPPORT') {
      t.skip('IPv6 loopback is unavailable in this environment')
      return
    }

    throw error
  }

  try {
    assert.match(handle.url, /^http:\/\/\[[^\]]+\]:\d+$/)

    const response = await fetch(handle.url)
    assert.equal(response.status, 404)
  } finally {
    await handle.close()
  }
})

test('POST /game-sessions/{id}/move shifts the active piece', async () => {
  const handle = await startPentixServer({
    host: '127.0.0.1',
    port: 0,
    context: { selectPieceId: () => 3 },
  })

  try {
    const user = await createTestUser(handle)
    const session = await (
      await post(handle.url, apiPath('/game-sessions'), { userId: user.id })
    ).json()

    const response = await post(handle.url, apiPath(`/game-sessions/${session.id}/move`), {
      direction: 'right',
    })
    const moved = await response.json()

    assert.equal(response.status, 200)
    assert.equal(moved.id, session.id)
    assert.equal(
      moved.activePiece.origin.column,
      session.activePiece.origin.column + 1,
    )
    assert.equal(moved.statistics.actions.moves, 1)
  } finally {
    await handle.close()
  }
})

test('POST /game-sessions/{id}/rotate rotates a full-rotation piece', async () => {
  const handle = await startPentixServer({
    host: '127.0.0.1',
    port: 0,
    context: { selectPieceId: () => 3 },
  })

  try {
    const user = await createTestUser(handle)
    const session = await (
      await post(handle.url, apiPath('/game-sessions'), { userId: user.id })
    ).json()
    assert.equal(session.activePiece.key, '3Corner')

    const response = await post(
      handle.url,
      apiPath(`/game-sessions/${session.id}/rotate`),
      { direction: 'clockwise' },
    )
    const rotated = await response.json()

    assert.equal(response.status, 200)
    assert.equal(rotated.activePiece.angle, 270)
    assert.equal(rotated.statistics.actions.rotates, 1)
  } finally {
    await handle.close()
  }
})

test('POST /game-sessions/{id}/tick moves the piece down', async () => {
  const handle = await startTestServer()

  try {
    const user = await createTestUser(handle)
    const session = await (
      await post(handle.url, apiPath('/game-sessions'), { userId: user.id })
    ).json()

    const response = await post(handle.url, apiPath(`/game-sessions/${session.id}/tick`))
    const ticked = await response.json()

    assert.equal(response.status, 200)
    assert.equal(ticked.activePiece.origin.row, session.activePiece.origin.row + 1)
    assert.deepEqual(ticked.statistics.actions, session.statistics.actions)
  } finally {
    await handle.close()
  }
})

test('POST /game-sessions/{id}/drop defers locking until the next tick', async () => {
  const handle = await startPentixServer({
    host: '127.0.0.1',
    port: 0,
    context: { selectPieceId: () => 3 },
  })

  try {
    const user = await createTestUser(handle)
    const session = await (
      await post(handle.url, apiPath('/game-sessions'), { userId: user.id })
    ).json()

    const dropResponse = await post(handle.url, apiPath(`/game-sessions/${session.id}/drop`))
    const dropped = await dropResponse.json()

    assert.equal(dropResponse.status, 200)
    assert.equal(dropped.status, 'active')
    assert.equal(dropped.activePiece.origin.row, 21)
    assert.equal(
      dropped.board.rows.flat().some((cell) => cell.isOccupied),
      false,
    )
    assert.ok(dropped.statistics.score > 0)
    assert.equal(dropped.statistics.actions.drops, 1)

    const tickResponse = await post(handle.url, apiPath(`/game-sessions/${session.id}/tick`))
    const settled = await tickResponse.json()

    assert.equal(tickResponse.status, 200)
    assert.equal(settled.status, 'active')
    assert.equal(settled.statistics.blocks, 1)
    assert.equal(settled.statistics.pieceCounts[session.activePiece.key], 1)
    assert.equal(
      settled.board.rows.flat().some((cell) => cell.isOccupied),
      true,
    )
  } finally {
    await handle.close()
  }
})

test('gameplay endpoints validate direction and unknown sessions', async () => {
  const handle = await startTestServer()

  try {
    const user = await createTestUser(handle)
    const session = await (
      await post(handle.url, apiPath('/game-sessions'), { userId: user.id })
    ).json()

    const badMove = await post(handle.url, apiPath(`/game-sessions/${session.id}/move`), {
      direction: 'up',
    })
    assert.equal(badMove.status, 400)

    const missingDirection = await post(
      handle.url,
      apiPath(`/game-sessions/${session.id}/rotate`),
      {},
    )
    assert.equal(missingDirection.status, 400)

    const unknownTick = await post(
      handle.url,
      apiPath(`/game-sessions/${UNKNOWN_UUID_V7}/tick`),
    )
    assert.equal(unknownTick.status, 404)
  } finally {
    await handle.close()
  }
})

async function createTempDataFile() {
  const directory = await mkdtemp(path.join(tmpdir(), 'pentix-storage-'))
  return {
    directory,
    dataFile: path.join(directory, 'pentix.db'),
    cleanup: () => rm(directory, { recursive: true, force: true }),
  }
}

test('in-memory storage keeps nothing across instances', async () => {
  const storage = createInMemoryStorage()
  const user = createUser({ id: uuidv7(), name: 'Ada' })
  await storage.users.create(user)

  assert.deepEqual(await storage.users.load(), { users: [user] })

  const other = createInMemoryStorage()
  try {
    assert.deepEqual(await other.users.load(), { users: [] })
    assert.deepEqual(await other.games.load(), { games: [] })
    assert.deepEqual(await other.sessions.load(), { sessions: [] })
  } finally {
    storage.close()
    other.close()
  }
})

test('SQLite repositories round-trip users, games, and session logs', async () => {
  const temp = await createTempDataFile()
  const game = createPentixGame({
    id: uuidv7(),
    name: 'Round trip',
    selectPieceId: () => 3,
  })
  const extendedGame = {
    ...game,
    pieceIds: [...game.pieceIds, 5],
  }
  const user = createUser({ id: uuidv7(), name: 'Ada' })
  const log = {
    sessionId: uuidv7(),
    userId: user.id,
    gameId: game.id,
    pieces: [{ pieceId: 3, actions: 'RC' }],
  }

  const storage = createSqliteStorage({ dataFile: temp.dataFile })
  try {
    await storage.users.create(user)
    await storage.games.create(game)
    await storage.sessions.create(log)
    await storage.games.save(extendedGame)
  } finally {
    storage.close()
  }

  const reopened = createSqliteStorage({ dataFile: temp.dataFile })
  try {
    assert.deepEqual(await reopened.users.load(), { users: [user] })
    assert.deepEqual(await reopened.users.findById(user.id), user)
    assert.deepEqual(await reopened.users.list(), [user])

    const games = await reopened.games.load()
    assert.deepEqual(games, { games: [extendedGame] })
    assert.deepEqual(await reopened.games.findById(game.id), extendedGame)
    // the piece sequence survives as one ordered field
    assert.deepEqual(games.games[0].pieceIds, extendedGame.pieceIds)

    // sessions are stored as piece ID + ordered actions (not a full snapshot)
    const sessions = await reopened.sessions.load()
    assert.deepEqual(sessions, { sessions: [log] })
  } finally {
    reopened.close()
    await temp.cleanup()
  }
})
test('a new SQLite file uses WAL and normal synchronization', async () => {
  const temp = await createTempDataFile()
  const storage = createSqliteStorage({ dataFile: temp.dataFile })

  try {
    assert.deepEqual(storage.pragmas(), {
      journalMode: 'wal',
      synchronous: 1,
    })

    const database = new DatabaseSync(temp.dataFile)
    try {
      assert.equal(
        database.prepare('PRAGMA journal_mode').get().journal_mode,
        'wal',
      )
    } finally {
      database.close()
    }
  } finally {
    storage.close()
    await temp.cleanup()
  }
})

test('a reopen keeps the WAL settings and the saved rows', async () => {
  const temp = await createTempDataFile()
  const game = createPentixGame({
    id: uuidv7(),
    name: 'WAL round trip',
    selectPieceId: () => 3,
  })
  const log = {
    sessionId: uuidv7(),
    userId: uuidv7(),
    gameId: game.id,
    level: 9,
    seedColumn: 4,
    pieces: [{ pieceId: 3, actions: 'HT' }],
  }

  const first = createSqliteStorage({ dataFile: temp.dataFile })
  try {
    await first.games.create(game)
    await first.sessions.create(log)
    assert.deepEqual(first.pragmas(), {
      journalMode: 'wal',
      synchronous: 1,
    })
  } finally {
    first.close()
  }

  const second = createSqliteStorage({ dataFile: temp.dataFile })
  try {
    assert.deepEqual(second.pragmas(), {
      journalMode: 'wal',
      synchronous: 1,
    })
    assert.deepEqual(await second.games.load(), { games: [game] })
    assert.deepEqual(await second.sessions.load(), { sessions: [log] })
  } finally {
    second.close()
    await temp.cleanup()
  }
})

test('an older rollback-journal file moves to WAL and keeps its rows', async () => {
  const temp = await createTempDataFile()
  const userId = uuidv7()
  const database = new DatabaseSync(temp.dataFile)
  database.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'human',
      engine_id TEXT
    );
  `)
  database.prepare('INSERT INTO users (id, name) VALUES (?, ?)').run(userId, 'Ada')
  assert.equal(
    database.prepare('PRAGMA journal_mode').get().journal_mode,
    'delete',
  )
  database.close()

  const storage = createSqliteStorage({ dataFile: temp.dataFile })
  try {
    assert.equal(storage.pragmas().journalMode, 'wal')
    assert.deepEqual((await storage.users.load()).users, [
      { id: userId, name: 'Ada', type: 'human' },
    ])
  } finally {
    storage.close()
    await temp.cleanup()
  }
})



test('a created user, game, and session survive a server restart with SQLite storage', async () => {
  const temp = await createTempDataFile()
  const storage = createSqliteStorage({ dataFile: temp.dataFile })
  const first = await startPentixServer({
    host: '127.0.0.1',
    port: 0,
    context: { storage, selectPieceId: () => 3 },
  })

  let user
  let session
  let moved
  try {
    user = await createTestUser(first, 'Grace')
    session = await (
      await post(first.url, apiPath('/game-sessions'), { userId: user.id })
    ).json()

    moved = await (
      await post(first.url, apiPath(`/game-sessions/${session.id}/move`), {
        direction: 'right',
      })
    ).json()
    assert.equal(moved.activePiece.origin.column, session.activePiece.origin.column + 1)
  } finally {
    await first.close()
    storage.close()
  }

  const reopenedStorage = createSqliteStorage({ dataFile: temp.dataFile })
  const second = await startPentixServer({
    host: '127.0.0.1',
    port: 0,
    context: { storage: reopenedStorage, selectPieceId: () => 3 },
  })

  try {
    const usersResponse = await fetch(apiUrl(second.url, '/users'))
    assert.equal(usersResponse.status, 200)
    const listedUsers = await usersResponse.json()
    assert.deepEqual(
      listedUsers.users.filter((entry) => entry.type === 'human'),
      [user],
    )

    const userResponse = await fetch(apiUrl(second.url, `/users/${user.id}`))
    assert.deepEqual(await userResponse.json(), user)

    // The recorded move is recovered by replaying the action log after restart.
    const movedAgain = await (
      await post(second.url, apiPath(`/game-sessions/${session.id}/move`), {
        direction: 'right',
      })
    ).json()
    assert.equal(
      movedAgain.activePiece.origin.column,
      moved.activePiece.origin.column + 1,
    )
  } finally {
    await second.close()
    reopenedStorage.close()
    await temp.cleanup()
  }
})

test('a missing database file starts empty', async () => {
  const temp = await createTempDataFile()
  const dataFile = path.join(temp.directory, 'nested', 'pentix.db')
  const storage = createSqliteStorage({ dataFile })
  const handle = await startPentixServer({
    host: '127.0.0.1',
    port: 0,
    context: { storage, demoEngines: [] },
  })

  try {
    const response = await fetch(apiUrl(handle.url, '/users'))
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { users: [] })
  } finally {
    await handle.close()
    storage.close()
    await temp.cleanup()
  }
})

test('a corrupt database file fails startup with a clear error', async () => {
  const temp = await createTempDataFile()

  try {
    await writeFile(temp.dataFile, 'this is not a SQLite database')
    assert.throws(
      () => createSqliteStorage({ dataFile: temp.dataFile }),
      /is not a readable SQLite database/,
    )
    assert.equal(existsSync(temp.dataFile), true)
  } finally {
    await temp.cleanup()
  }
})

test('SQLite session storage rejects actions outside the alphabet', async () => {
  const temp = await createTempDataFile()
  const storage = createSqliteStorage({ dataFile: temp.dataFile })

  try {
    await storage.sessions.create({
      sessionId: uuidv7(),
      userId: 'user-1',
      gameId: 'game-1',
      pieces: [{ pieceId: 3, actions: 'RS' }],
    })
  } finally {
    storage.close()
  }

  const reopened = createSqliteStorage({ dataFile: temp.dataFile })
  try {
    await assert.rejects(reopened.sessions.load(), /invalid/)
  } finally {
    reopened.close()
    await temp.cleanup()
  }
})

// --- Demo runs ---------------------------------------------------------------

/** A stub demo engine that always plans the same log. */
function stubDemoEngine(id, plan) {
  return { id, name: `Engine ${id}`, description: 'stub engine', plan }
}

/** Options for a direct service test: in-memory storage and AI user ids. */
function demoRunOptions(overrides = {}) {
  return {
    selectPieceId: () => 0,
    seedColumn: 0,
    storage: createInMemoryStorage(),
    resolveEngineUserId: (engineId) => `ai-${engineId}`,
    ...overrides,
  }
}

/** The statistics one demo game with the same seeds produces. */
function expectedDemoGameStats(plan, selectPieceId = () => 0) {
  const game = createPentixGame({ id: 'expected-game', selectPieceId })
  const session = createDemoSession({
    id: 'expected-session',
    userId: 'demo',
    game,
    level: DEFAULT_DEMO_STARTING_LEVEL,
    seedColumn: 0,
  })

  return playDemoSession({
    engine: stubDemoEngine('expected', plan),
    game,
    session,
    selectPieceId,
  }).session.statistics
}

async function getJson(url, path) {
  const response = await fetch(`${url}${path}`)
  return { status: response.status, body: await response.json() }
}

async function waitForDemoRun(url, runId, status = 'completed') {
  for (let attempt = 0; attempt < 400; attempt += 1) {
    const { status: code, body } = await getJson(url, apiPath(`/demo-runs/${runId}`))
    assert.equal(code, 200)
    if (body.status === status) {
      return body
    }
    await new Promise((resolve) => setTimeout(resolve, 5))
  }

  assert.fail(`demo run ${runId} did not reach ${status}`)
}

async function startDemoServer(context = {}) {
  return startPentixServer({
    host: '127.0.0.1',
    port: 0,
    context: {
      demoEngines: [
        stubDemoEngine('alpha', () => 'H'),
        stubDemoEngine('beta', () => 'H'),
      ],
      selectPieceId: () => 0,
      demoStartingLevel: DEFAULT_DEMO_STARTING_LEVEL,
      ...context,
    },
  })
}

test('a demo run plays every engine and completes', async () => {
  let ids = 0
  const service = new DemoRunService(
    () => `demo-${ids++}`,
    demoRunOptions({
      engines: [
        stubDemoEngine('alpha', () => 'H'),
        stubDemoEngine('beta', () => 'H'),
      ],
      clock: () => 0,
    }),
  )

  const run = service.startRun(2)
  assert.equal(run.status, 'queued')
  assert.deepEqual(run.engines, ['alpha', 'beta'])
  assert.equal(run.gameCount, 2)
  assert.equal(run.completedGameCount, 0)
  assert.deepEqual(run.standings, [])

  await service.whenIdle()

  const done = service.getRun(run.id)
  assert.equal(done.status, 'completed')
  assert.equal(done.completedGameCount, 2)
  assert.deepEqual(
    done.standings.map((line) => line.engineId),
    ['alpha', 'beta'],
  )
  assert.equal(service.getRun('missing-run'), undefined)
})

test('demo standings sum the games and rank equal engines by id', async () => {
  const expected = expectedDemoGameStats(() => 'H')
  let ids = 0
  let read = 0
  const service = new DemoRunService(
    () => `demo-${ids++}`,
    demoRunOptions({
      engines: [
        stubDemoEngine('beta', () => 'H'),
        stubDemoEngine('alpha', () => 'H'),
      ],
      clock: () => read++,
    }),
  )

  const run = service.startRun(2)
  await service.whenIdle()

  const done = service.getRun(run.id)
  assert.deepEqual(
    done.standings.map((line) => line.engineId),
    ['alpha', 'beta'],
  )

  for (const line of done.standings) {
    assert.equal(line.name, `Engine ${line.engineId}`)
    assert.equal(line.points, expected.score * 2)
    assert.equal(line.lines, expected.clearedLines * 2)
    assert.equal(line.pieces, expected.blocks * 2)
    assert.equal(line.playingTimeMs, line.pieces)
  }
})

test('a throwing planner fails the run without standings', async () => {
  const service = new DemoRunService(
    () => 'demo-1',
    demoRunOptions({
      engines: [
        stubDemoEngine('broken', () => {
          throw new Error('planner exploded')
        }),
      ],
    }),
  )

  const run = service.startRun(1)
  await service.whenIdle()

  const done = service.getRun(run.id)
  assert.equal(done.status, 'failed')
  assert.match(done.error, /planner exploded/)
  assert.deepEqual(done.standings, [])
})

test('a demo run rejects a game count outside its bounds', async () => {
  const service = new DemoRunService(
    () => 'demo-1',
    demoRunOptions({ engines: [] }),
  )

  for (const gameCount of [0, -1, 1.5, 257, Number.NaN]) {
    assert.throws(() => service.startRun(gameCount), /1 to 256/)
  }

  const maximum = service.startRun(256)
  assert.equal(maximum.gameCount, 256)
  await service.whenIdle()
  assert.equal(service.getRun(maximum.id).completedGameCount, 256)
})

test('finished runs are retained up to the boundary', async () => {
  let ids = 0
  const service = new DemoRunService(
    () => `demo-${ids++}`,
    demoRunOptions({ engines: [] }),
  )

  const runs = []
  for (let index = 0; index < 33; index += 1) {
    runs.push(service.startRun(1))
  }

  await service.whenIdle()

  assert.equal(service.getRun(runs[0].id), undefined)
  assert.notEqual(service.getRun(runs[32].id), undefined)
})


test('POST /demo-runs starts a background run and reports its standings', async () => {
  const handle = await startDemoServer()

  try {
    const response = await post(handle.url, apiPath('/demo-runs'))
    assert.equal(response.status, 202)

    const run = await response.json()
    assertUuidV7(run.id)
    assert.equal(run.gameCount, 1)
    assert.deepEqual(run.engines, ['alpha', 'beta'])
    assert.deepEqual(run.standings, [])
    assert.ok(run.status === 'queued' || run.status === 'running')

    const done = await waitForDemoRun(handle.url, run.id)
    assert.equal(done.status, 'completed')
    assert.equal(done.completedGameCount, 1)
    assert.equal(done.standings.length, 2)

    for (const line of done.standings) {
      assert.equal(typeof line.engineId, 'string')
      assert.equal(typeof line.name, 'string')
      assert.ok(Number.isInteger(line.points) && line.points >= 0)
      assert.ok(Number.isInteger(line.lines) && line.lines >= 0)
      assert.ok(Number.isInteger(line.pieces) && line.pieces >= 0)
      assert.ok(typeof line.playingTimeMs === 'number')
      assert.ok(line.playingTimeMs >= 0)
    }
  } finally {
    await handle.close()
  }
})

test('POST /demo-runs accepts the maximum batch', async () => {
  const handle = await startDemoServer({ demoEngines: [] })

  try {
    const response = await post(handle.url, apiPath('/demo-runs'), { gameCount: 256 })
    assert.equal(response.status, 202)

    const run = await response.json()
    assert.equal(run.gameCount, 256)
    assert.deepEqual(run.engines, [])

    const done = await waitForDemoRun(handle.url, run.id)
    assert.equal(done.completedGameCount, 256)
    assert.deepEqual(done.standings, [])
  } finally {
    await handle.close()
  }
})

test('POST /demo-runs rejects game counts outside its bounds', async () => {
  const handle = await startDemoServer()

  try {
    for (const gameCount of [0, 257, 1.5, '3', null]) {
      const response = await post(handle.url, apiPath('/demo-runs'), { gameCount })
      assert.equal(response.status, 400)
      const body = await response.json()
      assert.match(body.message, /1 to 256/)
    }
  } finally {
    await handle.close()
  }
})

test('GET /demo-runs/{id} rejects unknown and malformed ids', async () => {
  const handle = await startDemoServer()

  try {
    const unknown = await getJson(handle.url, apiPath(`/demo-runs/${UNKNOWN_UUID_V7}`))
    assert.equal(unknown.status, 404)
    assert.match(unknown.body.message, /was not found/)

    const malformed = await getJson(handle.url, apiPath('/demo-runs/not-a-uuid'))
    assert.equal(malformed.status, 400)
    assert.match(malformed.body.message, /UUIDv7/)
  } finally {
    await handle.close()
  }
})

test('a demo run leaves every human row unchanged', async () => {
  const storage = createInMemoryStorage()
  const handle = await startDemoServer({ storage })

  try {
    const user = await createTestUser(handle)
    const game = await (await post(handle.url, apiPath('/games'), {})).json()
    const sessionResponse = await post(handle.url, apiPath('/game-sessions'), {
      userId: user.id,
      gameId: game.id,
    })
    assert.equal(sessionResponse.status, 201)

    const beforeHumans = (await storage.users.load()).users.filter(
      (entry) => entry.type === 'human',
    )
    const beforeGames = (await storage.games.load()).games
    const beforeSessions = (await storage.sessions.load()).sessions

    const run = await (
      await post(handle.url, apiPath('/demo-runs'), { gameCount: 1 })
    ).json()
    await waitForDemoRun(handle.url, run.id)

    const afterUsers = (await storage.users.load()).users
    const afterGames = (await storage.games.load()).games
    const afterSessions = (await storage.sessions.load()).sessions

    assert.deepEqual(
      afterUsers.filter((entry) => entry.type === 'human'),
      beforeHumans,
    )
    assert.deepEqual(afterGames.slice(0, beforeGames.length), beforeGames)
    assert.deepEqual(
      afterSessions.slice(0, beforeSessions.length),
      beforeSessions,
    )
    assert.equal(afterGames.length, beforeGames.length + 1)
    assert.equal(afterSessions.length, beforeSessions.length + 2)
  } finally {
    await handle.close()
  }
})

test('a demo run stores one game and one session log per engine', async () => {
  const storage = createInMemoryStorage()
  const handle = await startDemoServer({ storage })

  try {
    const run = await (
      await post(handle.url, apiPath('/demo-runs'), { gameCount: 2 })
    ).json()
    await waitForDemoRun(handle.url, run.id)

    const games = (await storage.games.load()).games
    const sessions = (await storage.sessions.load()).sessions
    const aiUserIds = new Set(
      (await storage.users.load()).users
        .filter((entry) => entry.type === 'ai')
        .map((entry) => entry.id),
    )

    assert.equal(games.length, 2)
    assert.equal(sessions.length, 4)

    for (const log of sessions) {
      assert.equal(games.some((game) => game.id === log.gameId), true)
      assert.equal(aiUserIds.has(log.userId), true)
      assert.equal(log.level, DEFAULT_DEMO_STARTING_LEVEL)
      assert.ok(
        Number.isInteger(log.seedColumn),
        'a stored demo log names its seed column',
      )
      assert.equal(
        log.pieces.every((piece) => /^[TLRCAH]+$/.test(piece.actions)),
        true,
      )
      assert.equal(
        log.pieces.some((piece) => piece.actions.includes('T')),
        true,
      )
      assert.equal(log.pieces.length > 0, true)
    }
  } finally {
    await handle.close()
  }
})
test('a rejected session write fails the run', async () => {
  const storage = createInMemoryStorage()
  const failingStorage = {
    ...storage,
    sessions: {
      ...storage.sessions,
      create: async () => {
        throw new Error('disk full')
      },
    },
  }
  const handle = await startDemoServer({ storage: failingStorage })

  try {
    const run = await (
      await post(handle.url, apiPath('/demo-runs'), { gameCount: 1 })
    ).json()
    const done = await waitForDemoRun(handle.url, run.id, 'failed')

    assert.match(done.error, /disk full/)
    assert.deepEqual(done.standings, [])
  } finally {
    await handle.close()
  }
})

test('an in-memory demo run leaves no row after a restart', async () => {
  const handle = await startDemoServer()

  try {
    const run = await (
      await post(handle.url, apiPath('/demo-runs'), { gameCount: 1 })
    ).json()
    await waitForDemoRun(handle.url, run.id)
  } finally {
    await handle.close()
  }

  const restarted = createInMemoryStorage()
  try {
    assert.deepEqual(await restarted.users.load(), { users: [] })
    assert.deepEqual(await restarted.games.load(), { games: [] })
    assert.deepEqual(await restarted.sessions.load(), { sessions: [] })
  } finally {
    restarted.close()
  }
})

test('a restarted server rebuilds stored demo sessions', async () => {
  const temp = await createTempDataFile()
  const firstStorage = createSqliteStorage({ dataFile: temp.dataFile })
  const first = await startDemoServer({ storage: firstStorage })
  let logs = []

  try {
    const run = await (
      await post(first.url, apiPath('/demo-runs'), { gameCount: 1 })
    ).json()
    await waitForDemoRun(first.url, run.id)
    logs = (await firstStorage.sessions.load()).sessions
  } finally {
    await first.close()
    firstStorage.close()
  }

  const secondStorage = createSqliteStorage({ dataFile: temp.dataFile })
  const second = await startDemoServer({ storage: secondStorage })

  try {
    assert.equal(logs.length, 2)

    for (const log of logs) {
      const game = await secondStorage.games.findById(log.gameId)
      assert.notEqual(game, undefined)
      const replayed = replayPentixGameSession(log, game)
      assert.equal(replayed.id, log.sessionId)
      assert.equal(replayed.userId, log.userId)
      assert.equal(replayed.status, 'game-over')
    }

    const aiUsers = (await secondStorage.users.load()).users
    assert.equal(aiUsers.length, 2)
  } finally {
    await second.close()
    secondStorage.close()
    await temp.cleanup()
  }
})



test('the server seeds one AI user per demo engine', async () => {
  const storage = createInMemoryStorage()
  const handle = await startDemoServer({ storage })

  try {
    const users = (await storage.users.load()).users

    assert.deepEqual(
      users.map((user) => user.engineId),
      ['alpha', 'beta'],
    )
    assert.deepEqual(
      users.map((user) => user.type),
      ['ai', 'ai'],
    )
    assert.deepEqual(
      users.map((user) => user.name),
      ['Engine alpha', 'Engine beta'],
    )
    for (const user of users) {
      assertUuidV7(user.id)
    }

    const fetched = await getJson(handle.url, apiPath(`/users/${users[0].id}`))
    assert.equal(fetched.status, 200)
    assert.equal(fetched.body.type, 'ai')
    assert.equal(fetched.body.engineId, 'alpha')
  } finally {
    await handle.close()
  }
})

test('POST /users always creates a human user', async () => {
  const handle = await startTestServer()

  try {
    const response = await post(handle.url, apiPath('/users'), {
      name: 'Ada',
      type: 'ai',
    })
    assert.equal(response.status, 201)

    const user = await response.json()
    assert.equal(user.type, 'human')
    assert.equal('engineId' in user, false)
  } finally {
    await handle.close()
  }
})

test('a restarted server reuses the seeded AI users', async () => {
  const temp = await createTempDataFile()
  const firstStorage = createSqliteStorage({ dataFile: temp.dataFile })
  const first = await startDemoServer({ storage: firstStorage })
  let beforeUsers = []

  try {
    beforeUsers = (await firstStorage.users.load()).users
  } finally {
    await first.close()
    firstStorage.close()
  }

  const secondStorage = createSqliteStorage({ dataFile: temp.dataFile })
  const second = await startDemoServer({ storage: secondStorage })

  try {
    assert.equal(beforeUsers.length, 2)
    assert.deepEqual((await secondStorage.users.load()).users, beforeUsers)
  } finally {
    await second.close()
    secondStorage.close()
    await temp.cleanup()
  }
})

test('an old database file gains the new columns', async () => {
  const temp = await createTempDataFile()
  const userId = uuidv7()
  const database = new DatabaseSync(temp.dataFile)
  database.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE games (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      board TEXT NOT NULL,
      available_piece_ids TEXT NOT NULL,
      piece_ids TEXT NOT NULL
    );
    CREATE TABLE game_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      game_id TEXT NOT NULL,
      pieces TEXT NOT NULL
    );
  `)
  database.prepare('INSERT INTO users (id, name) VALUES (?, ?)').run(userId, 'Ada')
  database.close()

  let storage = createSqliteStorage({ dataFile: temp.dataFile })

  try {
    const users = (await storage.users.load()).users
    assert.deepEqual(users, [{ id: userId, name: 'Ada', type: 'human' }])

    const columns = (table) => {
      const reopened = new DatabaseSync(temp.dataFile)
      try {
        return reopened
          .prepare(`PRAGMA table_info(${table})`)
          .all()
          .map((row) => row.name)
      } finally {
        reopened.close()
      }
    }

    assert.equal(columns('users').includes('type'), true)
    assert.equal(columns('users').includes('engine_id'), true)
    assert.equal(columns('game_sessions').includes('level'), true)
    assert.equal(columns('game_sessions').includes('seed_column'), true)

    storage.close()
    storage = createSqliteStorage({ dataFile: temp.dataFile })
    assert.deepEqual((await storage.users.load()).users, users)
  } finally {
    storage.close()
    await temp.cleanup()
  }
})


test('a demo run is forgotten after a restart', async () => {
  const first = await startDemoServer()
  let runId

  try {
    const run = await (
      await post(first.url, apiPath('/demo-runs'), { gameCount: 1 })
    ).json()
    runId = run.id
    await waitForDemoRun(first.url, runId)
  } finally {
    await first.close()
  }

  const second = await startTestServer()
  try {
    const { status } = await getJson(second.url, apiPath(`/demo-runs/${runId}`))
    assert.equal(status, 404)
  } finally {
    await second.close()
  }
})


const NON_OPERATION_KEYS = new Set([
  'summary',
  'description',
  'servers',
  'parameters',
  '$ref',
])

async function fetchApiDocument(url) {
  const response = await fetch(`${url}/openapi.json`)
  assert.equal(response.status, 200)
  assert.equal(
    response.headers.get('content-type'),
    'application/json',
  )
  return response.json()
}

function operationEntries(apiDocument) {
  const entries = []
  for (const [path, pathItem] of Object.entries(apiDocument.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (NON_OPERATION_KEYS.has(method)) {
        continue
      }
      entries.push({ method: method.toUpperCase(), path, operation })
    }
  }
  return entries
}

function resolveSchema(apiDocument, schema) {
  const reference = schema?.$ref
  if (reference === undefined) {
    return schema
  }

  return apiDocument.components.schemas[
    reference.replace('#/components/schemas/', '')
  ]
}

test('GET /openapi.json serves the documented API', async () => {
  const handle = await startTestServer()

  try {
    const apiDocument = await fetchApiDocument(handle.url)

    assert.equal(apiDocument.openapi, '3.1.0')
    assert.equal(apiDocument.info.title, 'PentixServer API')
    assert.equal(apiDocument.info.version, '1.0.0')
    assert.deepEqual(apiDocument.servers, [
      { url: handle.url, description: 'This server' },
    ])
    assert.equal(Object.keys(apiDocument.paths).length, 11)

    for (const path of Object.keys(apiDocument.paths)) {
      assert.ok(
        path.startsWith(`${API_BASE_PATH}/`),
        `documented path ${path} lacks /v1`,
      )
    }
  } finally {
    await handle.close()
  }
})

test('the document matches the registered routes', async () => {
  const handle = await startTestServer()

  try {
    const apiDocument = await fetchApiDocument(handle.url)
    const documented = operationEntries(apiDocument).map(
      ({ method, path }) => `${method} ${path}`,
    )

    assert.deepEqual(documented.sort(), [...listPentixRouteKeys()].sort())
    assert.equal(apiDocument.paths['/docs'], undefined)
    assert.equal(apiDocument.paths['/openapi.json'], undefined)

    for (const { operation } of operationEntries(apiDocument)) {
      assert.equal(typeof operation.summary, 'string')
      assert.ok(Array.isArray(operation.tags))
      assert.ok(operation.tags.length > 0)
    }
  } finally {
    await handle.close()
  }
})

test('unprefixed and unknown-version paths answer the not-found fallback', async () => {
  const handle = await startTestServer()

  try {
    const unprefixed = await post(handle.url, '/users', { name: 'Ada' })
    const unprefixedBody = await unprefixed.json()

    assert.equal(unprefixed.status, 404)
    assert.equal(unprefixedBody.path, '/users')
    assert.match(
      unprefixedBody.message,
      new RegExp(`POST ${API_BASE_PATH}/users`),
    )
    assert.match(unprefixedBody.message, /GET \/docs/)
    assert.match(unprefixedBody.message, /GET \/openapi\.json/)

    const unknownVersion = await fetch(`${handle.url}/v2/users`)
    const unknownVersionBody = await unknownVersion.json()

    assert.equal(unknownVersion.status, 404)
    assert.equal(unknownVersionBody.path, '/v2/users')

    const usersResponse = await fetch(apiUrl(handle.url, '/users'))
    const usersPayload = await usersResponse.json()
    assert.equal(
      usersPayload.users.every((user) => user.type === 'ai'),
      true,
    )
    assert.equal(usersPayload.users.length, demoEngineRegistry.list().length)
  } finally {
    await handle.close()
  }
})

test('every route config has exactly one handler', () => {
  const lifecycle = new PentixGameLifecycle(() => UNKNOWN_UUID_V7)
  const demoRuns = new DemoRunService(
    () => UNKNOWN_UUID_V7,
    demoRunOptions({ engines: [] }),
  )

  const tableKeys = buildPentixRoutes(lifecycle, demoRuns).map(
    ({ route }) => `${route.method.toUpperCase()} ${route.path}`,
  )

  assert.deepEqual(tableKeys, listPentixRouteKeys())
})

test('every route key carries the /v1 prefix', () => {
  const keys = listPentixRouteKeys()
  assert.equal(keys.length, 12)

  for (const key of keys) {
    const path = key.split(' ')[1]
    assert.ok(
      path.startsWith(`${API_BASE_PATH}/`),
      `${key} lacks the /v1 prefix`,
    )
    assert.equal(
      path.slice(API_BASE_PATH.length).startsWith(API_BASE_PATH),
      false,
    )
  }
})

test('the document derives its constraints from the route schemas', async () => {
  const handle = await startTestServer()

  try {
    const apiDocument = await fetchApiDocument(handle.url)

    const demoRunBody = resolveSchema(
      apiDocument,
      apiDocument.paths[apiPath('/demo-runs')].post.requestBody.content[
        'application/json'
      ].schema,
    )
    assert.equal(demoRunBody.properties.gameCount.type, 'integer')
    assert.equal(demoRunBody.properties.gameCount.minimum, 1)
    assert.equal(demoRunBody.properties.gameCount.maximum, 256)

    const userIdParameter = apiDocument.paths[apiPath('/users/{id}')].get.parameters.find(
      (parameter) => parameter.name === 'id',
    )
    assert.equal(userIdParameter.in, 'path')
    assert.ok(userIdParameter.schema.pattern.startsWith('^'))
    assert.ok(userIdParameter.schema.pattern.includes('-7[0-9a-f]{3}-'))
  } finally {
    await handle.close()
  }
})

test('GET /docs serves a self-contained Swagger UI', async () => {
  const handle = await startTestServer()

  try {
    const response = await fetch(`${handle.url}/docs`)
    const html = await response.text()

    assert.equal(response.status, 200)
    assert.match(response.headers.get('content-type'), /^text\/html/)
    assert.match(html, /<title>PentixServer API<\/title>/)
    assert.ok(html.includes('/openapi.json'))
    assert.ok(html.includes('/docs/swagger-ui-dist/swagger-ui.css'))
    assert.deepEqual(html.match(/https?:\/\/[^"'\s]+/g), null)
  } finally {
    await handle.close()
  }
})

test('documentation endpoints keep their unversioned paths', async () => {
  const handle = await startTestServer()

  try {
    for (const path of ['/docs', '/openapi.json']) {
      const response = await fetch(`${handle.url}${path}`)
      assert.equal(response.status, 200, `${path} did not answer 200`)
    }
  } finally {
    await handle.close()
  }
})

test('the Swagger UI assets are served locally', async () => {
  const handle = await startTestServer()

  try {
    const stylesheet = await fetch(
      `${handle.url}/docs/swagger-ui-dist/swagger-ui.css`,
    )
    const bundle = await fetch(
      `${handle.url}/docs/swagger-ui-dist/swagger-ui-bundle.js`,
    )

    assert.equal(stylesheet.status, 200)
    assert.match(stylesheet.headers.get('content-type'), /^text\/css/)
    assert.equal(bundle.status, 200)
    assert.match(
      bundle.headers.get('content-type'),
      /^text\/javascript|^application\/javascript/,
    )
    assert.ok((await stylesheet.text()).length > 1000)
    assert.ok((await bundle.text()).length > 1000)
  } finally {
    await handle.close()
  }
})


test('live responses satisfy the documented schemas', async () => {
  const handle = await startDemoServer()

  try {
    const userResponse = await post(handle.url, apiPath('/users'), { name: 'Ada' })
    assert.equal(userResponse.status, 201)
    const user = UserSchema.parse(await userResponse.json())

    const usersResponse = await fetch(apiUrl(handle.url, '/users'))
    const users = UserListSchema.parse(await usersResponse.json())
    assert.deepEqual(
      users.users.filter((user) => user.type === 'human'),
      [user],
    )

    const gameResponse = await post(handle.url, apiPath('/games'), { name: 'Ranked' })
    assert.equal(gameResponse.status, 201)
    const game = PentixGameSchema.parse(await gameResponse.json())

    const sessionResponse = await post(handle.url, apiPath('/game-sessions'), {
      userId: user.id,
      gameId: game.id,
    })
    assert.equal(sessionResponse.status, 201)
    PentixGameSessionSchema.parse(await sessionResponse.json())

    const runResponse = await post(handle.url, apiPath('/demo-runs'), { gameCount: 1 })
    assert.equal(runResponse.status, 202)
    const queuedRun = DemoRunSnapshotSchema.parse(await runResponse.json())
    assert.equal(queuedRun.status, 'queued')

    const finishedRun = DemoRunSnapshotSchema.parse(
      await waitForDemoRun(handle.url, queuedRun.id),
    )
    assert.equal(finishedRun.standings.length, 2)

    const missing = await getJson(handle.url, apiPath(`/users/${UNKNOWN_UUID_V7}`))
    assert.equal(missing.status, 404)
    ErrorResponseSchema.parse(missing.body)
  } finally {
    await handle.close()
  }
})

test('a body without a JSON content type is refused', async () => {
  const handle = await startTestServer()

  try {
    const response = await fetch(apiUrl(handle.url, '/games'), {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: JSON.stringify({ name: 'Plain' }),
    })
    const body = await response.json()

    assert.equal(response.status, 415)
    ErrorResponseSchema.parse(body)

    const afterResponse = await post(handle.url, apiPath('/games'))
    assert.equal(afterResponse.status, 201)
    assert.equal((await afterResponse.json()).name, '')
  } finally {
    await handle.close()
  }
})

test('malformed JSON keeps its 400 answer', async () => {
  const handle = await startTestServer()

  try {
    const response = await post(handle.url, apiPath('/games'), '{invalid-json')
    const body = await response.json()

    assert.equal(response.status, 400)
    ErrorResponseSchema.parse(body)
  } finally {
    await handle.close()
  }
})

