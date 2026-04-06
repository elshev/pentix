import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { startPentixServer } from './server.js'

async function main(): Promise<void> {
  const { url } = await startPentixServer()
  console.log(`PentixServer bootstrap listening on ${url}`)
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
