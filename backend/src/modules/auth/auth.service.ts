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

/** Starts a token family, or continues one when rotating. */
async function issueSession(user: User, familyId: string = randomUUID()): Promise<Session> {
  const { token, hash } = newRefreshToken()
  const refreshTokenExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000)
  await authRepository.createRefreshToken({
    userId: user.id,
    tokenHash: hash,
    familyId,
    expiresAt: refreshTokenExpiresAt,
  })
  return {
    user,
    accessToken: await signAccessToken(user.id),
    accessTokenExpiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
    refreshToken: token,
    refreshTokenExpiresAt,
  }
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
   */
  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw invalidRefresh()
    const stored = await authRepository.findRefreshToken(hashRefreshToken(refreshToken))
    if (!stored) throw invalidRefresh()

    if (stored.revokedAt || !(await authRepository.revokeIfActive(stored.id))) {
      await authRepository.revokeFamily(stored.familyId)
      throw new AppError(401, ErrorCode.REFRESH_TOKEN_REUSED, 'Session was revoked; sign in again')
    }
    if (stored.expiresAt <= new Date()) throw invalidRefresh()

    const access = await usersService.getAccess(stored.userId)
    if (!access) throw invalidRefresh()
    if (access.isDisabled) {
      await authRepository.revokeFamily(stored.familyId)
      throw accountDisabled()
    }
    return issueSession(await usersService.getProfile(stored.userId), stored.familyId)
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
