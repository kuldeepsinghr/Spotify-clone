import type { Prisma } from '@prisma/client'
import { prisma } from '../../shared/db.js'
import { startAfter } from '../../shared/pagination.js'
import { escapeLike, type SearchWindow } from '../../shared/search.js'

export const trackSelect = {
  id: true,
  title: true,
  description: true,
  trackNumber: true,
  durationMs: true,
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
  list: ({ take, afterId }: ListWindow) =>
    prisma.track.findMany({
      select: trackSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      ...startAfter(afterId),
    }),

  listOldestFirst: (take: number) =>
    prisma.track.findMany({
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
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT t.id
      FROM tracks t
      LEFT JOIN play_history p ON p.track_id = t.id
      WHERE t.artist_id = ${artistId}::uuid
      GROUP BY t.id
      ORDER BY count(p.id) DESC, t.created_at DESC, t.id
      LIMIT ${take}`
    return rows.map((row) => row.id)
  },

  /** Substring or fuzzy (trigram) match on the title, best match first. Uses tracks_title_trgm_idx. */
  async searchIds({ query, take, skip }: SearchWindow) {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id
      FROM tracks
      WHERE title ILIKE ${`%${escapeLike(query)}%`} OR ${query} <% title
      ORDER BY word_similarity(${query}, title) DESC, similarity(title, ${query}) DESC, id
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

  delete: (id: string) => prisma.track.delete({ where: { id }, select: { id: true } }),
}
