import type { Context, Env } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { OpenAPIHono, type OpenAPIHonoOptions } from '@hono/zod-openapi'
import type { ZodError } from 'zod'

import { buildPentixRoutes, listPentixRouteKeys } from './api/routes.js'
import {
  API_DOCUMENT_PATH,
  API_REFERENCE_PATH,
  registerApiReference,
} from './api/docs.js'
import { writeJson } from './api/responses.js'
import { HttpError, HttpStatus } from './http.js'
import type { DemoRunService } from './demo-runs.js'
import type { PentixGameLifecycle } from './server.js'

const MAX_JSON_BODY_BYTES = 1024 * 1024

const NOT_FOUND_MESSAGE = `PentixServer is running. Supported endpoints are ${listPentixRouteKeys().join(', ')}. The API reference is at GET ${API_REFERENCE_PATH} and its OpenAPI document at GET ${API_DOCUMENT_PATH}.`

type ValidationHook = NonNullable<OpenAPIHonoOptions<Env>['defaultHook']>

/** Turns a failed route validation into the server's `{ message }` envelope. */
const defaultHook: ValidationHook = (result, c) => {
  if (result.success) {
    return undefined
  }

  return writeJson(c, HttpStatus.badRequest400, {
    message: firstIssueMessage(result.error),
  })
}

function firstIssueMessage(error: ZodError): string {
  const [issue] = error.issues
  return issue?.message ?? 'Request validation failed.'
}

/**
 * Rejects request bodies over the 1 MiB cap before any validator runs. The
 * body is read through Hono's cache, so the route validator re-parses the same
 * bytes instead of a consumed stream.
 */
async function capJsonBody(
  c: Context,
  next: () => Promise<void>,
): Promise<void> {
  const declaredLength = c.req.header('content-length')
  if (declaredLength !== undefined) {
    const declaredBytes = Number(declaredLength)
    if (
      Number.isFinite(declaredBytes) &&
      declaredBytes > MAX_JSON_BODY_BYTES
    ) {
      throw new HttpError(
        HttpStatus.badRequest400,
        'Request JSON body is too large.',
      )
    }
  }

  if (c.req.raw.body !== null) {
    const rawBody = await c.req.text()
    if (Buffer.byteLength(rawBody, 'utf8') > MAX_JSON_BODY_BYTES) {
      throw new HttpError(
        HttpStatus.badRequest400,
        'Request JSON body is too large.',
      )
    }
  }

  await next()
}

export function createPentixApp(
  lifecycle: PentixGameLifecycle,
  demoRuns: DemoRunService,
): OpenAPIHono {
  const app = new OpenAPIHono({ defaultHook })

  app.use('*', capJsonBody)
  app.openapiRoutes(buildPentixRoutes(lifecycle, demoRuns))
  registerApiReference(app)

  app.notFound((c) => {
    return writeJson(c, HttpStatus.notFound404, {
      service: 'PentixServer',
      method: c.req.method,
      path: c.req.path,
      message: NOT_FOUND_MESSAGE,
    })
  })

  app.onError((error, c) => {
    if (error instanceof HttpError) {
      return writeJson(c, error.statusCode, { message: error.message })
    }

    if (error instanceof HTTPException) {
      return writeJson(c, error.status, { message: error.message })
    }

    console.error(error)
    return writeJson(c, HttpStatus.internalServerError500, {
      message: 'Internal server error.',
    })
  })

  return app as OpenAPIHono
}
