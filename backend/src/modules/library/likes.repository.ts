import { prisma } from '../../shared/db.js'

export interface LikeKey {
  likedAt: Date
  trackId: string
}

export const likesRepository = {
  /** Newest first. Keyset on (liked_at, track_id) so pages stay stable while likes change. */
  list: (userId: string, { take, after }: { take: number; after?: LikeKey }) =>
    prisma.likedTrack.findMany({
      where: {
        userId,
        ...(after && {
          OR: [
            { likedAt: { lt: after.likedAt } },
            { likedAt: after.likedAt, trackId: { lt: after.trackId } },
          ],
        }),
      },
      select: { trackId: true, likedAt: true },
      orderBy: [{ likedAt: 'desc' }, { trackId: 'desc' }],
      take,
    }),

  /** Idempotent: liking twice keeps the original time. */
  add: (userId: string, trackId: string) =>
    prisma.likedTrack.createMany({ data: [{ userId, trackId }], skipDuplicates: true }),

  remove: (userId: string, trackId: string) =>
    prisma.likedTrack.deleteMany({ where: { userId, trackId } }),

  async likedAmong(userId: string, trackIds: string[]) {
    const rows = await prisma.likedTrack.findMany({
      where: { userId, trackId: { in: trackIds } },
      select: { trackId: true },
    })
    return new Set(rows.map((row) => row.trackId))
  },
}
