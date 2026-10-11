export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_CURSOR: 'INVALID_CURSOR',
  MALFORMED_JSON: 'MALFORMED_JSON',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  REFRESH_TOKEN_INVALID: 'REFRESH_TOKEN_INVALID',
  REFRESH_TOKEN_REUSED: 'REFRESH_TOKEN_REUSED',
  FORBIDDEN: 'FORBIDDEN',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  ARTIST_PROFILE_REQUIRED: 'ARTIST_PROFILE_REQUIRED',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  LAST_ADMIN: 'LAST_ADMIN',
  ALBUM_HAS_TRACKS: 'ALBUM_HAS_TRACKS',
  ARTIST_HAS_ALBUMS: 'ARTIST_HAS_ALBUMS',
  ARTIST_ALREADY_OWNED: 'ARTIST_ALREADY_OWNED',
  ARTIST_NAME_TAKEN: 'ARTIST_NAME_TAKEN',
  NAME_SIMILAR: 'NAME_SIMILAR',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  PROFILE_INCOMPLETE: 'PROFILE_INCOMPLETE',
  RELEASE_NOT_READY: 'RELEASE_NOT_READY',
  AMBIGUOUS_ALBUM: 'AMBIGUOUS_ALBUM',
  TRACK_ALREADY_IN_PLAYLIST: 'TRACK_ALREADY_IN_PLAYLIST',
  PLAYLIST_FULL: 'PLAYLIST_FULL',
  PLAYLIST_LIMIT_REACHED: 'PLAYLIST_LIMIT_REACHED',
  RATE_LIMITED: 'RATE_LIMITED',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  UNSUPPORTED_MEDIA_TYPE: 'UNSUPPORTED_MEDIA_TYPE',
  MEDIA_STORAGE_UNAVAILABLE: 'MEDIA_STORAGE_UNAVAILABLE',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

/** An error that is safe to show to the client. Anything else becomes a generic 500. */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const notFound = (resource: string) =>
  new AppError(404, ErrorCode.NOT_FOUND, `${resource} not found`)

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, ErrorCode.VALIDATION_ERROR, message, details)

export const unauthenticated = (message = 'Sign in to continue') =>
  new AppError(401, ErrorCode.UNAUTHENTICATED, message)

export const forbidden = (message = 'You do not have permission to do this') =>
  new AppError(403, ErrorCode.FORBIDDEN, message)
