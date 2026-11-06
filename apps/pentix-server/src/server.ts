import { createAdaptorServer } from '@hono/node-server'
import type { Server } from 'node:http'

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

import { createPentixApp } from './app.js'
import { HttpError, HttpStatus } from './http.js'

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

export class PentixGameLifecycle {
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

function formatHostForUrl(host: string): string {
  if (host.startsWith('[') && host.endsWith(']')) {
    return host
  }

  return host.includes(':') ? `[${host}]` : host
}

export function createPentixServer(
  context: PentixServerContext = {},
): Server {
  const lifecycle = new PentixGameLifecycle(
    context.createId ?? uuidv7,
    context.selectPieceId,
  )
  const app = createPentixApp(lifecycle)

  return createAdaptorServer({ fetch: app.fetch }) as Server
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
