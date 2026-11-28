import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Raised when the app settings file is missing, unreadable, or invalid. The
 * message names the settings file and is meant to be shown to an operator.
 */
export class SettingsError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'SettingsError'
  }
}

/** The keys the settings file holds. It carries no other key. */
const SETTING_KEYS = ['dataFile', 'backupDirectory'] as const

/** One key of the settings file. */
export type PentixServerSettingKey = (typeof SETTING_KEYS)[number]

/** The app settings of one `PentixServer` start. Every path is absolute. */
export interface PentixServerSettings {
  /** The settings file that this start read. */
  readonly settingsFile: string
  /** The SQLite file that holds users, games, and sessions. */
  readonly dataFile: string
  /** The folder that receives the backup files. */
  readonly backupDirectory: string
}

export interface LoadPentixServerSettingsOptions {
  /** The settings file to read. Defaults to `PENTIX_SERVER_SETTINGS_FILE`, then the shipped file. */
  readonly settingsFile?: string
  /** The environment that holds the overrides. Defaults to `process.env`. */
  readonly env?: NodeJS.ProcessEnv
}

/**
 * The shipped settings file, resolved from this module. `src/settings.ts` and
 * `dist/settings.js` both reach `apps/pentix-server/settings.json`, so the
 * working directory never decides which file is read.
 */
export const DEFAULT_SETTINGS_FILE = fileURLToPath(
  new URL('../settings.json', import.meta.url),
)

function fail(settingsFile: string, message: string, cause?: unknown): never {
  throw new SettingsError(`App settings '${settingsFile}' ${message}.`, cause)
}

/** Reads the settings file and returns its parsed JSON object. */
function readSettingsFile(settingsFile: string): Record<string, unknown> {
  let text: string

  try {
    text = readFileSync(settingsFile, 'utf8')
  } catch (error) {
    fail(settingsFile, 'cannot be read', error)
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch (error) {
    fail(settingsFile, 'is not valid JSON', error)
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    fail(settingsFile, 'must hold a JSON object')
  }

  return parsed as Record<string, unknown>
}

/** Reads one key as a non-empty string. */
function readPathSetting(
  settingsFile: string,
  source: Record<string, unknown>,
  key: PentixServerSettingKey,
): string {
  const value = source[key]

  if (typeof value !== 'string' || value.trim() === '') {
    fail(settingsFile, `must hold '${key}' as a non-empty string`)
  }

  return value.trim()
}

/**
 * Resolves one path. An environment value wins over the file value, and a
 * relative environment value resolves against the working directory. A
 * relative file value resolves against the folder that holds the settings file.
 */
function resolvePathSetting(
  settingsFolder: string,
  fileValue: string,
  override: string | undefined,
): string {
  const trimmedOverride = override?.trim()

  if (trimmedOverride !== undefined && trimmedOverride !== '') {
    return path.resolve(trimmedOverride)
  }

  return path.resolve(settingsFolder, fileValue)
}

/**
 * Loads the app settings of one server start. Throws `SettingsError` when the
 * file is missing, unreadable, not valid JSON, holds an unknown key, lacks a
 * key, or holds an empty or non-string value.
 */
export function loadPentixServerSettings(
  options: LoadPentixServerSettingsOptions = {},
): PentixServerSettings {
  const env = options.env ?? process.env
  const configuredSettingsFile =
    options.settingsFile ?? env.PENTIX_SERVER_SETTINGS_FILE?.trim()
  const settingsFile = path.resolve(
    configuredSettingsFile !== undefined && configuredSettingsFile !== ''
      ? configuredSettingsFile
      : DEFAULT_SETTINGS_FILE,
  )
  const source = readSettingsFile(settingsFile)

  for (const key of Object.keys(source)) {
    if (!(SETTING_KEYS as readonly string[]).includes(key)) {
      fail(settingsFile, `holds the unknown key '${key}'`)
    }
  }

  const settingsFolder = path.dirname(settingsFile)
  const fileDataFile = readPathSetting(settingsFile, source, 'dataFile')
  const fileBackupDirectory = readPathSetting(
    settingsFile,
    source,
    'backupDirectory',
  )

  return {
    settingsFile,
    dataFile: resolvePathSetting(
      settingsFolder,
      fileDataFile,
      env.PENTIX_DATA_FILE,
    ),
    backupDirectory: resolvePathSetting(
      settingsFolder,
      fileBackupDirectory,
      env.PENTIX_BACKUP_DIRECTORY,
    ),
  }
}
