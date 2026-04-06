import { createServer, type Server } from 'node:http'

import type { Board, PieceDefinition } from '../../../packages/pentix-core/dist/index.js'

export interface PentixServerContext {
  readonly boardPrototype?: Board
  readonly supportedPieces?: readonly PieceDefinition[]
}

export interface PentixServerStartOptions {
  readonly host?: string
  readonly port?: number
  readonly context?: PentixServerContext
}

export interface PentixServerHandle {
  readonly server: Server
  readonly url: string
  close(): Promise<void>
}

const DEFAULT_HOST = '127.0.0.1'
const DEFAULT_PORT = 3100

function formatHostForUrl(host: string): string {
  if (host.startsWith('[') && host.endsWith(']')) {
    return host
  }

  return host.includes(':') ? `[${host}]` : host
}

export function createPentixServer(_context: PentixServerContext = {}): Server {
  void _context

  return createServer((request, response) => {
    response.statusCode = 404
    response.setHeader('content-type', 'application/json; charset=utf-8')
    response.end(
      JSON.stringify({
        service: 'PentixServer',
        method: request.method ?? 'UNKNOWN',
        path: request.url ?? '/',
        message:
          'PentixServer bootstrap is running. Player, PentixGame, and history endpoints are not implemented yet.',
      }),
    )
  })
}

export async function startPentixServer(
  options: PentixServerStartOptions = {},
): Promise<PentixServerHandle> {
  const host = options.host ?? process.env.PENTIX_SERVER_HOST ?? DEFAULT_HOST
  const configuredPort =
    options.port ?? Number(process.env.PENTIX_SERVER_PORT ?? DEFAULT_PORT)
  const server = createPentixServer(options.context)

  await new Promise<void>((resolve, reject) => {
    const handleError = (error: Error) => {
      server.off('listening', handleListening)
      reject(error)
    }

    const handleListening = () => {
      server.off('error', handleError)
      resolve()
    }

    server.once('error', handleError)
    server.once('listening', handleListening)
    server.listen(configuredPort, host)
  })

  const address = server.address()
  const port =
    typeof address === 'object' && address !== null
      ? address.port
      : configuredPort
  const normalizedHost =
    typeof address === 'object' &&
    address !== null &&
    address.address !== '::' &&
    address.address !== ''
      ? address.address
      : host

  return {
    server,
    url: `http://${formatHostForUrl(normalizedHost)}:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error)
            return
          }

          resolve()
        })
      }),
  }
}
