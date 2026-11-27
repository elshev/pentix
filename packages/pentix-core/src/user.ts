/** User value object and its factory. */
import type { DemoEngineId } from './demo-engine.js'

/** What kind of player a user is. */
export type UserType = 'human' | 'ai'

export interface User {
  readonly id: string
  readonly name: string
  readonly type: UserType
  /** The demo engine an AI user belongs to. Absent on a human user. */
  readonly engineId?: DemoEngineId
}

export interface CreateUserOptions {
  readonly id: string
  readonly name: string
  /** Defaults to `human`. */
  readonly type?: UserType
  readonly engineId?: DemoEngineId
}

function assertUserId(id: string): string {
  const normalizedId = id.trim()
  if (normalizedId.length === 0) {
    throw new Error('User id must not be empty.')
  }

  return normalizedId
}

function assertUserName(name: string): string {
  const normalizedName = name.trim()
  if (normalizedName.length === 0) {
    throw new Error('User name must not be empty.')
  }

  return normalizedName
}

function assertEngineId(engineId: string): string {
  const normalizedEngineId = engineId.trim()
  if (normalizedEngineId.length === 0) {
    throw new Error('User engineId must not be empty.')
  }

  return normalizedEngineId
}

export function createUser(options: CreateUserOptions): User {
  const engineId =
    options.engineId === undefined
      ? undefined
      : assertEngineId(options.engineId)

  return Object.freeze({
    id: assertUserId(options.id),
    name: assertUserName(options.name),
    type: options.type ?? 'human',
    ...(engineId === undefined ? {} : { engineId }),
  })
}

