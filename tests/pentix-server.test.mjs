import assert from 'node:assert/strict'
import test from 'node:test'

import { startPentixServer } from '../apps/pentix-server/dist/server.js'

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
