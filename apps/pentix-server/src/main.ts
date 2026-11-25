import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { API_DOCUMENT_PATH, API_REFERENCE_PATH } from './api/docs.js'
import { startPentixServer } from './server.js'
import { createSqliteStorage } from './storage/sqlite.js'

const DEFAULT_DATA_FILE = path.resolve('data', 'pentix.db')

async function main(): Promise<void> {
  const dataFile = path.resolve(
    process.env.PENTIX_DATA_FILE ?? DEFAULT_DATA_FILE,
  )
  const storage = createSqliteStorage({ dataFile })
  const { url } = await startPentixServer({ context: { storage } })
  console.log(`PentixServer bootstrap listening on ${url}`)
  console.log(`PentixServer API reference: ${url}${API_REFERENCE_PATH}`)
  console.log(`PentixServer OpenAPI document: ${url}${API_DOCUMENT_PATH}`)
  console.log(`PentixServer persisting users, games, and sessions to ${dataFile}`)
}

const executedPath = process.argv[1]
const currentPath = fileURLToPath(import.meta.url)

if (executedPath && path.resolve(executedPath) === currentPath) {
  main().catch((error) => {
    console.error('Failed to start PentixServer bootstrap.')
    console.error(error)
    process.exitCode = 1
  })
}
