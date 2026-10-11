import type { Prisma } from '@prisma/client'
import { prisma } from '../../shared/db.js'
import { startAfter } from '../../shared/pagination.js'
import { escapeLike, type SearchWindow } from '../../shared/search.js'
import { publicAlbumFilter } from '../../shared/visibility.js'

export const albumSelect = {
  id: true,
  title: true,
  description: true,
  bgColor: true,
  coverUrl: true,
  releasedAt: true,
  type: true,
  label: true,
  copyrightC: true,
  copyrightP: true,
  artist: { select: { id: true, name: true } },
} satisfies Prisma.AlbumSelect

export type AlbumRow = Prisma.AlbumGetPayload<{ select: typeof albumSelect }>

export interface ListWindow {
  take: number
  afterId?: string
}

export interface NewAlbum {
  artistId: string
  title: string
  description: string
  bgColor: string
  coverUrl: string
  releasedAt?: Date
}

export interface AlbumChanges {
  title?: string
  description?: string
  bgColor?: string
  coverUrl?: string
  releasedAt?: Date | null
}

export const albumsRepository = {
  list: ({ take, afterId }: ListWindow) =>
    prisma.album.findMany({
      where: publicAlbumFilter(),
      select: albumSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      ...startAfter(afterId),
    }),

  listOldestFirst: (take: number) =>
    prisma.album.findMany({
      where: publicAlbumFilter(),
      select: albumSelect,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take,
    }),

  listByArtist: (artistId: string, { take, afterId }: ListWindow) =>
    prisma.album.findMany({
      where: { artistId, ...publicAlbumFilter() },
      select: albumSelect,
      orderBy: [
        { releasedAt: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      take,
      ...startAfter(afterId),
    }),

  findById: (id: string) => prisma.album.findUnique({ where: { id }, select: albumSelect }),

  findPublicById: (id: string) =>
    prisma.album.findFirst({ where: { id, ...publicAlbumFilter() }, select: albumSelect }),

  findByIds: (ids: string[]) =>
    prisma.album.findMany({ where: { id: { in: ids } }, select: albumSelect }),

  /** At most two rows: enough to tell "exactly one" from "ambiguous". */
  findByExactTitle: (title: string) =>
    prisma.album.findMany({ where: { title }, select: albumSelect, take: 2 }),

  /** Substring or fuzzy (trigram) match on the title, best match first. Uses albums_title_trgm_idx. */
  async searchIds({ query, take, skip }: SearchWindow) {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT a.id
      FROM albums a
      JOIN artists ar ON ar.id = a.artist_id
      WHERE a.status::text = 'published'
        AND ar.status::text = 'approved'
        AND (a.released_at IS NULL OR a.released_at <= CURRENT_DATE)
        AND (a.title ILIKE ${`%${escapeLike(query)}%`} OR ${query} <% a.title)
      ORDER BY word_similarity(${query}, a.title) DESC, similarity(a.title, ${query}) DESC, a.id
      LIMIT ${take} OFFSET ${skip}`
    return rows.map((row) => row.id)
  },

  countByArtist: (artistId: string) => prisma.album.count({ where: { artistId } }),

  create: (album: NewAlbum) => prisma.album.create({ data: album, select: albumSelect }),

  update: (id: string, data: AlbumChanges) =>
    prisma.album.update({ where: { id }, data, select: albumSelect }),

  /**
   * Moves an album and its tracks to another artist atomically. This is the one place a
   * repository writes another module's table: tracks.artist_id must always equal the album's
   * artist, and the two updates cannot be split across services without losing atomicity.
   */
  reassignArtist: (id: string, artistId: string, data: AlbumChanges) =>
    prisma.$transaction(async (tx) => {
      await tx.track.updateMany({ where: { albumId: id }, data: { artistId } })
      return tx.album.update({ where: { id }, data: { ...data, artistId }, select: albumSelect })
    }),

  delete: (id: string) => prisma.album.delete({ where: { id }, select: { id: true } }),
}
