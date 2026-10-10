const CLOUDINARY_AUDIO = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\/)(.+)$/

/**
 * Builds a Cloudinary delivery URL that plays only the first `seconds` (the `du_` transformation).
 * Returns null for other hosts, which cannot be trimmed, and when previews are off (0 seconds).
 *
 * The full URL is still public on Cloudinary, so this is a product limit, not DRM. Real
 * enforcement needs private storage with signed URLs (Phase 2).
 */
export function previewAudioUrl(audioUrl: string, seconds: number): string | null {
  if (seconds <= 0) return null
  const match = CLOUDINARY_AUDIO.exec(audioUrl)
  return match ? `${match[1]}du_${seconds}/${match[2]}` : null
}
