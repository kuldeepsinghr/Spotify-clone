import type { CookieOptions, Request, Response } from 'express'
import { env } from '../../config/env.js'
import { sendData } from '../../shared/response.js'
import type { Session } from './auth.service.js'

export const REFRESH_COOKIE = 'refresh_token'

/** Scoped to the auth routes, so the cookie is not sent with every API call. */
const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAMESITE,
  path: '/v1/auth',
}

export const readRefreshCookie = (req: Request): string | undefined => {
  const value: unknown = req.cookies?.[REFRESH_COOKIE]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export function sendSession(
  res: Response,
  session: Session,
  status = 200,
  extra?: Record<string, unknown>,
) {
  res.cookie(REFRESH_COOKIE, session.refreshToken, {
    ...cookieOptions,
    expires: session.refreshTokenExpiresAt,
  })
  sendData(
    res,
    {
      user: session.user,
      accessToken: session.accessToken,
      expiresIn: session.accessTokenExpiresIn,
      ...extra,
    },
    undefined,
    status,
  )
}

export const clearRefreshCookie = (res: Response) => res.clearCookie(REFRESH_COOKIE, cookieOptions)
