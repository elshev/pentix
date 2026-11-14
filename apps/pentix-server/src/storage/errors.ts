/**
 * Raised when a storage implementation cannot open, read, or write its
 * backing store. The message is meant to be shown to an operator at startup.
 */
export class StorageError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'StorageError'
  }
}
