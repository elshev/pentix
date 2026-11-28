import { createAdaptorServer } from '@hono/node-server'
import type { Server } from 'node:http'

import {
  advancePentixGameSession,
  createPentixGame,
  createPentixGameSession,
  createUser,
  demoEngineRegistry,
  gameSessionEngine,
  getPieceDefinition,
  replayPentixGameSession,
  type MoveDirection,
  type DemoEngine,
  type PentixGame,
  type PentixGameSession,
  type PieceIdSelector,
  type RotateDirection,
  type SessionAction,
  type SessionActionLog,
  type User,
} from '../../../packages/pentix-core/dist/index.js'
import { v7 as uuidv7 } from 'uuid'

import { createPentixApp } from './app.js'
import { DemoRunService } from './demo-runs.js'
import { HighScoreService } from './high-scores.js'
import { HttpError, HttpStatus } from './http.js'
import { createInMemoryStorage } from './storage/memory.js'
import type { PentixStorage } from './storage/repositories.js'

export interface PentixServerContext {
  readonly createId?: () => string
  readonly selectPieceId?: PieceIdSelector
  /**
   * Persistence used by the lifecycle. Defaults to in-memory storage so tests
   * and non-durable runs stay deterministic.
   */
  readonly storage?: PentixStorage
  /** The engines a demo run competes. Defaults to every registered engine. */
  readonly demoEngines?: readonly DemoEngine[]
  /** The level demo sessions open at. Defaults to the demo's starting level. */
  readonly demoStartingLevel?: number
  /** Millisecond clock used to time demo `plan` calls. Defaults to `performance.now()`. */
  readonly demoPlanClock?: () => number
  /** Clock used to stamp a high-score achievement date. Defaults to the real clock. */
  readonly highScoreClock?: () => Date
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

/** One retained session of a game, with its log and retained user. */
export interface GameSessionRecord {
  readonly session: PentixGameSession
  readonly log: SessionActionLog
  readonly user?: User
}

const DEFAULT_HOST = '127.0.0.1'
const DEFAULT_PORT = 3100

export class PentixGameLifecycle {
  private readonly games = new Map<string, PentixGame>()
  private readonly sessions = new Map<string, PentixGameSession>()
  private readonly sessionLogs = new Map<string, SessionActionLog>()
  private readonly sessionIdsByGame = new Map<string, Set<string>>()
  private readonly users = new Map<string, User>()
  private readonly createId: () => string
  private readonly selectPieceId?: PieceIdSelector
  private readonly storage: PentixStorage
  private readonly demoEngines: readonly DemoEngine[]
  private readonly highScores: HighScoreService

  constructor(
    createId: () => string,
    selectPieceId?: PieceIdSelector,
    storage: PentixStorage = createInMemoryStorage(),
    demoEngines: readonly DemoEngine[] = demoEngineRegistry.list(),
    highScores: HighScoreService = new HighScoreService(storage.highScores),
  ) {
    this.createId = createId
    this.selectPieceId = selectPieceId
    this.storage = storage
    this.demoEngines = demoEngines
    this.highScores = highScores
  }

  /**
   * Hydrates the working set from the repositories. Must run once before the
   * lifecycle accepts requests. `createPentixServer` starts the lifecycle during
   * startup.
   */
  async load(): Promise<void> {
    const [users, games, sessionLogs] = await Promise.all([
      this.storage.users.load(),
      this.storage.games.load(),
      this.storage.sessions.load(),
    ])

    this.users.clear()
    for (const user of users.users) {
      this.users.set(user.id, user)
    }

    await this.seedDemoEngineUsers()

    this.games.clear()
    for (const game of games.games) {
      this.games.set(game.id, game)
    }

    this.sessions.clear()
    this.sessionLogs.clear()
    this.sessionIdsByGame.clear()
    for (const log of sessionLogs.sessions) {
      const game = this.games.get(log.gameId)
      if (game === undefined) {
        throw new Error(
          `PentixGameSession ${log.sessionId} references missing PentixGame ${log.gameId}.`,
        )
      }

      const session = replayPentixGameSession(log, game)
      this.sessionLogs.set(log.sessionId, log)
      this.sessions.set(log.sessionId, session)
      this.indexSession(session)
    }

    // An upgraded store holds finished sessions but no score rows. Rebuild the
    // tables once from those sessions, using the UUIDv7 date of each session id.
    await this.highScores.backfill(
      this.sessions.values(),
      (userId) => this.users.get(userId),
    )
  }

  /**
   * Retains one AI user per configured demo engine. A retained row with the same
   * engine binding is reused, so a restart creates nothing twice.
   */
  private async seedDemoEngineUsers(): Promise<void> {
    const byEngineId = new Map<string, User>()
    for (const user of this.users.values()) {
      if (user.engineId !== undefined) {
        byEngineId.set(user.engineId, user)
      }
    }

    for (const engine of this.demoEngines) {
      if (byEngineId.has(engine.id)) {
        continue
      }

      const user = createUser({
        id: this.createId(),
        name: engine.name,
        type: 'ai',
        engineId: engine.id,
      })
      await this.storage.users.create(user)
      this.users.set(user.id, user)
      byEngineId.set(engine.id, user)
    }
  }

  async createGame(name = ''): Promise<PentixGame> {
    const game = createPentixGame({
      id: this.createId(),
      name,
      selectPieceId: this.selectPieceId,
    })
    await this.storage.games.create(game)
    this.games.set(game.id, game)
    return game
  }

  getGame(gameId: string): PentixGame | undefined {
    return this.games.get(gameId)
  }

  /** Returns the retained action log of one session, or `undefined`. */
  getSessionLog(sessionId: string): SessionActionLog | undefined {
    return this.sessionLogs.get(sessionId)
  }

  /** Returns the retained replayed session, or `undefined`. */
  getReplayedSession(sessionId: string): PentixGameSession | undefined {
    return this.sessions.get(sessionId)
  }

  /**
   * Returns every retained session of one game with its log and retained user.
   * The read uses the in-memory index and touches no repository.
   */
  listGameSessions(gameId: string): readonly GameSessionRecord[] {
    const sessionIds = this.sessionIdsByGame.get(gameId)
    if (sessionIds === undefined) {
      return Object.freeze([])
    }

    const records: GameSessionRecord[] = []
    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId)
      const log = this.sessionLogs.get(sessionId)
      if (session === undefined || log === undefined) {
        continue
      }

      const user = this.users.get(session.userId)
      records.push(
        Object.freeze({
          session,
          log,
          ...(user === undefined ? {} : { user }),
        }),
      )
    }

    return Object.freeze(records)
  }

  /** Adds one session id to its game's index. */
  private indexSession(session: PentixGameSession): void {
    const sessionIds =
      this.sessionIdsByGame.get(session.gameId) ?? new Set<string>()
    sessionIds.add(session.id)
    this.sessionIdsByGame.set(session.gameId, sessionIds)
  }

  /**
   * Retains a session that another service already stored, such as a finished
   * demo session. The caller owns the repository write, so this method touches
   * no storage.
   */
  retainSession(
    session: PentixGameSession,
    log: SessionActionLog,
    game: PentixGame,
  ): void {
    this.games.set(game.id, game)
    this.sessions.set(session.id, session)
    this.sessionLogs.set(log.sessionId, log)
    this.indexSession(session)
  }

  async createUser(name: string): Promise<User> {
    const normalizedName = name.trim()
    for (const existingUser of this.users.values()) {
      if (existingUser.name.toLowerCase() === normalizedName.toLowerCase()) {
        throw new HttpError(HttpStatus.conflict409, `User with name "${normalizedName}" already exists.`)
      }
    }

    const user = createUser({
      id: this.createId(),
      name: normalizedName,
      type: 'human',
    })
    await this.storage.users.create(user)
    this.users.set(user.id, user)
    return user
  }

  getUser(userId: string): User | undefined {
    return this.users.get(userId)
  }

  /** Returns the AI user id bound to a demo engine, or `undefined`. */
  getEngineUserId(engineId: string): string | undefined {
    for (const user of this.users.values()) {
      if (user.engineId === engineId) {
        return user.id
      }
    }

    return undefined
  }

  listUsers(): User[] {
    return [...this.users.values()]
  }

  async createSession(userId: string, gameId?: string): Promise<PentixGameSession> {
    if (this.getUser(userId) === undefined) {
      throw new HttpError(HttpStatus.notFound404, `User ${userId} was not found.`)
    }

    const game =
      gameId === undefined ? await this.createGame() : this.getGame(gameId)
    if (game === undefined) {
      throw new HttpError(HttpStatus.notFound404, `PentixGame ${gameId} was not found.`)
    }

    const session = createPentixGameSession({
      id: this.createId(),
      userId,
      game,
    })
    const log = this.createEmptyLog(session)
    await this.storage.sessions.create(log)
    this.sessionLogs.set(session.id, log)
    this.sessions.set(session.id, session)
    this.indexSession(session)
    return session
  }

  async advanceSession(sessionId: string): Promise<PentixGameSession> {
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
    await this.storage.games.save(result.game)
    this.games.set(result.game.id, result.game)
    this.sessions.set(result.session.id, result.session)
    await this.recordFinished(session, result.session)
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

  private createEmptyLog(session: PentixGameSession): SessionActionLog {
    return Object.freeze({
      sessionId: session.id,
      userId: session.userId,
      gameId: session.gameId,
      pieces: Object.freeze([]),
    })
  }

  private appendAction(
    log: SessionActionLog,
    session: PentixGameSession,
    action: SessionAction,
  ): SessionActionLog {
    const pieceId = getPieceDefinition(session.activePiece.key).id
    const pieces = log.pieces.map((piece) => ({
      pieceId: piece.pieceId,
      actions: piece.actions,
    }))

    const lastPiece = pieces[pieces.length - 1]
    if (lastPiece === undefined || lastPiece.pieceId !== pieceId) {
      pieces.push({ pieceId, actions: action })
    } else {
      lastPiece.actions += action
    }

    return Object.freeze({
      sessionId: log.sessionId,
      userId: log.userId,
      gameId: log.gameId,
      pieces: Object.freeze(
        pieces.map((piece) =>
          Object.freeze({ pieceId: piece.pieceId, actions: piece.actions }),
        ),
      ),
    })
  }

  private async persistAction(
    preOpSession: PentixGameSession,
    action: SessionAction,
    updatedSession: PentixGameSession,
    updatedGame?: PentixGame,
  ): Promise<PentixGameSession> {
    const log =
      this.sessionLogs.get(preOpSession.id) ??
      this.createEmptyLog(preOpSession)
    const nextLog = this.appendAction(log, preOpSession, action)

    await this.storage.sessions.save(nextLog)
    this.sessionLogs.set(preOpSession.id, nextLog)
    this.sessions.set(updatedSession.id, updatedSession)

    if (updatedGame !== undefined) {
      await this.storage.games.save(updatedGame)
      this.games.set(updatedGame.id, updatedGame)
    }

    await this.recordFinished(preOpSession, updatedSession)
    return updatedSession
  }

  /**
   * Submits one score when a session changes to `game-over`. The session log is
   * already stored, and a missing user leaves the tables alone.
   */
  private async recordFinished(
    before: PentixGameSession,
    after: PentixGameSession,
  ): Promise<void> {
    if (before.status === 'game-over' || after.status !== 'game-over') {
      return
    }

    const user = this.users.get(after.userId)
    if (user === undefined) {
      return
    }

    await this.highScores.submit({
      sessionId: after.id,
      userId: user.id,
      name: user.name,
      type: user.type,
      score: after.statistics.score,
    })
  }

  async move(
    sessionId: string,
    direction: MoveDirection,
  ): Promise<PentixGameSession> {
    const { session } = this.resolveSession(sessionId)
    const updated = gameSessionEngine.move(session, direction)
    return this.persistAction(session, direction === 'left' ? 'L' : 'R', updated)
  }

  async rotate(
    sessionId: string,
    direction: RotateDirection,
  ): Promise<PentixGameSession> {
    const { session } = this.resolveSession(sessionId)
    const updated = gameSessionEngine.rotate(session, direction)
    return this.persistAction(
      session,
      direction === 'clockwise' ? 'C' : 'A',
      updated,
    )
  }

  async tick(sessionId: string): Promise<PentixGameSession> {
    const { session, game } = this.resolveSession(sessionId)
    const result = gameSessionEngine.tick(session, game, this.selectPieceId)
    return this.persistAction(session, 'T', result.session, result.game)
  }

  async drop(sessionId: string): Promise<PentixGameSession> {
    const { session, game } = this.resolveSession(sessionId)
    const result = gameSessionEngine.drop(session, game, this.selectPieceId)
    return this.persistAction(session, 'H', result.session, result.game)
  }
}

function formatHostForUrl(host: string): string {
  if (host.startsWith('[') && host.endsWith(']')) {
    return host
  }

  return host.includes(':') ? `[${host}]` : host
}

export async function createPentixServer(
  context: PentixServerContext = {},
): Promise<Server> {
  const storage = context.storage ?? createInMemoryStorage()
  const engines = context.demoEngines ?? demoEngineRegistry.list()
  const highScores = new HighScoreService(storage.highScores, context.highScoreClock)
  await highScores.load()
  const lifecycle = new PentixGameLifecycle(
    context.createId ?? uuidv7,
    context.selectPieceId,
    storage,
    engines,
    highScores,
  )
  await lifecycle.load()
  const demoRuns = new DemoRunService(context.createId ?? uuidv7, {
    selectPieceId: context.selectPieceId,
    engines,
    startingLevel: context.demoStartingLevel,
    clock: context.demoPlanClock,
    storage,
    highScores,
    resolveEngineUserId(engineId: string): string {
      const userId = lifecycle.getEngineUserId(engineId)
      if (userId === undefined) {
        throw new Error(`No AI user is bound to demo engine '${engineId}'.`)
      }

      return userId
    },
    resolveEngineUserName(engineId: string): string {
      const userId = lifecycle.getEngineUserId(engineId)
      const user = userId === undefined ? undefined : lifecycle.getUser(userId)
      return user?.name ?? engineId
    },
    retainSession(session, log, game) {
      lifecycle.retainSession(session, log, game)
    },
  })
  const app = createPentixApp(lifecycle, demoRuns, highScores)

  return createAdaptorServer({ fetch: app.fetch }) as Server
}

export async function startPentixServer(
  options: PentixServerStartOptions = {},
): Promise<PentixServerHandle> {
  const host = options.host ?? process.env.PENTIX_SERVER_HOST ?? DEFAULT_HOST
  const configuredPort =
    options.port ?? Number(process.env.PENTIX_SERVER_PORT ?? DEFAULT_PORT)
  const server = await createPentixServer(options.context)

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

export { DemoRunService }
export type {
  DemoRunEngineStanding,
  DemoRunGameResult,
  DemoRunGameStanding,
  DemoRunServiceOptions,
  DemoRunSnapshot,
  DemoRunStatus,
} from './demo-runs.js'
