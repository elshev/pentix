/**
 * The single owner of the PentixServer API version.
 *
 * Every route path is built through `versionedPath`, and the OpenAPI document
 * reads its version from this module. No other file repeats the version
 * segment.
 */
export const API_VERSION = '1'

/** The major-version path prefix that every API endpoint carries. */
export const API_BASE_PATH = `/v${API_VERSION}`

/** The version the OpenAPI document reports in its `info.version` field. */
export const API_DOCUMENT_VERSION = `${API_VERSION}.0.0`

/** Prefixes one API path with the current major version, such as `/v1/users`. */
export function versionedPath(path: string): string {
  return `${API_BASE_PATH}${path}`
}
