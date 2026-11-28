/** Zod schemas shared by the server routes and the generated OpenAPI document. */
import { z } from '@hono/zod-openapi'

import {
  PIECE_CATALOG,
  type ActivePieceState,
  type BoardCell,
  type BoardSnapshot,
  type GameSessionActionCounts,
  type GameSessionStatistics,
  type PentixGame,
  type PentixGameSession,
  type PieceKey,
  type User,
} from '../../../../packages/pentix-core/dist/index.js'
import type {
  DemoRunEngineStanding,
  DemoRunGameResult,
  DemoRunGameStanding,
  DemoRunSnapshot,
} from '../demo-runs.js'

const UUID_V7_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const UUID_V7_EXAMPLE = '018f0f3a-4a3f-7000-8000-000000000000'

const DEMO_ENGINE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const PIECE_KEYS = PIECE_CATALOG.map((piece) => piece.key) as [
  PieceKey,
  ...PieceKey[],
]

/** A UUIDv7 string, documented with its pattern and an example. */
export const UuidV7Schema = z
  .string()
  .regex(UUID_V7_PATTERN, 'Value must be a UUIDv7 value.')
  .openapi({ example: UUID_V7_EXAMPLE })

/** A path parameter that must be a UUIDv7 value, labelled by the entity id. */
export function idParams(label: string) {
  return z.object({
    id: z
      .string()
      .regex(UUID_V7_PATTERN, `${label} must be a UUIDv7 value.`)
      .openapi({
        param: { name: 'id', in: 'path' },
        example: UUID_V7_EXAMPLE,
      }),
  })
}

/** The `{ message }` envelope every rejection uses. */
export const ErrorResponseSchema = z
  .object({ message: z.string() })
  .openapi('ErrorResponse')

export const PieceKeySchema = z.enum(PIECE_KEYS).openapi('PieceKey')

export const RotationAngleSchema = z
  .union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)])
  .openapi('RotationAngle')

export const BoardCellSchema = z
  .object({
    row: z.number().int(),
    column: z.number().int(),
    isOccupied: z.boolean(),
    pieceKey: PieceKeySchema.optional(),
  })
  .openapi('BoardCell') satisfies z.ZodType<BoardCell>

export const BoardSnapshotSchema = z
  .object({
    width: z.number().int(),
    height: z.number().int(),
    rows: z
      .array(z.array(BoardCellSchema).readonly())
      .readonly(),
  })
  .openapi('BoardSnapshot') satisfies z.ZodType<BoardSnapshot>

export const UserTypeSchema = z.enum(['human', 'ai']).openapi('UserType')

export const UserSchema = z
  .object({
    id: UuidV7Schema,
    name: z.string().min(1),
    type: UserTypeSchema,
    engineId: z
      .string()
      .regex(DEMO_ENGINE_ID_PATTERN, 'Value must be a demo engine id.')
      .optional(),
  })
  .openapi('User') satisfies z.ZodType<User>

export const UserListSchema = z
  .object({
    users: z.array(UserSchema).readonly(),
  })
  .openapi('UserList')

export const PentixGameSchema = z
  .object({
    id: UuidV7Schema,
    name: z.string(),
    board: BoardSnapshotSchema,
    availablePieceIds: z.array(z.number().int()).readonly(),
    pieceIds: z.array(z.number().int()).readonly(),
  })
  .openapi('PentixGame') satisfies z.ZodType<PentixGame>

export const GameSessionStatusSchema = z
  .enum(['active', 'game-over'])
  .openapi('GameSessionStatus')

export const GameSessionActionCountsSchema = z
  .object({
    moves: z.number().int(),
    rotates: z.number().int(),
    drops: z.number().int(),
  })
  .openapi('GameSessionActionCounts') satisfies z.ZodType<GameSessionActionCounts>

export const GameSessionStatisticsSchema = z
  .object({
    score: z.number().int(),
    level: z.number().int(),
    clearedLines: z.number().int(),
    blocks: z.number().int(),
    actions: GameSessionActionCountsSchema,
    pieceCounts: z.record(PieceKeySchema, z.number().int()),
  })
  .openapi('GameSessionStatistics') satisfies z.ZodType<GameSessionStatistics>

export const ActivePieceStateSchema = z
  .object({
    key: PieceKeySchema,
    angle: RotationAngleSchema,
    origin: z.object({
      row: z.number().int(),
      column: z.number().int(),
    }),
  })
  .openapi('ActivePieceState') satisfies z.ZodType<ActivePieceState>

export const PentixGameSessionSchema = z
  .object({
    id: UuidV7Schema,
    userId: UuidV7Schema,
    gameId: UuidV7Schema,
    status: GameSessionStatusSchema,
    board: BoardSnapshotSchema,
    statistics: GameSessionStatisticsSchema,
    activePiece: ActivePieceStateSchema,
    nextPieceKey: PieceKeySchema,
    nextPieceIndex: z.number().int(),
  })
  .openapi('PentixGameSession') satisfies z.ZodType<PentixGameSession>

export const DemoRunStatusSchema = z
  .enum(['queued', 'running', 'completed', 'failed'])
  .openapi('DemoRunStatus')

export const DemoRunGameStandingSchema = z
  .object({
    engineId: z.string(),
    points: z.number(),
    lines: z.number().int(),
    pieces: z.number().int(),
    playingTimeMs: z.number(),
  })
  .openapi('DemoRunGameStanding') satisfies z.ZodType<DemoRunGameStanding>

export const DemoRunEngineStandingSchema = z
  .object({
    engineId: z.string(),
    name: z.string(),
    totalPoints: z.number(),
    totalLines: z.number().int(),
    totalPieces: z.number().int(),
    playingTimeMs: z.number(),
    playingTimePer1000PiecesMs: z.number().nullable(),
  })
  .openapi('DemoRunEngineStanding') satisfies z.ZodType<DemoRunEngineStanding>

export const DemoRunGameResultSchema = z
  .object({
    index: z.number().int().nonnegative(),
    id: UuidV7Schema,
    standings: z.array(DemoRunGameStandingSchema).readonly(),
  })
  .openapi('DemoRunGameResult') satisfies z.ZodType<DemoRunGameResult>

export const DemoRunSnapshotSchema = z
  .object({
    id: UuidV7Schema,
    status: DemoRunStatusSchema,
    gameCount: z.number().int(),
    completedGameCount: z.number().int(),
    engines: z.array(DemoRunEngineStandingSchema).readonly(),
    games: z.array(DemoRunGameResultSchema).readonly(),
    error: z.string().optional(),
  })
  .openapi('DemoRunSnapshot') satisfies z.ZodType<DemoRunSnapshot>

/** An object body that must be present. The required-body routes use it. */
export const CreateUserRequestSchema = z
  .object(
    {
      name: z
        .string({ error: 'User name is required.' })
        .trim()
        .min(1, 'User name must not be empty.'),
    },
    { error: 'User request body must be a JSON object.' },
  )
  .openapi('CreateUserRequest')

export const CreateGameRequestSchema = z.object(
  {
    name: z
      .string({ error: 'Game name must be a string when supplied.' })
      .trim()
      .optional(),
  },
  { error: 'Game request body must be a JSON object.' },
).openapi('CreateGameRequest')

export const CreateGameSessionRequestSchema = z
  .object(
    {
      userId: z.string({ error: 'Game session userId is required.' }).trim().min(1, 'Game session userId must be a string.'),
      gameId: z
        .union([
          z.string({ error: 'Game session gameId must be a string, null, or omitted.' }),
          z.null(),
        ])
        .optional(),
    },
    { error: 'Game session request body must be a JSON object.' },
  )
  .openapi('CreateGameSessionRequest')

export const MoveRequestSchema = z
  .object(
    {
      direction: z.enum(['left', 'right'], {
        error: 'Move direction must be one of: left, right.',
      }),
    },
    { error: 'Game session request body must be a JSON object.' },
  )
  .openapi('MoveRequest')

export const RotateRequestSchema = z
  .object(
    {
      direction: z.enum(['clockwise', 'counterclockwise'], {
        error: 'Rotate direction must be one of: clockwise, counterclockwise.',
      }),
    },
    { error: 'Game session request body must be a JSON object.' },
  )
  .openapi('RotateRequest')

const DEMO_RUN_GAME_COUNT_MESSAGE =
  'Demo run gameCount must be an integer from 1 to 256.'

export const StartDemoRunRequestSchema = z
  .object(
    {
      gameCount: z
        .number({ error: DEMO_RUN_GAME_COUNT_MESSAGE })
        .int(DEMO_RUN_GAME_COUNT_MESSAGE)
        .min(1, DEMO_RUN_GAME_COUNT_MESSAGE)
        .max(256, DEMO_RUN_GAME_COUNT_MESSAGE)
        .optional(),
    },
    { error: 'Demo run request body must be a JSON object.' },
  )
  .openapi('StartDemoRunRequest')
