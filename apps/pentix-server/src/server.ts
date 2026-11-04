import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http'

import {
  advancePentixGameSession,
  createPentixGame,
  createPentixGameSession,
  createUser,
  dropSession,
  moveActivePiece,
  rotateActivePiece,
  tickSession,
  type MoveDirection,
  type PentixGame,
  type PentixGameSession,
  type PieceIdSelector,
  type RotateDirection,
  type User,
} from '../../../packages/pentix-core/dist/index.js'
import { v7 as uuidv7 } from 'uuid'

import { checkUuid, HttpError, HttpStatus } from './http.js'

export interface PentixServerContext {
  readonly createId?: () => string
  readonly selectPieceId?: PieceIdSelector
}

export interface PentixServerStartOptions {
  readonly host?: string
  readonly port?: number
  readonly context?: PentixServerContext
}

export interface PentixServerHandle {
  readonly server: Server
  readonly url: string
  close(): Promise<void>
}

const DEFAULT_HOST = '127.0.0.1'
const DEFAULT_PORT = 3100
const REQUEST_URL_BASE = 'http://localhost'
const MAX_JSON_BODY_BYTES = 1024 * 1024

class PentixGameLifecycle {
  private readonly games = new Map<string, PentixGame>()
  private readonly sessions = new Map<string, PentixGameSession>()
  private readonly users = new Map<string, User>()
  private readonly createId: () => string
  private readonly selectPieceId?: PieceIdSelector

  constructor(createId: () => string, selectPieceId?: PieceIdSelector) {
    this.createId = createId
    this.selectPieceId = selectPieceId
  }

  createGame(name = ''): PentixGame {
    const game = createPentixGame({
      id: this.createId(),
      name,
      selectPieceId: this.selectPieceId,
    })
    this.games.set(game.id, game)
    return game
  }

  getGame(gameId: string): PentixGame | undefined {
    return this.games.get(gameId)
  }

  createUser(name: string): User {
    const normalizedName = name.trim()
    for (const existingUser of this.users.values()) {
      if (existingUser.name.toLowerCase() === normalizedName.toLowerCase()) {
        throw new HttpError(HttpStatus.conflict409, `User with name "${normalizedName}" already exists.`)
      }
    }

    const user = createUser({
      id: this.createId(),
      name: normalizedName,
    })
    this.users.set(user.id, user)
    return user
  }

  getUser(userId: string): User | undefined {
    return this.users.get(userId)
  }

  listUsers(): User[] {
    return [...this.users.values()]
  }

  createSession(userId: string, gameId?: string): PentixGameSession {
    if (this.getUser(userId) === undefined) {
      throw new HttpError(HttpStatus.notFound404, `User ${userId} was not found.`)
    }

    const game = gameId === undefined ? this.createGame() : this.getGame(gameId)
    if (game === undefined) {
      throw new HttpError(HttpStatus.notFound404, `PentixGame ${gameId} was not found.`)
    }

    const session = createPentixGameSession({
      id: this.createId(),
      userId,
      game,
    })
    this.sessions.set(session.id, session)
    return session
  }

  advanceSession(sessionId: string): PentixGameSession {
    const session = this.sessions.get(sessionId)
    if (session === undefined) {
      throw new HttpError(HttpStatus.notFound404, `PentixGameSession ${sessionId} was not found.`)
    }

    const game = this.games.get(session.gameId)
    if (game === undefined) {
      throw new HttpError(HttpStatus.notFound404, `PentixGame ${session.gameId} was not found.`)
    }

    const result = advancePentixGameSession(
      session,
      game,
      this.selectPieceId,
    )
    this.games.set(result.game.id, result.game)
    this.sessions.set(result.session.id, result.session)
    return result.session
  }

  private resolveSession(sessionId: string): {
    session: PentixGameSession
    game: PentixGame
  } {
    const session = this.sessions.get(sessionId)
    if (session === undefined) {
      throw new HttpError(HttpStatus.notFound404, `PentixGameSession ${sessionId} was not found.`)
    }

    const game = this.games.get(session.gameId)
    if (game === undefined) {
      throw new HttpError(HttpStatus.notFound404, `PentixGame ${session.gameId} was not found.`)
    }

    return { session, game }
  }

  private persist(result: {
    game: PentixGame
    session: PentixGameSession
  }): PentixGameSession {
    this.games.set(result.game.id, result.game)
    this.sessions.set(result.session.id, result.session)
    return result.session
  }

  moveSession(sessionId: string, direction: MoveDirection): PentixGameSession {
    const { session } = this.resolveSession(sessionId)
    const updated = moveActivePiece(session, direction)
    this.sessions.set(updated.id, updated)
    return updated
  }

  rotateSession(
    sessionId: string,
    direction: RotateDirection,
  ): PentixGameSession {
    const { session } = this.resolveSession(sessionId)
    const updated = rotateActivePiece(session, direction)
    this.sessions.set(updated.id, updated)
    return updated
  }

  tickSession(sessionId: string): PentixGameSession {
    const { session, game } = this.resolveSession(sessionId)
    return this.persist(tickSession(session, game, this.selectPieceId))
  }

  dropSession(sessionId: string): PentixGameSession {
    const { session, game } = this.resolveSession(sessionId)
    return this.persist(dropSession(session, game))
  }
}

function writeJson(
  response: ServerResponse,
  statusCode: number,
  payload: unknown,
): void {
  response.statusCode = statusCode
  response.setHeader('content-type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(payload))
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let bodySize = 0

  await new Promise<void>((resolve, reject) => {
    let isSettled = false

    const cleanup = () => {
      request.off('data', handleData)
      request.off('end', handleEnd)
      request.off('error', handleError)
    }

    const handleData = (chunk: Buffer) => {
      bodySize += chunk.length
      if (bodySize > MAX_JSON_BODY_BYTES) {
        isSettled = true
        cleanup()
        request.resume()
        reject(new HttpError(HttpStatus.badRequest400, 'Request JSON body is too large.'))
        return
      }

      chunks.push(chunk)
    }

    const handleEnd = () => {
      if (isSettled) {
        return
      }

      isSettled = true
      cleanup()
      resolve()
    }

    const handleError = (error: Error) => {
      if (isSettled) {
        return
      }

      isSettled = true
      cleanup()
      reject(error)
    }

    request.on('data', handleData)
    request.on('end', handleEnd)
    request.on('error', handleError)
  })

  if (chunks.length === 0) {
    return undefined
  }

  const body = Buffer.concat(chunks).toString('utf8')
  if (body.trim().length === 0) {
    return undefined
  }

  try {
    return JSON.parse(body) as unknown
  } catch {
    throw new HttpError(HttpStatus.badRequest400, 'Request body must be valid JSON.')
  }
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readOptionalName(body: unknown): string {
  if (body === undefined) {
    return ''
  }

  if (!isJsonRecord(body)) {
    throw new HttpError(HttpStatus.badRequest400, 'Game request body must be a JSON object.')
  }

  if (body.name === undefined) {
    return ''
  }

  if (typeof body.name !== 'string') {
    throw new HttpError(HttpStatus.badRequest400, 'Game name must be a string when supplied.')
  }

  return body.name.trim()
}

function readOptionalGameId(body: unknown): string | undefined {
  if (body === undefined) {
    return undefined
  }

  if (!isJsonRecord(body)) {
    throw new HttpError(HttpStatus.badRequest400, 'Game session request body must be a JSON object.')
  }

  if (body.gameId === undefined || body.gameId === null) {
    return undefined
  }

  if (typeof body.gameId !== 'string') {
    throw new HttpError(HttpStatus.badRequest400, 'Game session gameId must be a string, null, or omitted.')
  }

  const gameId = body.gameId.trim()
  if (gameId.length === 0) {
    return undefined
  }

  checkUuid(gameId, 'Game session gameId')

  return gameId
}

function readDirection<T extends string>(
  body: unknown,
  allowed: readonly T[],
  label: string,
): T {
  if (!isJsonRecord(body)) {
    throw new HttpError(HttpStatus.badRequest400, 'Game session request body must be a JSON object.')
  }

  if (body.direction === undefined) {
    throw new HttpError(HttpStatus.badRequest400, `${label} direction is required.`)
  }

  if (typeof body.direction !== 'string') {
    throw new HttpError(HttpStatus.badRequest400, `${label} direction must be a string.`)
  }

  if (!(allowed as readonly string[]).includes(body.direction)) {
    throw new HttpError(HttpStatus.badRequest400, `${label} direction must be one of: ${allowed.join(', ')}.`)
  }

  return body.direction as T
}

function readRequiredName(body: unknown): string {
  if (!isJsonRecord(body)) {
    throw new HttpError(HttpStatus.badRequest400, 'User request body must be a JSON object.')
  }

  if (body.name === undefined) {
    throw new HttpError(HttpStatus.badRequest400, 'User name is required.')
  }

  if (typeof body.name !== 'string') {
    throw new HttpError(HttpStatus.badRequest400, 'User name must be a string.')
  }

  const name = body.name.trim()
  if (name.length === 0) {
    throw new HttpError(HttpStatus.badRequest400, 'User name must not be empty.')
  }

  return name
}

function readRequiredUserId(body: unknown): string {
  if (!isJsonRecord(body)) {
    throw new HttpError(HttpStatus.badRequest400, 'Game session request body must be a JSON object.')
  }

  if (body.userId === undefined || body.userId === null) {
    throw new HttpError(HttpStatus.badRequest400, 'Game session userId is required.')
  }

  if (typeof body.userId !== 'string') {
    throw new HttpError(HttpStatus.badRequest400, 'Game session userId must be a string.')
  }

  const userId = body.userId.trim()
  checkUuid(userId, 'Game session userId')

  return userId
}

function formatHostForUrl(host: string): string {
  if (host.startsWith('[') && host.endsWith(']')) {
    return host
  }

  return host.includes(':') ? `[${host}]` : host
}

function writeError(response: ServerResponse, error: unknown): void {
  if (error instanceof HttpError) {
    writeJson(response, error.statusCode, { message: error.message })
    return
  }

  console.error(error)
  writeJson(response, HttpStatus.internalServerError500, { message: 'Internal server error.', })
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  lifecycle: PentixGameLifecycle,
): Promise<void> {
  const requestUrl = new URL(request.url ?? '/', REQUEST_URL_BASE)
  const pathname = requestUrl.pathname

  if (request.method === 'POST' && pathname === '/games') {
    const name = readOptionalName(await readJsonBody(request))
    writeJson(response, HttpStatus.created201, lifecycle.createGame(name))
    return
  }

  if (request.method === 'POST' && pathname === '/game-sessions') {
    const body = await readJsonBody(request)
    const gameId = readOptionalGameId(body)
    const userId = readRequiredUserId(body)
    writeJson(response, HttpStatus.created201, lifecycle.createSession(userId, gameId))
    return
  }

  if (request.method === 'POST' && pathname === '/users') {
    const name = readRequiredName(await readJsonBody(request))
    writeJson(response, HttpStatus.created201, lifecycle.createUser(name))
    return
  }

  if (request.method === 'GET' && pathname === '/users') {
    writeJson(response, HttpStatus.ok200, { users: lifecycle.listUsers() })
    return
  }

  const userMatch = /^\/users\/([^/]+)$/.exec(pathname)
  if (request.method === 'GET' && userMatch !== null) {
    const userId = userMatch[1]
    checkUuid(userId, 'User id')

    const user = lifecycle.getUser(userId)
    if (user === undefined) {
      throw new HttpError(HttpStatus.notFound404, `User ${userId} was not found.`)
    }

    writeJson(response, HttpStatus.ok200, user)
    return
  }

  const nextPieceMatch = /^\/game-sessions\/([^/]+)\/next-piece$/.exec(
    pathname,
  )
  if (request.method === 'POST' && nextPieceMatch !== null) {
    const sessionId = nextPieceMatch[1]
    checkUuid(sessionId, 'Game session id')

    writeJson(response, HttpStatus.ok200, lifecycle.advanceSession(sessionId))
    return
  }

  const moveMatch = /^\/game-sessions\/([^/]+)\/move$/.exec(pathname)
  if (request.method === 'POST' && moveMatch !== null) {
    const sessionId = moveMatch[1]
    checkUuid(sessionId, 'Game session id')

    const direction = readDirection<MoveDirection>(
      await readJsonBody(request),
      ['left', 'right'],
      'Move',
    )
    writeJson(response, HttpStatus.ok200, lifecycle.moveSession(sessionId, direction))
    return
  }

  const rotateMatch = /^\/game-sessions\/([^/]+)\/rotate$/.exec(pathname)
  if (request.method === 'POST' && rotateMatch !== null) {
    const sessionId = rotateMatch[1]
    checkUuid(sessionId, 'Game session id')

    const direction = readDirection<RotateDirection>(
      await readJsonBody(request),
      ['clockwise', 'counterclockwise'],
      'Rotate',
    )
    writeJson(response, HttpStatus.ok200, lifecycle.rotateSession(sessionId, direction))
    return
  }

  const tickMatch = /^\/game-sessions\/([^/]+)\/tick$/.exec(pathname)
  if (request.method === 'POST' && tickMatch !== null) {
    const sessionId = tickMatch[1]
    checkUuid(sessionId, 'Game session id')

    writeJson(response, HttpStatus.ok200, lifecycle.tickSession(sessionId))
    return
  }

  const dropMatch = /^\/game-sessions\/([^/]+)\/drop$/.exec(pathname)
  if (request.method === 'POST' && dropMatch !== null) {
    const sessionId = dropMatch[1]
    checkUuid(sessionId, 'Game session id')

    writeJson(response, HttpStatus.ok200, lifecycle.dropSession(sessionId))
    return
  }

  writeJson(response, HttpStatus.notFound404, {
    service: 'PentixServer',
    method: request.method ?? 'UNKNOWN',
    path: pathname,
    message:
      'PentixServer is running. Supported endpoints are POST /games, POST /game-sessions, POST /game-sessions/{id}/next-piece, POST /game-sessions/{id}/move, POST /game-sessions/{id}/rotate, POST /game-sessions/{id}/tick, POST /game-sessions/{id}/drop, POST /users, GET /users, and GET /users/{id}.',
  })
}

export function createPentixServer(
  context: PentixServerContext = {},
): Server {
  const lifecycle = new PentixGameLifecycle(
    context.createId ?? uuidv7,
    context.selectPieceId,
  )

  return createServer((request, response) => {
    handleRequest(request, response, lifecycle).catch((error: unknown) => {
      writeError(response, error)
    })
  })
}

export async function startPentixServer(
  options: PentixServerStartOptions = {},
): Promise<PentixServerHandle> {
  const host = options.host ?? process.env.PENTIX_SERVER_HOST ?? DEFAULT_HOST
  const configuredPort =
    options.port ?? Number(process.env.PENTIX_SERVER_PORT ?? DEFAULT_PORT)
  const server = createPentixServer(options.context)

  await new Promise<void>((resolve, reject) => {
    const handleError = (error: Error) => {
      server.off('listening', handleListening)
      reject(error)
    }

    const handleListening = () => {
      server.off('error', handleError)
      resolve()
    }

    server.once('error', handleError)
    server.once('listening', handleListening)
    server.listen(configuredPort, host)
  })

  const address = server.address()
  const port =
    typeof address === 'object' && address !== null
      ? address.port
      : configuredPort
  const normalizedHost =
    typeof address === 'object' &&
    address !== null &&
    address.address !== '::' &&
    address.address !== ''
      ? address.address
      : host

  return {
    server,
    url: `http://${formatHostForUrl(normalizedHost)}:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error)
            return
          }

          resolve()
        })
      }),
  }
}
