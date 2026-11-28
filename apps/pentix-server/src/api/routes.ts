/** OpenAPI route contracts and handlers for the PentixServer REST API. */
import { createRoute, type RouteHandler } from '@hono/zod-openapi'

import { HttpError, HttpStatus } from '../http.js'
import { checkUuid } from '../request.js'
import { DEFAULT_DEMO_RUN_GAME_COUNT, type DemoRunService } from '../demo-runs.js'
import { buildHighScoreDetail } from '../high-score-details.js'
import type { HighScoreService } from '../high-scores.js'
import type { PentixGameLifecycle } from '../server.js'
import { writeJson } from './responses.js'
import {
  CreateGameRequestSchema,
  CreateGameSessionRequestSchema,
  CreateUserRequestSchema,
  DemoRunSnapshotSchema,
  ErrorResponseSchema,
  HighScoreDetailParamsSchema,
  HighScoreDetailQuerySchema,
  HighScoreDetailSchema,
  HighScoreListSchema,
  HighScoreQuerySchema,
  MoveRequestSchema,
  PentixGameSchema,
  PentixGameSessionSchema,
  RotateRequestSchema,
  StartDemoRunRequestSchema,
  UserListSchema,
  UserSchema,
  idParams,
} from './schemas.js'
import { versionedPath } from './version.js'

const createGameRoute = createRoute({
  method: 'post',
  path: versionedPath('/games'),
  tags: ['Games'],
  summary: 'Create a Pentix game',
  request: {
    body: {
      content: { 'application/json': { schema: CreateGameRequestSchema } },
      required: false,
    },
  },
  responses: {
    201: {
      description: 'The created game.',
      content: { 'application/json': { schema: PentixGameSchema } },
    },
    400: {
      description: 'The JSON body is malformed, oversized, or not a game request.',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    415: {
      description: 'A body was sent without a JSON content type.',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
})

const createGameSessionRoute = createRoute({
  method: 'post',
  path: versionedPath('/game-sessions'),
  tags: ['Sessions'],
  summary: 'Start a game session for a retained user',
  request: {
    body: {
      content: { 'application/json': { schema: CreateGameSessionRequestSchema } },
    },
  },
  responses: {
    201: {
      description: 'The started session.',
      content: { 'application/json': { schema: PentixGameSessionSchema } },
    },
    400: {
      description: 'The body, user id, or game id is invalid.',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'The user or game was not found.',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    415: {
      description: 'A body was sent without a JSON content type.',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
})

const createUserRoute = createRoute({
  method: 'post',
  path: versionedPath('/users'),
  tags: ['Users'],
  summary: 'Create a user',
  request: {
    body: {
      content: { 'application/json': { schema: CreateUserRequestSchema } },
    },
  },
  responses: {
    201: {
      description: 'The created user.',
      content: { 'application/json': { schema: UserSchema } },
    },
    400: {
      description: 'The body or name is invalid.',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: 'A user with that name already exists.',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    415: {
      description: 'A body was sent without a JSON content type.',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
})

const listUsersRoute = createRoute({
  method: 'get',
  path: versionedPath('/users'),
  tags: ['Users'],
  summary: 'List retained users',
  responses: {
    200: {
      description: 'Every retained user.',
      content: { 'application/json': { schema: UserListSchema } },
    },
  },
})

const getUserRoute = createRoute({
  method: 'get',
  path: versionedPath('/users/{id}'),
  tags: ['Users'],
  summary: 'Fetch one retained user',
  request: { params: idParams('User id') },
  responses: {
    200: {
      description: 'The user.',
      content: { 'application/json': { schema: UserSchema } },
    },
    400: {
      description: 'The id is not a UUIDv7 value.',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'No retained user has that id.',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
})

const nextPieceRoute = createRoute({
  method: 'post',
  path: versionedPath('/game-sessions/{id}/next-piece'),
  tags: ['Gameplay'],
  summary: 'Promote the preview to the active piece',
  request: { params: idParams('Game session id') },
  responses: {
    200: {
      description: 'The updated session.',
      content: { 'application/json': { schema: PentixGameSessionSchema } },
    },
    400: {
      description: 'The id is not a UUIDv7 value.',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'The session was not found.',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
})

const moveRoute = createRoute({
  method: 'post',
  path: versionedPath('/game-sessions/{id}/move'),
  tags: ['Gameplay'],
  summary: 'Shift the active piece one column',
  request: {
    params: idParams('Game session id'),
    body: {
      content: { 'application/json': { schema: MoveRequestSchema } },
    },
  },
  responses: {
    200: {
      description: 'The updated session.',
      content: { 'application/json': { schema: PentixGameSessionSchema } },
    },
    400: {
      description: 'The id or direction is invalid.',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'The session was not found.',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    415: {
      description: 'A body was sent without a JSON content type.',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
})

const rotateRoute = createRoute({
  method: 'post',
  path: versionedPath('/game-sessions/{id}/rotate'),
  tags: ['Gameplay'],
  summary: 'Rotate the active piece',
  request: {
    params: idParams('Game session id'),
    body: {
      content: { 'application/json': { schema: RotateRequestSchema } },
    },
  },
  responses: {
    200: {
      description: 'The updated session.',
      content: { 'application/json': { schema: PentixGameSessionSchema } },
    },
    400: {
      description: 'The id or direction is invalid.',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'The session was not found.',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    415: {
      description: 'A body was sent without a JSON content type.',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
})

const tickRoute = createRoute({
  method: 'post',
  path: versionedPath('/game-sessions/{id}/tick'),
  tags: ['Gameplay'],
  summary: 'Step gravity once',
  request: { params: idParams('Game session id') },
  responses: {
    200: {
      description: 'The updated session.',
      content: { 'application/json': { schema: PentixGameSessionSchema } },
    },
    400: {
      description: 'The id is not a UUIDv7 value.',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'The session was not found.',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
})

const dropRoute = createRoute({
  method: 'post',
  path: versionedPath('/game-sessions/{id}/drop'),
  tags: ['Gameplay'],
  summary: 'Hard-drop the active piece',
  request: { params: idParams('Game session id') },
  responses: {
    200: {
      description: 'The updated session.',
      content: { 'application/json': { schema: PentixGameSessionSchema } },
    },
    400: {
      description: 'The id is not a UUIDv7 value.',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'The session was not found.',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
})

const startDemoRunRoute = createRoute({
  method: 'post',
  path: versionedPath('/demo-runs'),
  tags: ['Demo runs'],
  summary: 'Start a background demo batch',
  request: {
    body: {
      content: { 'application/json': { schema: StartDemoRunRequestSchema } },
      required: false,
    },
  },
  responses: {
    202: {
      description: 'The queued run snapshot.',
      content: { 'application/json': { schema: DemoRunSnapshotSchema } },
    },
    400: {
      description: 'The body or game count is invalid.',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    415: {
      description: 'A body was sent without a JSON content type.',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
})

const getDemoRunRoute = createRoute({
  method: 'get',
  path: versionedPath('/demo-runs/{id}'),
  tags: ['Demo runs'],
  summary: 'Read a demo run',
  request: { params: idParams('Demo run id') },
  responses: {
    200: {
      description: 'The run snapshot.',
      content: { 'application/json': { schema: DemoRunSnapshotSchema } },
    },
    400: {
      description: 'The id is not a UUIDv7 value.',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'The run was not found or was evicted.',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
})

const listHighScoresRoute = createRoute({
  method: 'get',
  path: versionedPath('/high-scores'),
  tags: ['High scores'],
  summary: 'List the best finished sessions for one user type',
  request: { query: HighScoreQuerySchema },
  responses: {
    200: {
      description: 'The high-score table for the requested user type.',
      content: { 'application/json': { schema: HighScoreListSchema } },
    },
    400: {
      description: 'The type filter is missing or invalid.',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
})

const getHighScoreDetailRoute = createRoute({
  method: 'get',
  path: versionedPath('/high-scores/{sessionId}'),
  tags: ['High scores'],
  summary: 'Read one high-score row with its game and best sessions',
  request: {
    params: HighScoreDetailParamsSchema,
    query: HighScoreDetailQuerySchema,
  },
  responses: {
    200: {
      description: 'The row, its statistics, its game, and its best sessions.',
      content: { 'application/json': { schema: HighScoreDetailSchema } },
    },
    400: {
      description: 'The session id or the session count is invalid.',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'The row or its stored session log was not found.',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
})

/** Every API route, in registration order. The table below pairs them with handlers. */
export const PENTIX_ROUTE_CONFIGS = [
  createGameRoute,
  createGameSessionRoute,
  createUserRoute,
  listUsersRoute,
  getUserRoute,
  nextPieceRoute,
  moveRoute,
  rotateRoute,
  tickRoute,
  dropRoute,
  startDemoRunRoute,
  getDemoRunRoute,
  listHighScoresRoute,
  getHighScoreDetailRoute,
] as const

/** The documented `METHOD /path` keys, derived from the same configs the app registers. */
export function listPentixRouteKeys(): string[] {
  return PENTIX_ROUTE_CONFIGS.map(
    (route) => `${route.method.toUpperCase()} ${route.path}`,
  )
}

function readGameId(gameId: string | null | undefined): string | undefined {
  if (gameId === undefined || gameId === null) {
    return undefined
  }

  const trimmed = gameId.trim()
  if (trimmed.length === 0) {
    return undefined
  }

  checkUuid(trimmed, 'Game session gameId')
  return trimmed
}

/**
 * Pairs every route config with a handler that closes over the server services.
 * Handlers read validated input, so the schemas in `schemas.ts` own parsing.
 */
export function buildPentixRoutes(
  lifecycle: PentixGameLifecycle,
  demoRuns: DemoRunService,
  highScores: HighScoreService,
) {
  const createGame: RouteHandler<typeof createGameRoute> = async (c) => {
    const body = c.req.valid('json')
    return writeJson(
      c,
      HttpStatus.created201,
      await lifecycle.createGame(body?.name ?? ''),
    )
  }

  const createGameSession: RouteHandler<typeof createGameSessionRoute> = async (c) => {
    const body = c.req.valid('json')
    const userId = body.userId
    checkUuid(userId, 'Game session userId')
    return writeJson(
      c,
      HttpStatus.created201,
      await lifecycle.createSession(userId, readGameId(body.gameId)),
    )
  }

  const createUser: RouteHandler<typeof createUserRoute> = async (c) => {
    const { name } = c.req.valid('json')
    return writeJson(c, HttpStatus.created201, await lifecycle.createUser(name))
  }

  const listUsers: RouteHandler<typeof listUsersRoute> = (c) => {
    return writeJson(c, HttpStatus.ok200, { users: lifecycle.listUsers() })
  }

  const getUser: RouteHandler<typeof getUserRoute> = (c) => {
    const { id } = c.req.valid('param')
    const user = lifecycle.getUser(id)
    if (user === undefined) {
      throw new HttpError(HttpStatus.notFound404, `User ${id} was not found.`)
    }

    return writeJson(c, HttpStatus.ok200, user)
  }

  const nextPiece: RouteHandler<typeof nextPieceRoute> = async (c) => {
    const { id } = c.req.valid('param')
    return writeJson(c, HttpStatus.ok200, await lifecycle.advanceSession(id))
  }

  const move: RouteHandler<typeof moveRoute> = async (c) => {
    const { id } = c.req.valid('param')
    const { direction } = c.req.valid('json')
    return writeJson(c, HttpStatus.ok200, await lifecycle.move(id, direction))
  }

  const rotate: RouteHandler<typeof rotateRoute> = async (c) => {
    const { id } = c.req.valid('param')
    const { direction } = c.req.valid('json')
    return writeJson(c, HttpStatus.ok200, await lifecycle.rotate(id, direction))
  }

  const tick: RouteHandler<typeof tickRoute> = async (c) => {
    const { id } = c.req.valid('param')
    return writeJson(c, HttpStatus.ok200, await lifecycle.tick(id))
  }

  const drop: RouteHandler<typeof dropRoute> = async (c) => {
    const { id } = c.req.valid('param')
    return writeJson(c, HttpStatus.ok200, await lifecycle.drop(id))
  }

  const startDemoRun: RouteHandler<typeof startDemoRunRoute> = (c) => {
    const body = c.req.valid('json')
    const gameCount = body?.gameCount ?? DEFAULT_DEMO_RUN_GAME_COUNT
    return writeJson(
      c,
      HttpStatus.accepted202,
      demoRuns.startRun(gameCount),
    )
  }

  const getDemoRun: RouteHandler<typeof getDemoRunRoute> = (c) => {
    const { id } = c.req.valid('param')
    const run = demoRuns.getRun(id)
    if (run === undefined) {
      throw new HttpError(
        HttpStatus.notFound404,
        `Demo run ${id} was not found.`,
      )
    }

    return writeJson(c, HttpStatus.ok200, run)
  }

  const listHighScores: RouteHandler<typeof listHighScoresRoute> = (c) => {
    const { type } = c.req.valid('query')
    return writeJson(c, HttpStatus.ok200, {
      type,
      scores: highScores.list(type),
    })
  }

  const getHighScoreDetail: RouteHandler<
    typeof getHighScoreDetailRoute
  > = (c) => {
    const { sessionId } = c.req.valid('param')
    const { bestSessionCount } = c.req.valid('query')
    const detail = buildHighScoreDetail(
      lifecycle,
      highScores,
      sessionId,
      bestSessionCount,
    )
    if (detail === undefined) {
      throw new HttpError(
        HttpStatus.notFound404,
        `High score session ${sessionId} was not found.`,
      )
    }

    return writeJson(c, HttpStatus.ok200, detail)
  }

  return [
    { route: createGameRoute, handler: createGame },
    { route: createGameSessionRoute, handler: createGameSession },
    { route: createUserRoute, handler: createUser },
    { route: listUsersRoute, handler: listUsers },
    { route: getUserRoute, handler: getUser },
    { route: nextPieceRoute, handler: nextPiece },
    { route: moveRoute, handler: move },
    { route: rotateRoute, handler: rotate },
    { route: tickRoute, handler: tick },
    { route: dropRoute, handler: drop },
    { route: startDemoRunRoute, handler: startDemoRun },
    { route: getDemoRunRoute, handler: getDemoRun },
    { route: listHighScoresRoute, handler: listHighScores },
    { route: getHighScoreDetailRoute, handler: getHighScoreDetail },
  ] as const
}
