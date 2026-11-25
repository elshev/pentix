import type { ContentfulStatusCode } from 'hono/utils/http-status'

export class HttpError extends Error {
  readonly statusCode: ContentfulStatusCode

  constructor(statusCode: ContentfulStatusCode, message: string) {
    super(message)
    this.name = 'HttpError'
    this.statusCode = statusCode
  }
}

export const HttpStatus = {
  ok200: 200,
  created201: 201,
  accepted202: 202,
  badRequest400: 400,
  notFound404: 404,
  conflict409: 409,
  unsupportedMediaType415: 415,
  internalServerError500: 500,
} as const

export function throwHttpErrorIf(
  condition: boolean,
  statusCode: ContentfulStatusCode,
  message: string,
): void {
  if (condition) {
    throw new HttpError(statusCode, message)
  }
}
