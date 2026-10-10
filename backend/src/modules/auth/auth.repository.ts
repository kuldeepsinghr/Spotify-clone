import { prisma } from '../../shared/db.js'

export const authRepository = {
  createRefreshToken: (data: {
    userId: string
    tokenHash: string
    familyId: string
    expiresAt: Date
  }) => prisma.refreshToken.create({ data, select: { id: true } }),

  findRefreshToken: (tokenHash: string) =>
    prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, familyId: true, expiresAt: true, revokedAt: true },
    }),

  /** Revokes the token only if it is still active; false means another request already used it. */
  async revokeIfActive(id: string) {
    const { count } = await prisma.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    return count === 1
  },

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
