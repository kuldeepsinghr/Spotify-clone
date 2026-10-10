import { randomUUID } from 'node:crypto'
import { env } from '../../config/env.js'
import type { Actor } from '../../shared/actor.js'
import { AppError, ErrorCode } from '../../shared/errors.js'
import {
  assertStrongPassword,
  hashPassword,
  verifyAgainstDummy,
  verifyPassword,
} from '../../shared/password.js'
import { hashRefreshToken, newRefreshToken, signAccessToken } from '../../shared/tokens.js'
import { normalizeEmail, usersService, type User } from '../users/users.service.js'
import { authRepository } from './auth.repository.js'

export interface Session {
  user: User
  accessToken: string
  accessTokenExpiresIn: number
  /** Goes into the httpOnly cookie, never into a response body. */
  refreshToken: string
  refreshTokenExpiresAt: Date
}

const invalidCredentials = () =>
  new AppError(401, ErrorCode.INVALID_CREDENTIALS, 'Email or password is incorrect')

const invalidRefresh = () =>
  new AppError(401, ErrorCode.REFRESH_TOKEN_INVALID, 'Session expired; sign in again')

const accountDisabled = () =>
  new AppError(403, ErrorCode.ACCOUNT_DISABLED, 'This account has been disabled')

/**
 * Two tabs (or two apps on the same site) often refresh at the same moment with the same
 * cookie. A token rotated less than this long ago may still be exchanged, as long as its
 * family has not been revoked; older reuse is treated as theft.
 */
export const REFRESH_REUSE_GRACE_MS = 10_000

function newToken(userId: string, familyId: string) {
  const { token, hash } = newRefreshToken()
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000)
  return { token, record: { userId, tokenHash: hash, familyId, expiresAt } }
}

async function toSession(user: User, token: string, expiresAt: Date): Promise<Session> {
  return {
    user,
    accessToken: await signAccessToken(user.id),
    accessTokenExpiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
    refreshToken: token,
    refreshTokenExpiresAt: expiresAt,
  }
}

/** Starts a token family, or adds a token to an existing one. */
async function issueSession(user: User, familyId: string = randomUUID()): Promise<Session> {
  const { token, record } = newToken(user.id, familyId)
  await authRepository.createRefreshToken(record)
  return toSession(user, token, record.expiresAt)
}

export const authService = {
  async register(input: { email: string; password: string; displayName: string }) {
    const email = normalizeEmail(input.email)
    assertStrongPassword(input.password, [email.split('@')[0] ?? '', input.displayName])
    const user = await usersService.createAccount({
      email,
      displayName: input.displayName,
      passwordHash: await hashPassword(input.password),
    })
    return issueSession(user)
  },

  async login(input: { email: string; password: string }) {
    const credentials = await usersService.findCredentialsByEmail(input.email)
    const valid = credentials
      ? await verifyPassword(credentials.passwordHash, input.password)
      : await verifyAgainstDummy(input.password)
    if (!credentials || !valid) throw invalidCredentials()
    // Checked only after the password, so the response does not reveal which emails exist.
    if (credentials.isDisabled) throw accountDisabled()
    return issueSession(await usersService.getProfile(credentials.id))
  },

  /**
   * Rotation: each refresh token works once. Presenting one that was already used means it
   * was copied, so the whole family is revoked and every device in it must sign in again.
   * The exception is a concurrent refresh within REFRESH_REUSE_GRACE_MS (see above).
   */
  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw invalidRefresh()
    const stored = await authRepository.findRefreshToken(hashRefreshToken(refreshToken))
    if (!stored) throw invalidRefresh()
    if (stored.expiresAt <= new Date()) throw invalidRefresh()

    const access = await usersService.getAccess(stored.userId)
    if (!access) throw invalidRefresh()
    if (access.isDisabled) {
      await authRepository.revokeFamily(stored.familyId)
      throw accountDisabled()
    }

    const user = await usersService.getProfile(stored.userId)
    const next = newToken(user.id, stored.familyId)
    const rotated = !stored.revokedAt && (await authRepository.rotate(stored.id, next.record))
    if (rotated) return toSession(user, next.token, next.record.expiresAt)

    const revokedAgoMs = stored.revokedAt ? Date.now() - stored.revokedAt.getTime() : 0
    if (
      revokedAgoMs <= REFRESH_REUSE_GRACE_MS &&
      (await authRepository.familyHasActiveToken(stored.familyId))
    ) {
      return issueSession(user, stored.familyId)
    }
    await authRepository.revokeFamily(stored.familyId)
    throw new AppError(401, ErrorCode.REFRESH_TOKEN_REUSED, 'Session was revoked; sign in again')
  },

  /** Ends this device's session. Unknown or already revoked tokens are fine: the goal is met. */
  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return
    const stored = await authRepository.findRefreshToken(hashRefreshToken(refreshToken))
    if (stored) await authRepository.revokeFamily(stored.familyId)
  },

  async logoutAll(actor: Actor) {
    await authRepository.revokeAllForUser(actor.id)
  },

  revokeAllForUser: (userId: string) => authRepository.revokeAllForUser(userId),

  /** Signs out every other device and returns a fresh session for this one. */
  async changePassword(actor: Actor, input: { currentPassword: string; newPassword: string }) {
    const hash = await usersService.getPasswordHash(actor.id)
    if (!hash || !(await verifyPassword(hash, input.currentPassword))) {
      throw new AppError(400, ErrorCode.INVALID_CREDENTIALS, 'Current password is incorrect')
    }
    const user = await usersService.getProfile(actor.id)
    assertStrongPassword(input.newPassword, [user.email.split('@')[0] ?? '', user.displayName])
    await usersService.setPasswordHash(actor.id, await hashPassword(input.newPassword))
    await authRepository.revokeAllForUser(actor.id)
    return issueSession(user)
  },
}
