import type { Actor, Role } from '../../shared/actor.js'
import { AppError, ErrorCode, notFound } from '../../shared/errors.js'
import { afterIdFrom, toIdPage, type PageRequest } from '../../shared/pagination.js'
import { usersRepository, type UserRow } from './users.repository.js'

export type User = UserRow

export const normalizeEmail = (email: string) => email.trim().toLowerCase()

async function requireUser(id: string) {
  const user = await usersRepository.findById(id)
  if (!user) throw notFound('User')
  return user
}

/** Blocks changes that would leave no active admin. */
async function assertNotLastAdmin(user: User) {
  if (user.role === 'admin' && !user.isDisabled) {
    const others = await usersRepository.countActiveAdminsExcept(user.id)
    if (others === 0) {
      throw new AppError(
        409,
        ErrorCode.LAST_ADMIN,
        'This is the last active admin; promote another admin first',
      )
    }
  }
}

export const usersService = {
  /** Current role and status, read fresh on every request so changes apply immediately. */
  getAccess: (id: string) => usersRepository.findAccess(id),

  getProfile: (id: string) => requireUser(id),

  updateProfile: (actor: Actor, changes: { displayName?: string; avatarUrl?: string | null }) =>
    usersRepository.update(actor.id, changes),

  findCredentialsByEmail: (email: string) =>
    usersRepository.findCredentialsByEmail(normalizeEmail(email)),

  getPasswordHash: (id: string) => usersRepository.findPasswordHash(id),

  setPasswordHash: (id: string, passwordHash: string) =>
    usersRepository.update(id, { passwordHash }),

  markEmailVerified: (id: string) =>
    usersRepository.update(id, { emailVerifiedAt: new Date() }),

  async changeEmail(id: string, email: string) {
    try {
      return await usersRepository.update(id, {
        email: normalizeEmail(email),
        emailVerifiedAt: null,
      })
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new AppError(409, ErrorCode.EMAIL_TAKEN, 'An account with this email already exists')
      }
      throw error
    }
  },

  async createAccount(input: {
    email: string
    passwordHash: string
    displayName: string
    role?: Role
  }) {
    try {
      return await usersRepository.create({ ...input, email: normalizeEmail(input.email) })
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new AppError(409, ErrorCode.EMAIL_TAKEN, 'An account with this email already exists')
      }
      throw error
    }
  },

  async list(page: PageRequest, filters: { query?: string; role?: Role }) {
    const rows = await usersRepository.list({
      take: page.limit + 1,
      afterId: afterIdFrom(page),
      ...filters,
    })
    return toIdPage(rows, page.limit)
  },

  async setRole(targetId: string, role: Role) {
    const user = await requireUser(targetId)
    if (user.role === role) return { user, previousRole: user.role }
    if (role !== 'admin') await assertNotLastAdmin(user)
    return { user: await usersRepository.update(targetId, { role }), previousRole: user.role }
  },

  async setDisabled(actor: Actor, targetId: string, disabled: boolean) {
    if (disabled && actor.id === targetId) {
      throw new AppError(409, ErrorCode.CONFLICT, 'You cannot disable your own account')
    }
    const user = await requireUser(targetId)
    if (disabled) await assertNotLastAdmin(user)
    return usersRepository.update(targetId, { isDisabled: disabled })
  },
}
