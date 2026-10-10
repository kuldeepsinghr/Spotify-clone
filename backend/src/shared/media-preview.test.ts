import { describe, expect, it } from 'vitest'
import { previewAudioUrl } from './media-preview.js'

describe('previewAudioUrl', () => {
  it('adds a duration transformation to Cloudinary audio URLs', () => {
    expect(
      previewAudioUrl('https://res.cloudinary.com/demo/video/upload/v1729520698/abc.mp3', 30),
    ).toBe('https://res.cloudinary.com/demo/video/upload/du_30/v1729520698/abc.mp3')
  })

  it('returns null for other hosts and when previews are off', () => {
    expect(previewAudioUrl('https://audio.test/abc.mp3', 30)).toBeNull()
    expect(previewAudioUrl('https://res.cloudinary.com/demo/video/upload/v1/abc.mp3', 0)).toBeNull()
  })
})
