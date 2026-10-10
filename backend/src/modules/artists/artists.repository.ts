import type { Prisma } from '@prisma/client'
import { prisma } from '../../shared/db.js'
import { startAfter } from '../../shared/pagination.js'
import { escapeLike, type SearchWindow } from '../../shared/search.js'

export const artistSelect = {
  id: true,
  name: true,
  bio: true,
  imageUrl: true,
} satisfies Prisma.ArtistSelect

export type ArtistRow = Prisma.ArtistGetPayload<{ select: typeof artistSelect }>

export interface ListWindow {
  take: number
  afterId?: string
}

export const artistsRepository = {
  list: ({ take, afterId }: ListWindow) =>
    prisma.artist.findMany({
      select: artistSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      ...startAfter(afterId),
    }),

  findById: (id: string) => prisma.artist.findUnique({ where: { id }, select: artistSelect }),

  findByIds: (ids: string[]) =>
    prisma.artist.findMany({ where: { id: { in: ids } }, select: artistSelect }),

  findUnownedByName: (name: string) =>
    prisma.artist.findFirst({
      where: { name, ownerUserId: null },
      select: artistSelect,
      orderBy: { createdAt: 'asc' },
    }),

  create: (data: { name: string; bio?: string }) =>
    prisma.artist.create({ data, select: artistSelect }),

  /** Substring or fuzzy (trigram) match on the name, best match first. Uses artists_name_trgm_idx. */
  async searchIds({ query, take, skip }: SearchWindow) {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id
      FROM artists
      WHERE name ILIKE ${`%${escapeLike(query)}%`} OR ${query} <% name
      ORDER BY word_similarity(${query}, name) DESC, similarity(name, ${query}) DESC, id
      LIMIT ${take} OFFSET ${skip}`
    return rows.map((row) => row.id)
  },
}
