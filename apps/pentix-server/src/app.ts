import { Hono } from 'hono'
import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

import type {
  MoveDirection,
  RotateDirection,
} from '../../../packages/pentix-core/dist/index.js'
import {
  HttpError,
  HttpStatus,
  checkUuid,
  readDirection,
  readOptionalGameId,
  readOptionalName,
  readRequiredName,
  readRequiredUserId,
} from './http.js'
import type { PentixGameLifecycle } from './server.js'

const MAX_JSON_BODY_BYTES = 1024 * 1024

const NOT_FOUND_MESSAGE =
  'PentixServer is running. Supported endpoints are POST /games, POST /game-sessions, POST /game-sessions/{id}/next-piece, POST /game-sessions/{id}/move, POST /game-sessions/{id}/rotate, POST /game-sessions/{id}/tick, POST /game-sessions/{id}/drop, POST /users, GET /users, and GET /users/{id}.'

export function createPentixApp(lifecycle: PentixGameLifecycle): Hono {
  const app = new Hono()

  app.post('/games', async (c) => {
    const name = readOptionalName(await readJsonBody(c))
    return writeJson(c, HttpStatus.created201, lifecycle.createGame(name))
  })

  app.post('/game-sessions', async (c) => {
    const body = await readJsonBody(c)
    const gameId = readOptionalGameId(body)
    const userId = readRequiredUserId(body)
    return writeJson(c, HttpStatus.created201, lifecycle.createSession(userId, gameId))
  })

  app.post('/users', async (c) => {
    const name = readRequiredName(await readJsonBody(c))
    return writeJson(c, HttpStatus.created201, lifecycle.createUser(name))
  })

  app.get('/users', (c) => {
    return writeJson(c, HttpStatus.ok200, { users: lifecycle.listUsers() })
  })

  app.get('/users/:id', (c) => {
    const userId = c.req.param('id')
    checkUuid(userId, 'User id')

    const user = lifecycle.getUser(userId)
    if (user === undefined) {
      throw new HttpError(HttpStatus.notFound404, `User ${userId} was not found.`)
    }

    return writeJson(c, HttpStatus.ok200, user)
  })

  app.post('/game-sessions/:id/next-piece', (c) => {
    const sessionId = c.req.param('id')
    checkUuid(sessionId, 'Game session id')
    return writeJson(c, HttpStatus.ok200, lifecycle.advanceSession(sessionId))
  })

  app.post('/game-sessions/:id/move', async (c) => {
    const sessionId = c.req.param('id')
    checkUuid(sessionId, 'Game session id')

    const direction = readDirection<MoveDirection>(
      await readJsonBody(c),
      ['left', 'right'],
      'Move',
    )
    return writeJson(c, HttpStatus.ok200, lifecycle.moveSession(sessionId, direction))
  })

  app.post('/game-sessions/:id/rotate', async (c) => {
    const sessionId = c.req.param('id')
    checkUuid(sessionId, 'Game session id')

    const direction = readDirection<RotateDirection>(
      await readJsonBody(c),
      ['clockwise', 'counterclockwise'],
      'Rotate',
    )
    return writeJson(c, HttpStatus.ok200, lifecycle.rotateSession(sessionId, direction))
  })

  app.post('/game-sessions/:id/tick', (c) => {
    const sessionId = c.req.param('id')
    checkUuid(sessionId, 'Game session id')
    return writeJson(c, HttpStatus.ok200, lifecycle.tickSession(sessionId))
  })

  app.post('/game-sessions/:id/drop', (c) => {
    const sessionId = c.req.param('id')
    checkUuid(sessionId, 'Game session id')
    return writeJson(c, HttpStatus.ok200, lifecycle.dropSession(sessionId))
  })

  app.notFound((c) => {
    return writeJson(c, HttpStatus.notFound404, {
      service: 'PentixServer',
      method: c.req.method,
      path: c.req.path,
      message: NOT_FOUND_MESSAGE,
    })
  })

  app.onError((error, c) => {
    if (error instanceof HttpError) {
      return writeJson(c, error.statusCode, { message: error.message })
    }

    console.error(error)
    return writeJson(c, HttpStatus.internalServerError500, {
      message: 'Internal server error.',
    })
  })

  return app
}

async function readJsonBody(c: Context): Promise<unknown> {
  const declaredLength = c.req.header('content-length')
  if (declaredLength !== undefined) {
    const declaredBytes = Number(declaredLength)
    if (Number.isFinite(declaredBytes) && declaredBytes > MAX_JSON_BODY_BYTES) {
      throw new HttpError(HttpStatus.badRequest400, 'Request JSON body is too large.')
    }
  }

  const rawBody = await c.req.text()
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_JSON_BODY_BYTES) {
    throw new HttpError(HttpStatus.badRequest400, 'Request JSON body is too large.')
  }

  if (rawBody.trim().length === 0) {
    return undefined
  }

  try {
    return JSON.parse(rawBody) as unknown
  } catch {
    throw new HttpError(HttpStatus.badRequest400, 'Request body must be valid JSON.')
  }
}

function writeJson(c: Context, statusCode: number, payload: unknown): Response {
  return c.body(JSON.stringify(payload), statusCode as ContentfulStatusCode, {
    'content-type': 'application/json; charset=utf-8',
  })
}
