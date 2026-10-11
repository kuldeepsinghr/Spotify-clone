import { prisma } from '../../shared/db.js'
import { startAfter } from '../../shared/pagination.js'

const playSelect = { id: true, trackId: true, playedAt: true } as const

export const historyRepository = {
  /** Newest first. IDs are UUIDv7, so ID order is play order. */
  list: (userId: string, { take, afterId }: { take: number; afterId?: string }) =>
    prisma.playHistory.findMany({
      where: { userId },
      select: playSelect,
      orderBy: [{ playedAt: 'desc' }, { id: 'desc' }],
      take,
      ...startAfter(afterId),
    }),

  lastPlayOf: (userId: string, trackId: string) =>
    prisma.playHistory.findFirst({
      where: { userId, trackId },
      select: { playedAt: true },
      orderBy: { playedAt: 'desc' },
    }),

  create: (userId: string, trackId: string, msPlayed = 0) =>
    prisma.playHistory.create({ data: { userId, trackId, msPlayed }, select: playSelect }),

  clear: (userId: string) => prisma.playHistory.deleteMany({ where: { userId } }),
}
