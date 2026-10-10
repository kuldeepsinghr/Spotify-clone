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

export async function uploadMedia(
  filePath: string,
  kind: 'image' | 'audio',
): Promise<UploadedMedia> {
  if (!configured) {
    throw new AppError(503, ErrorCode.MEDIA_STORAGE_UNAVAILABLE, 'Media storage is not configured')
  }
  // Cloudinary files audio under the "video" resource type.
  const result = await cloudinary.uploader.upload(filePath, {
    resource_type: kind === 'audio' ? 'video' : 'image',
  })
  return {
    url: result.secure_url,
    durationMs:
      typeof result.duration === 'number' ? Math.round(result.duration * 1000) : undefined,
  }
}
