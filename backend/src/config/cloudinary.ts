import { v2 as cloudinary } from 'cloudinary'
import { AppError, ErrorCode } from '../shared/errors.js'
import { env } from './env.js'

const configured = Boolean(
  env.CLOUDINARY_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_SECRET_KEY,
)

if (configured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_SECRET_KEY,
    secure: true,
  })
}

export interface UploadedMedia {
  url: string
  /** Present for audio uploads. */
  durationMs?: number
}

function failureMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'object' && error !== null && 'error' in error) {
    const inner = (error as { error?: { message?: string; code?: string } }).error
    if (inner?.message) return inner.message
    if (inner?.code) return `Media upload failed (${inner.code})`
  }
  return 'Media upload failed'
}

function isTransient(error: unknown): boolean {
  const code =
    (error as { code?: string }).code ??
    (error as { error?: { code?: string } }).error?.code
  return code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === 'EAI_AGAIN'
}

export async function uploadMedia(
  filePath: string,
  kind: 'image' | 'audio',
): Promise<UploadedMedia> {
  if (!configured) {
    throw new AppError(503, ErrorCode.MEDIA_STORAGE_UNAVAILABLE, 'Media storage is not configured')
  }
  // Cloudinary files audio under the "video" resource type.
  let result
  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      result = await cloudinary.uploader.upload(filePath, {
        resource_type: kind === 'audio' ? 'video' : 'image',
      })
      lastError = undefined
      break
    } catch (error) {
      lastError = error
      if (attempt === 0 && isTransient(error)) continue
      throw new AppError(502, ErrorCode.MEDIA_STORAGE_UNAVAILABLE, failureMessage(error))
    }
  }
  if (!result) {
    throw new AppError(502, ErrorCode.MEDIA_STORAGE_UNAVAILABLE, failureMessage(lastError))
  }
  return {
    url: result.secure_url,
    durationMs:
      typeof result.duration === 'number' ? Math.round(result.duration * 1000) : undefined,
  }
}
