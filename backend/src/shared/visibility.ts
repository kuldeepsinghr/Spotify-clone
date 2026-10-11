import type { Prisma } from '@prisma/client'

/** Start of today in UTC, matching the date-only release column. */
export function todayUtc(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

/** Listener-visible releases: published, not scheduled for later, by an approved artist. */
export function publicAlbumWhere(now = new Date()): Prisma.AlbumWhereInput {
  return {
    status: 'published',
    releasedAt: { lte: todayUtc(now) },
    artist: { status: 'approved' },
  }
}

/**
 * Albums with no release date stay visible. `releasedAt: null` cannot sit inside the same
 * object as `releasedAt: { lte }`, so callers that need both use this OR.
 */
export function publicAlbumFilter(now = new Date()): Prisma.AlbumWhereInput {
  const today = todayUtc(now)
  return {
    status: 'published',
    artist: { status: 'approved' },
    OR: [{ releasedAt: null }, { releasedAt: { lte: today } }],
  }
}

export function publicTrackWhere(now = new Date()): Prisma.TrackWhereInput {
  return { processingStatus: 'ready', album: publicAlbumFilter(now) }
}
