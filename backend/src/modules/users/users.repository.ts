import type { Prisma, Role } from '@prisma/client'
import { prisma } from '../../shared/db.js'
import { startAfter } from '../../shared/pagination.js'

/** Everything that may be shown to the user or an admin. Never includes the password hash. */
export const userSelect = {
  id: true,
  email: true,
  displayName: true,
  avatarUrl: true,
  role: true,
  isDisabled: true,
  createdAt: true,
  artist: { select: { id: true, name: true } },
} satisfies Prisma.UserSelect

export type UserRow = Prisma.UserGetPayload<{ select: typeof userSelect }>

export interface UserListWindow {
  take: number
  afterId?: string
  query?: string
  role?: Role
}

export const usersRepository = {
  findById: (id: string) => prisma.user.findUnique({ where: { id }, select: userSelect }),

  findAccess: (id: string) =>
    prisma.user.findUnique({ where: { id }, select: { id: true, role: true, isDisabled: true } }),

  findCredentialsByEmail: (email: string) =>
    prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, displayName: true, passwordHash: true, isDisabled: true },
    }),

  findPasswordHash: async (id: string) =>
    (await prisma.user.findUnique({ where: { id }, select: { passwordHash: true } }))?.passwordHash,

  create: (data: { email: string; passwordHash: string; displayName: string; role?: Role }) =>
    prisma.user.create({ data, select: userSelect }),

  update: (id: string, data: Prisma.UserUpdateInput) =>
    prisma.user.update({ where: { id }, data, select: userSelect }),

  list: ({ take, afterId, query, role }: UserListWindow) =>
    prisma.user.findMany({
      where: {
        ...(role && { role }),
        ...(query && {
          OR: [
            { email: { contains: query, mode: 'insensitive' } },
            { displayName: { contains: query, mode: 'insensitive' } },
          ],
        }),
      },
      select: userSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      ...startAfter(afterId),
    }),

  countActiveAdminsExcept: (id: string) =>
    prisma.user.count({ where: { role: 'admin', isDisabled: false, id: { not: id } } }),
}
