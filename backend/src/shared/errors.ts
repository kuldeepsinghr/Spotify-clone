export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_CURSOR: 'INVALID_CURSOR',
  MALFORMED_JSON: 'MALFORMED_JSON',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  ALBUM_HAS_TRACKS: 'ALBUM_HAS_TRACKS',
  AMBIGUOUS_ALBUM: 'AMBIGUOUS_ALBUM',
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
