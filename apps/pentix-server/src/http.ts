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
