import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadPentixServerSettings } from './settings.js'
import { createStorageBackup } from './storage/backup.js'

async function main(): Promise<void> {
  const settings = loadPentixServerSettings()
  const { backupFile } = await createStorageBackup({
    dataFile: settings.dataFile,
    backupDirectory: settings.backupDirectory,
  })
  console.log(`PentixServer backup written to ${backupFile}`)
}

const executedPath = process.argv[1]
const currentPath = fileURLToPath(import.meta.url)

if (executedPath && path.resolve(executedPath) === currentPath) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
