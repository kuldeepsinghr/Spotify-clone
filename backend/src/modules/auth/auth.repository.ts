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

  createOwnedArtist: (data: {
    name: string
    slug: string
    ownerUserId: string
    contactEmail: string
  }) =>
    prisma.artist.create({
      data: {
        name: data.name,
        slug: data.slug,
        ownerUserId: data.ownerUserId,
        status: 'draft',
        private: { create: { contactEmail: data.contactEmail, legalName: '' } },
      },
    }),

  findArtistName: (name: string) =>
    prisma.artist.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    }),

  similarArtistNames: (name: string) =>
    prisma.$queryRaw<{ name: string; verified: boolean }[]>`
      SELECT name, verified FROM artists
      WHERE word_similarity(${name}, name) > 0.55
      ORDER BY word_similarity(${name}, name) DESC
      LIMIT 5`,

  findSlug: (slug: string) => prisma.artist.findUnique({ where: { slug }, select: { id: true } }),

  createEmailToken: (data: { userId: string; tokenHash: string; expiresAt: Date }) =>
    prisma.emailVerificationToken.create({ data }),

  findEmailToken: (tokenHash: string) =>
    prisma.emailVerificationToken.findUnique({ where: { tokenHash } }),

  consumeEmailToken: (id: string) =>
    prisma.emailVerificationToken.update({ where: { id }, data: { usedAt: new Date() } }),

  createPasswordReset: (data: { userId: string; tokenHash: string; expiresAt: Date }) =>
    prisma.passwordResetToken.create({ data }),

  findPasswordReset: (tokenHash: string) =>
    prisma.passwordResetToken.findUnique({ where: { tokenHash } }),

  consumePasswordReset: (id: string) =>
    prisma.passwordResetToken.update({ where: { id }, data: { usedAt: new Date() } }),
}
