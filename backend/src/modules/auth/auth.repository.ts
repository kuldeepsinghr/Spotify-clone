import { prisma } from '../../shared/db.js'

export interface NewRefreshToken {
  userId: string
  tokenHash: string
  familyId: string
  expiresAt: Date
}

export const authRepository = {
  createRefreshToken: (data: NewRefreshToken) =>
    prisma.refreshToken.create({ data, select: { id: true } }),

  /**
   * Revokes the token and stores its successor in one transaction. Returns false, changing
   * nothing, when the token was already revoked. A concurrent rotation of the same token waits
   * for this one to commit, so it then sees the successor as active.
   */
  rotate: (id: string, successor: NewRefreshToken) =>
    prisma.$transaction(async (tx) => {
      const { count } = await tx.refreshToken.updateMany({
        where: { id, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      if (count === 0) return false
      await tx.refreshToken.create({ data: successor, select: { id: true } })
      return true
    }),

  familyHasActiveToken: async (familyId: string) =>
    (await prisma.refreshToken.count({
      where: { familyId, revokedAt: null, expiresAt: { gt: new Date() } },
    })) > 0,

  findRefreshToken: (tokenHash: string) =>
    prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, familyId: true, expiresAt: true, revokedAt: true },
    }),

  revokeFamily: (familyId: string) =>
    prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),

  revokeAllForUser: (userId: string) =>
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
}
