import { validate, version } from 'uuid'

export class HttpError extends Error {
  readonly statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.statusCode = statusCode
  }
}

export const HttpStatus = {
  ok200: 200,
  created201: 201,
  badRequest400: 400,
  notFound404: 404,
  conflict409: 409,
  internalServerError500: 500,
} as const

export function throwHttpErrorIf(
  condition: boolean,
  statusCode: number,
  message: string,
): void {
  if (condition) {
    throw new HttpError(statusCode, message)
  }
}

export function isUuidV7(value: string): boolean {
  return validate(value) && version(value) === 7
}

export function checkUuid(value: string, label: string): void {
  throwHttpErrorIf(
    !isUuidV7(value),
    HttpStatus.badRequest400,
    `${label} must be a UUIDv7 value.`,
  )
}

export function isJsonRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function readOptionalName(body: unknown): string {
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

export function readOptionalGameId(body: unknown): string | undefined {
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

export function readDirection<T extends string>(
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

export function readRequiredName(body: unknown): string {
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

export function readRequiredUserId(body: unknown): string {
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
