/** Request identity helpers shared by the route schemas and handlers. */
import { validate, version } from 'uuid'

import { HttpStatus, throwHttpErrorIf } from './http.js'

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
