import assert from 'node:assert/strict'
import test from 'node:test'

import { startPentixServer } from '../apps/pentix-server/dist/server.js'
import { PIECE_CATALOG } from '../packages/pentix-core/dist/index.js'

const UNKNOWN_UUID_V7 = '018cc251-f400-7000-8000-000000000000'

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

function assertOpeningSession(session, gameId) {
  assertUuidV7(session.id)
  assert.equal(session.userId, null)
  assert.equal(session.gameId, gameId)
  assert.equal(session.status, 'active')
  assert.equal('sessionId' in session, false)
  assert.deepEqual([session.board.width, session.board.height], [12, 22])
  assert.equal(session.board.rows.flat().some((cell) => cell.isOccupied), false)
  assert.deepEqual(session.statistics, {
    score: 0,
    level: 1,
    clearedLines: 0,
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
    const firstResponse = await post(handle.url, '/games')
    const firstGame = await firstResponse.json()
    const secondResponse = await post(handle.url, '/games', {
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
      const response = await post(handle.url, '/games', body)
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
    const trimmedResponse = await post(handle.url, '/games', {
      name: '  Evening game  ',
    })
    const trimmedGame = await trimmedResponse.json()
    const blankResponse = await post(handle.url, '/games', { name: '   ' })
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
    const oversizedResponse = await post(handle.url, '/games', oversizedBody)

    assert.equal(oversizedResponse.status, 400)
    assert.equal(typeof (await oversizedResponse.json()).message, 'string')

    const followUpResponse = await post(handle.url, '/games')
    assert.equal(followUpResponse.status, 201)
  } finally {
    await handle.close()
  }
})

test('POST /game-sessions creates a session with a new game by default', async () => {
  const handle = await startTestServer()

  try {
    const response = await post(handle.url, '/game-sessions')
    const session = await response.json()

    assert.equal(response.status, 201)
    assert.equal(
      response.headers.get('content-type'),
      'application/json; charset=utf-8',
    )
    assertOpeningSession(session, session.gameId)
    assertUuidV7(session.gameId)
  } finally {
    await handle.close()
  }
})

test('POST /game-sessions reuses an existing game', async () => {
  const handle = await startTestServer()

  try {
    const gameResponse = await post(handle.url, '/games')
    const game = await gameResponse.json()
    const sessionResponse = await post(handle.url, '/game-sessions', {
      gameId: game.id,
    })
    const session = await sessionResponse.json()

    assert.equal(sessionResponse.status, 201)
    assertOpeningSession(session, game.id)
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
    for (const body of [{ gameId: null }, { gameId: '   ' }]) {
      const response = await post(handle.url, '/game-sessions', body)
      const session = await response.json()

      assert.equal(response.status, 201)
      assertOpeningSession(session, session.gameId)
      assertUuidV7(session.gameId)
    }
  } finally {
    await handle.close()
  }
})

test('POST /game-sessions creates distinct independent sessions', async () => {
  const handle = await startTestServer()

  try {
    const firstResponse = await post(handle.url, '/game-sessions')
    const secondResponse = await post(handle.url, '/game-sessions')
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

test('POST /game-sessions validates body and game identity', async () => {
  const handle = await startTestServer()

  try {
    const invalidBodies = [
      '{invalid-json',
      JSON.stringify([]),
      JSON.stringify({ gameId: 42 }),
      JSON.stringify({ gameId: 'not-a-uuid' }),
      JSON.stringify({ gameId: '018cc251-f400-4000-8000-000000000000' }),
    ]

    for (const body of invalidBodies) {
      const response = await post(handle.url, '/game-sessions', body)
      assert.equal(response.status, 400)
    }

    const unknownResponse = await post(handle.url, '/game-sessions', {
      gameId: UNKNOWN_UUID_V7,
    })
    assert.equal(unknownResponse.status, 404)
  } finally {
    await handle.close()
  }
})

test('POST next-piece promotes the preview and advances retained state', async () => {
  const handle = await startTestServer()

  try {
    const sessionResponse = await post(handle.url, '/game-sessions')
    const session = await sessionResponse.json()

    const firstResponse = await post(
      handle.url,
      `/game-sessions/${session.id}/next-piece`,
    )
    const firstAdvance = await firstResponse.json()

    assert.equal(firstResponse.status, 200)
    assert.equal(firstAdvance.id, session.id)
    assert.equal(firstAdvance.gameId, session.gameId)
    assert.equal(firstAdvance.userId, null)
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
      `/game-sessions/${session.id}/next-piece`,
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
      '/game-sessions/not-a-uuid/next-piece',
    )
    const unknownResponse = await post(
      handle.url,
      `/game-sessions/${UNKNOWN_UUID_V7}/next-piece`,
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
    const game = await (await post(handle.url, '/games')).json()
    const firstSession = await (
      await post(handle.url, '/game-sessions', { gameId: game.id })
    ).json()
    const secondSession = await (
      await post(handle.url, '/game-sessions', { gameId: game.id })
    ).json()

    assert.equal(firstSession.gameId, game.id)
    assert.equal(secondSession.gameId, game.id)
    assert.equal(firstSession.activePiece.key, secondSession.activePiece.key)
    assert.equal(firstSession.nextPieceKey, secondSession.nextPieceKey)

    const firstAdvance = await (
      await post(handle.url, `/game-sessions/${firstSession.id}/next-piece`)
    ).json()
    const secondAdvance = await (
      await post(handle.url, `/game-sessions/${secondSession.id}/next-piece`)
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
  ]
  const handle = await startPentixServer({
    host: '127.0.0.1',
    port: 0,
    context: {
      createId: () => createdIds.shift(),
      selectPieceId: () => 3,
    },
  })

  try {
    const game = await (await post(handle.url, '/games')).json()
    const newGameSession = await (
      await post(handle.url, '/game-sessions')
    ).json()
    const reusedGameSession = await (
      await post(handle.url, '/game-sessions', { gameId: game.id })
    ).json()

    assert.equal(game.id, '018cc251-f400-7000-8000-000000000001')
    assert.deepEqual(game.pieceIds, [3, 3])
    assert.equal(newGameSession.id, '018cc251-f400-7000-8000-000000000003')
    assert.equal(newGameSession.gameId, '018cc251-f400-7000-8000-000000000002')
    assert.equal(reusedGameSession.id, '018cc251-f400-7000-8000-000000000004')
    assert.equal(reusedGameSession.gameId, game.id)
    assert.equal(reusedGameSession.activePiece.key, '3Corner')
    assert.equal(reusedGameSession.nextPieceKey, '3Corner')

    const advanced = await (
      await post(handle.url, `/game-sessions/${reusedGameSession.id}/next-piece`)
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
    const gameResponse = await post(firstHandle.url, '/games')
    const game = await gameResponse.json()
    const sessionResponse = await post(secondHandle.url, '/game-sessions', {
      gameId: game.id,
    })

    assert.equal(sessionResponse.status, 404)
  } finally {
    await firstHandle.close()
    await secondHandle.close()
  }
})

test('PentixServer still does not expose player endpoints', async () => {
  const handle = await startTestServer()

  try {
    const response = await fetch(`${handle.url}/players`)
    const payload = await response.json()

    assert.equal(response.status, 404)
    assert.match(payload.message, /not implemented yet/i)
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
