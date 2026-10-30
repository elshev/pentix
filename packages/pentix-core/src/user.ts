export interface User {
  readonly id: string
  readonly name: string
}

export interface CreateUserOptions {
  readonly id: string
  readonly name: string
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

export function createUser(options: CreateUserOptions): User {
  return Object.freeze({
    id: assertUserId(options.id),
    name: assertUserName(options.name),
  })
}
