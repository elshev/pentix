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
