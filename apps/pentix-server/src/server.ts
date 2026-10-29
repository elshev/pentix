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
  type PentixGame,
  type PentixGameSession,
  type PieceIdSelector,
} from '../../../packages/pentix-core/dist/index.js'
import { v7 as uuidv7, validate, version } from 'uuid'

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

class HttpError extends Error {
  readonly statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.statusCode = statusCode
  }
}

class PentixGameLifecycle {
  private readonly games = new Map<string, PentixGame>()
  private readonly sessions = new Map<string, PentixGameSession>()
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

  createSession(gameId?: string): PentixGameSession {
    const game = gameId === undefined ? this.createGame() : this.getGame(gameId)
    if (game === undefined) {
      throw new HttpError(404, `PentixGame ${gameId} was not found.`)
    }

    const session = createPentixGameSession({
      id: this.createId(),
      game,
    })
    this.sessions.set(session.id, session)
    return session
  }

  advanceSession(sessionId: string): PentixGameSession {
    const session = this.sessions.get(sessionId)
    if (session === undefined) {
      throw new HttpError(404, `PentixGameSession ${sessionId} was not found.`)
    }

    const game = this.games.get(session.gameId)
    if (game === undefined) {
      throw new HttpError(404, `PentixGame ${session.gameId} was not found.`)
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
        reject(new HttpError(400, 'Request JSON body is too large.'))
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
    throw new HttpError(400, 'Request body must be valid JSON.')
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
    throw new HttpError(400, 'Game request body must be a JSON object.')
  }

  if (body.name === undefined) {
    return ''
  }

  if (typeof body.name !== 'string') {
    throw new HttpError(400, 'Game name must be a string when supplied.')
  }

  return body.name.trim()
}

function readOptionalGameId(body: unknown): string | undefined {
  if (body === undefined) {
    return undefined
  }

  if (!isJsonRecord(body)) {
    throw new HttpError(400, 'Game session request body must be a JSON object.')
  }

  if (body.gameId === undefined || body.gameId === null) {
    return undefined
  }

  if (typeof body.gameId !== 'string') {
    throw new HttpError(400, 'Game session gameId must be a string, null, or omitted.')
  }

  const gameId = body.gameId.trim()
  if (gameId.length === 0) {
    return undefined
  }

  if (!isUuidV7(gameId)) {
    throw new HttpError(400, 'Game session gameId must be a UUIDv7 value.')
  }

  return gameId
}

function isUuidV7(value: string): boolean {
  return validate(value) && version(value) === 7
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
  writeJson(response, 500, { message: 'Internal server error.' })
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
    writeJson(response, 201, lifecycle.createGame(name))
    return
  }

  if (request.method === 'POST' && pathname === '/game-sessions') {
    const gameId = readOptionalGameId(await readJsonBody(request))
    writeJson(response, 201, lifecycle.createSession(gameId))
    return
  }

  const nextPieceMatch = /^\/game-sessions\/([^/]+)\/next-piece$/.exec(
    pathname,
  )
  if (request.method === 'POST' && nextPieceMatch !== null) {
    const sessionId = nextPieceMatch[1]
    if (!isUuidV7(sessionId)) {
      throw new HttpError(400, 'Game session id must be a UUIDv7 value.')
    }

    writeJson(response, 200, lifecycle.advanceSession(sessionId))
    return
  }

  writeJson(response, 404, {
    service: 'PentixServer',
    method: request.method ?? 'UNKNOWN',
    path: pathname,
    message:
      'PentixServer is running. Supported endpoints are POST /games, POST /game-sessions, and POST /game-sessions/{id}/next-piece. Player and history endpoints are not implemented yet.',
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
