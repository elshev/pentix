import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

/** The content type every JSON response keeps, including its charset. */
export const JSON_CONTENT_TYPE = 'application/json; charset=utf-8'

/**
 * Writes a JSON response with the server's exact content type and a status
 * literal, so route handlers stay typed against their declared responses.
 */
export function writeJson<T, S extends ContentfulStatusCode>(
  c: Context,
  statusCode: S,
  payload: T,
) {
  return c.json(payload, statusCode, {
    'content-type': JSON_CONTENT_TYPE,
  })
}
