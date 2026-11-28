import { existsSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync, backup } from 'node:sqlite'

import { StorageError } from './errors.js'

/** The name suffix that every backup file carries. */
const BACKUP_FILE_SUFFIX = '-pentix.db'

export interface StorageBackupOptions {
  /** The data file to copy. */
  readonly dataFile: string
  /** The folder that receives the backup file. The run creates it when it is missing. */
  readonly backupDirectory: string
  /** The moment that names the file. Defaults to the current time. */
  readonly now?: Date
}

export interface StorageBackupResult {
  /** The absolute path of the written backup file. */
  readonly backupFile: string
  /** The absolute path of the copied data file. */
  readonly dataFile: string
  /** The absolute path of the backup folder. */
  readonly backupDirectory: string
}

/**
 * Formats a local date as `yyyyMMddHHmm`. The local clock decides every field,
 * so a name sort orders the backup files by their creation minute.
 */
export function formatBackupStamp(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0')

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
  ].join('')
}

/**
 * Writes one consistent copy of the data file into the backup folder. The copy
 * goes through the `node:sqlite` backup call, so it works while the server holds
 * the data file open and it never carries an uncommitted row. An existing
 * backup file is never replaced.
 */
export async function createStorageBackup(
  options: StorageBackupOptions,
): Promise<StorageBackupResult> {
  const dataFile = path.resolve(options.dataFile)
  const backupDirectory = path.resolve(options.backupDirectory)

  if (!existsSync(dataFile)) {
    throw new StorageError(
      `Cannot back up the data file '${dataFile}': the file does not exist.`,
    )
  }

  const backupFile = path.join(
    backupDirectory,
    `${formatBackupStamp(options.now ?? new Date())}${BACKUP_FILE_SUFFIX}`,
  )

  if (existsSync(backupFile)) {
    throw new StorageError(
      `Cannot write the backup file '${backupFile}': the file already exists.`,
    )
  }

  mkdirSync(backupDirectory, { recursive: true })

  const database = new DatabaseSync(dataFile, { readOnly: true })
  let failure: unknown

  try {
    await backup(database, backupFile)
  } catch (error) {
    failure = error
  } finally {
    database.close()
  }

  if (failure !== undefined) {
    rmSync(backupFile, { force: true })
    throw new StorageError(
      `Cannot write the backup file '${backupFile}': the copy failed.`,
      failure,
    )
  }

  return { backupFile, dataFile, backupDirectory }
}
