import assert from 'node:assert/strict'
import test from 'node:test'

import { startPentixServer } from '../apps/pentix-server/dist/server.js'
import { PIECE_CATALOG } from '../packages/pentix-core/dist/index.js'

test('PentixServer bootstrap starts successfully', async () => {
  const handle = await startPentixServer({
    host: '127.0.0.1',
    port: 0,
  })

  try {
    assert.match(handle.url, /^http:\/\/127\.0\.0\.1:\d+$/)
  } finally {
    await handle.close()
  }
})

test('PentixServer starts a game session', async () => {
  const handle = await startPentixServer({
    host: '127.0.0.1',
    port: 0,
  })

  try {
    const response = await fetch(`${handle.url}/game-sessions`, {
      method: 'POST',
    })
    const payload = await response.json()

    assert.equal(response.status, 201)
    assert.equal(
      response.headers.get('content-type'),
      'application/json; charset=utf-8',
    )
    assert.equal(typeof payload.sessionId, 'string')
    assert.equal(payload.status, 'active')
    assert.deepEqual([payload.board.width, payload.board.height], [12, 22])
    assert.equal(
      payload.board.rows.flat().some((cell) => cell.isOccupied),
      false,
    )
    assert.deepEqual(payload.statistics, {
      score: 0,
      level: 1,
      clearedLines: 0,
    })
    assert.deepEqual(payload.activePiece.origin, { row: 1, column: 6 })
    assert.equal(payload.activePiece.angle, 0)
    assert.ok(
      PIECE_CATALOG.some((piece) => piece.key === payload.activePiece.key),
    )
    assert.ok(
      PIECE_CATALOG.some((piece) => piece.key === payload.nextPieceKey),
    )
  } finally {
    await handle.close()
  }
})

test('PentixServer creates distinct independent game sessions', async () => {
  const handle = await startPentixServer({
    host: '127.0.0.1',
    port: 0,
  })

  try {
    const firstResponse = await fetch(`${handle.url}/game-sessions`, {
      method: 'POST',
    })
    const secondResponse = await fetch(`${handle.url}/game-sessions`, {
      method: 'POST',
    })
    const firstSession = await firstResponse.json()
    const secondSession = await secondResponse.json()

    assert.notEqual(firstSession.sessionId, secondSession.sessionId)
    assert.equal(firstSession.board.rows.flat().some((cell) => cell.isOccupied), false)
    assert.equal(secondSession.board.rows.flat().some((cell) => cell.isOccupied), false)
  } finally {
    await handle.close()
  }
})
test('PentixServer bootstrap does not expose gameplay endpoints yet', async () => {

  const handle = await startPentixServer({
    host: '127.0.0.1',
    port: 0,
  })

  try {
    const response = await fetch(`${handle.url}/players`)
    const payload = await response.json()

    assert.equal(response.status, 404)
    assert.match(payload.message, /not implemented yet/i)
  } finally {
    await handle.close()
  }
})

test('PentixServer bootstrap returns valid IPv6 URLs', async (t) => {
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
