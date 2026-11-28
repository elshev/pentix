/** The OpenAPI document, the Swagger UI page, and the UI's local assets. */
import { createRequire } from 'node:module'

import { serveStatic } from '@hono/node-server/serve-static'
import { swaggerUI } from '@hono/swagger-ui'
import type { OpenAPIHono } from '@hono/zod-openapi'
import type { Env } from 'hono'

import { API_BASE_PATH, API_DOCUMENT_VERSION } from './version.js'

const require = createRequire(import.meta.url)

/** Where the generated OpenAPI 3.1 document is served. */
export const API_DOCUMENT_PATH = '/openapi.json'

/** Where the browser API console is served. */
export const API_REFERENCE_PATH = '/docs'

/** Where the console loads Swagger UI's stylesheet and bundle from. */
export const SWAGGER_UI_ASSET_PATH = `${API_REFERENCE_PATH}/swagger-ui-dist`

function resolveSwaggerUiAssets(): string {
  try {
    const swaggerUiDist = require('swagger-ui-dist') as {
      getAbsoluteFSPath?: () => string
    }
    const assets = swaggerUiDist.getAbsoluteFSPath?.()
    if (typeof assets === 'string' && assets.length > 0) {
      return assets
    }
  } catch {
    // Fall through to the explicit error below.
  }

  throw new Error(
    'swagger-ui-dist is not installed or its assets cannot be located. Run npm install before starting PentixServer.',
  )
}

/**
 * Serves the generated document and a Swagger UI that exercises it. Both are
 * plain Hono routes, so the document lists API operations only, and the
 * stylesheet and bundle come from the installed `swagger-ui-dist` package
 * rather than a CDN.
 */
export function registerApiReference<E extends Env>(
  app: OpenAPIHono<E>,
): void {
  const assetsDirectory = resolveSwaggerUiAssets()

  app.doc(API_DOCUMENT_PATH, (c) => ({
    openapi: '3.1.0',
    info: {
      title: 'PentixServer API',
      version: API_DOCUMENT_VERSION,
      description: `Users, Pentix games, game sessions, gameplay actions, background demo runs, and high scores. Every API endpoint carries the ${API_BASE_PATH} major-version prefix.`,
    },
    servers: [
      {
        url: new URL(c.req.url).origin,
        description: 'This server',
      },
    ],
  }))

  app.get(
    API_REFERENCE_PATH,
    swaggerUI({
      url: API_DOCUMENT_PATH,
      baseUrl: API_REFERENCE_PATH,
      title: 'PentixServer API',
      docExpansion: 'list',
      tryItOutEnabled: true,
    }),
  )

  app.use(
    `${SWAGGER_UI_ASSET_PATH}/*`,
    serveStatic({
      root: assetsDirectory,
      rewriteRequestPath: (requestPath) =>
        requestPath.slice(SWAGGER_UI_ASSET_PATH.length),
    }),
  )
}
