import { rm } from 'node:fs/promises'
import { AppError, ErrorCode } from './errors.js'

/** An uploaded file waiting in the temp folder. Services receive this, never the HTTP request. */
export interface TempFile {
  path: string
  size: number
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_AUDIO_BYTES = 50 * 1024 * 1024

export function assertMaxSize(file: TempFile, maxBytes: number, label: string) {
  if (file.size > maxBytes) {
    throw new AppError(
      413,
      ErrorCode.PAYLOAD_TOO_LARGE,
      `${label} must be at most ${maxBytes / 1024 / 1024} MB`,
    )
  }
}

/** Runs `work`, then deletes the temp files whether it succeeded or not. */
export async function withCleanup<T>(
  files: (TempFile | undefined)[],
  work: () => Promise<T>,
): Promise<T> {
  try {
    return await work()
  } finally {
    await Promise.all(files.map((file) => file && rm(file.path, { force: true })))
  }
}
