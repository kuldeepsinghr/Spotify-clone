import type { Prisma } from '@prisma/client'
import { prisma } from '../../shared/db.js'
import { startAfter } from '../../shared/pagination.js'
import { escapeLike, type SearchWindow } from '../../shared/search.js'

export const artistSelect = {
  id: true,
  name: true,
  slug: true,
  bio: true,
  imageUrl: true,
  bannerImageUrl: true,
  artistType: true,
  country: true,
  city: true,
  verified: true,
} satisfies Prisma.ArtistSelect

export type ArtistRow = Prisma.ArtistGetPayload<{ select: typeof artistSelect }>

export interface ListWindow {
  take: number
  afterId?: string
}

export const artistsRepository = {
  list: ({ take, afterId }: ListWindow) =>
    prisma.artist.findMany({
      where: { status: 'approved' },
      select: artistSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      ...startAfter(afterId),
    }),

  findById: (id: string) => prisma.artist.findUnique({ where: { id }, select: artistSelect }),

  findPublicById: (id: string) =>
    prisma.artist.findFirst({ where: { id, status: 'approved' }, select: artistSelect }),

  findPublicBySlug: (slug: string) =>
    prisma.artist.findFirst({ where: { slug, status: 'approved' }, select: artistSelect }),

  findByIds: (ids: string[]) =>
    prisma.artist.findMany({ where: { id: { in: ids } }, select: artistSelect }),

  findUnownedByName: (name: string) =>
    prisma.artist.findFirst({
      where: { name, ownerUserId: null },
      select: artistSelect,
      orderBy: { createdAt: 'asc' },
    }),

  findByOwner: (userId: string) =>
    prisma.artist.findUnique({ where: { ownerUserId: userId }, select: artistSelect }),

  findOwnerUserId: async (id: string) =>
    (await prisma.artist.findUnique({ where: { id }, select: { ownerUserId: true } }))?.ownerUserId,

  create: (data: { name: string; bio?: string; imageUrl?: string; ownerUserId?: string }) =>
    prisma.artist.create({ data, select: artistSelect }),

  update: (id: string, data: { name?: string; bio?: string; imageUrl?: string }) =>
    prisma.artist.update({ where: { id }, data, select: artistSelect }),

  /** Moves ownership in one transaction: the user's previous profile is released first. */
  setOwner: (artistId: string, userId: string) =>
    prisma.$transaction(async (tx) => {
      await tx.artist.updateMany({
        where: { ownerUserId: userId, id: { not: artistId } },
        data: { ownerUserId: null },
      })
      return tx.artist.update({
        where: { id: artistId },
        data: { ownerUserId: userId },
        select: artistSelect,
      })
    }),

  releaseOwnership: (userId: string) =>
    prisma.artist.updateMany({ where: { ownerUserId: userId }, data: { ownerUserId: null } }),

  delete: (id: string) => prisma.artist.delete({ where: { id }, select: { id: true } }),

  publicDetails: (id: string) =>
    prisma.artist.findUnique({
      where: { id },
      select: {
        longBio: true,
        languages: true,
        yearFormed: true,
        links: { select: { platform: true, url: true } },
        members: { select: { name: true, role: true }, orderBy: { position: 'asc' } },
        gallery: { select: { imageUrl: true }, orderBy: { position: 'asc' } },
        genres: { select: { genre: { select: { id: true, name: true, slug: true } } } },
        _count: { select: { albums: { where: { status: 'published' } } } },
      },
    }),

  async monthlyListeners(id: string) {
    const since = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)
    const rows = await prisma.$queryRaw<{ listeners: number }[]>`
      SELECT COUNT(DISTINCT ph.user_id)::int AS listeners
      FROM play_history ph
      JOIN tracks t ON t.id = ph.track_id
      WHERE t.artist_id = ${id}::uuid
        AND ph.played_at >= ${since}`
    return Number(rows[0]?.listeners ?? 0)
  },

  /** Substring or fuzzy (trigram) match on the name, best match first. Uses artists_name_trgm_idx. */
  async searchIds({ query, take, skip }: SearchWindow) {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id
      FROM artists
      WHERE status::text = 'approved'
        AND (name ILIKE ${`%${escapeLike(query)}%`} OR ${query} <% name)
      ORDER BY word_similarity(${query}, name) DESC, similarity(name, ${query}) DESC, id
      LIMIT ${take} OFFSET ${skip}`
    return rows.map((row) => row.id)
  },
}
