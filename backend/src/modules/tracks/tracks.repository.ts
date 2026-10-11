import type { Prisma } from '@prisma/client'
import { prisma } from '../../shared/db.js'
import { startAfter } from '../../shared/pagination.js'
import { escapeLike, type SearchWindow } from '../../shared/search.js'
import { publicTrackWhere } from '../../shared/visibility.js'

export const trackSelect = {
  id: true,
  title: true,
  description: true,
  trackNumber: true,
  discNumber: true,
  durationMs: true,
  isExplicit: true,
  audioUrl: true,
  imageUrl: true,
  album: { select: { id: true, title: true, coverUrl: true } },
  artist: { select: { id: true, name: true } },
} satisfies Prisma.TrackSelect

export type TrackRow = Prisma.TrackGetPayload<{ select: typeof trackSelect }>

export interface ListWindow {
  take: number
  afterId?: string
}

export interface TrackFilters {
  artistId?: string
}

export interface NewTrack {
  albumId: string
  artistId: string
  title: string
  description: string
  durationMs: number
  audioUrl: string
  imageUrl: string
}

export const tracksRepository = {
  list: ({ take, afterId }: ListWindow, { artistId }: TrackFilters = {}) =>
    prisma.track.findMany({
      where: { ...publicTrackWhere(), ...(artistId && { artistId }) },
      select: trackSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      ...startAfter(afterId),
    }),

  listOldestFirst: (take: number) =>
    prisma.track.findMany({
      where: publicTrackWhere(),
      select: trackSelect,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take,
    }),

  listByAlbum: (albumId: string, { take, afterId }: ListWindow) =>
    prisma.track.findMany({
      where: { albumId },
      select: trackSelect,
      orderBy: [{ trackNumber: 'asc' }, { id: 'asc' }],
      take,
      ...startAfter(afterId),
    }),

  findById: (id: string) => prisma.track.findUnique({ where: { id }, select: trackSelect }),

  findPublicById: (id: string) =>
    prisma.track.findFirst({ where: { id, ...publicTrackWhere() }, select: trackSelect }),

  hasExplicit: (albumId: string) =>
    prisma.track.count({ where: { albumId, isExplicit: true } }).then((count) => count > 0),

  findByIds: (ids: string[]) =>
    prisma.track.findMany({ where: { id: { in: ids } }, select: trackSelect }),

  countByAlbum: (albumId: string) => prisma.track.count({ where: { albumId } }),

  async albumStats(albumId: string) {
    const result = await prisma.track.aggregate({
      where: { albumId },
      _count: { _all: true },
      _sum: { durationMs: true },
    })
    return { trackCount: result._count._all, totalDurationMs: result._sum.durationMs ?? 0 }
  },

  /** Most played first; ties (and tracks never played) fall back to newest first. */
  async topIdsByArtist(artistId: string, take: number) {
    const rows = await prisma.$queryRaw<{ id: string; plays: number }[]>`
      SELECT t.id, count(p.id)::int AS plays
      FROM tracks t
      JOIN albums a ON a.id = t.album_id
      LEFT JOIN play_history p ON p.track_id = t.id
      WHERE t.artist_id = ${artistId}::uuid
        AND a.status::text = 'published'
        AND (a.released_at IS NULL OR a.released_at <= CURRENT_DATE)
        AND t.processing_status::text = 'ready'
      GROUP BY t.id
      ORDER BY count(p.id) DESC, t.created_at DESC, t.id
      LIMIT ${take}`
    return rows.map((row) => ({ id: row.id, plays: Number(row.plays) }))
  },

  /** Substring or fuzzy (trigram) match on the title, best match first. Uses tracks_title_trgm_idx. */
  async searchIds({ query, take, skip }: SearchWindow) {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT t.id
      FROM tracks t
      JOIN albums a ON a.id = t.album_id
      JOIN artists ar ON ar.id = a.artist_id
      WHERE t.processing_status::text = 'ready'
        AND a.status::text = 'published'
        AND ar.status::text = 'approved'
        AND (a.released_at IS NULL OR a.released_at <= CURRENT_DATE)
        AND (t.title ILIKE ${`%${escapeLike(query)}%`} OR ${query} <% t.title)
      ORDER BY word_similarity(${query}, t.title) DESC, similarity(t.title, ${query}) DESC, t.id
      LIMIT ${take} OFFSET ${skip}`
    return rows.map((row) => row.id)
  },

  /** Appends the track to the end of its album. */
  create: (track: NewTrack) =>
    prisma.$transaction(async (tx) => {
      const last = await tx.track.aggregate({
        where: { albumId: track.albumId },
        _max: { trackNumber: true },
      })
      return tx.track.create({
        data: { ...track, trackNumber: (last._max.trackNumber ?? 0) + 1 },
        select: trackSelect,
      })
    }),

  update: (id: string, data: { title?: string; description?: string; imageUrl?: string }) =>
    prisma.track.update({ where: { id }, data, select: trackSelect }),

  delete: (id: string) => prisma.track.delete({ where: { id }, select: { id: true } }),
}
