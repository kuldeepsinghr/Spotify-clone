import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { env } from '../config/env.js'
import { usersService } from '../modules/users/users.service.js'
import type { Role } from '../shared/actor.js'
import { AppError, ErrorCode, forbidden, unauthenticated } from '../shared/errors.js'
import { verifyAccessToken } from '../shared/tokens.js'

function bearerToken(req: Request): string | undefined {
  const header = req.headers.authorization
  if (!header) return undefined
  const [scheme, token] = header.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token)
    throw unauthenticated('Malformed Authorization header')
  return token
}

async function loadActor(req: Request, token: string) {
  const userId = await verifyAccessToken(token)
  if (!userId) throw unauthenticated('Access token is invalid or expired')
  // Role and disabled flag come from the database, so admin changes apply on the next request.
  const access = await usersService.getAccess(userId)
  if (!access) throw unauthenticated('Account no longer exists')
  if (access.isDisabled)
    throw new AppError(403, ErrorCode.ACCOUNT_DISABLED, 'This account has been disabled')
  req.actor = { id: access.id, role: access.role }
}

/** 401 unless the request carries a valid access token. */
export const authenticate: RequestHandler = async (req, _res, next) => {
  const token = bearerToken(req)
  if (!token) throw unauthenticated()
  await loadActor(req, token)
  next()
}

/**
 * Guests pass through with no actor. A token that is present but bad still gets 401,
 * so the client knows to refresh instead of silently seeing guest data.
 */
export const optionalAuthenticate: RequestHandler = async (req, _res, next) => {
  const token = bearerToken(req)
  if (token) await loadActor(req, token)
  next()
}

/** Signed in and holding one of `roles`; 401 for guests, 403 for other roles. */
export function requireRole(...roles: Role[]): RequestHandler[] {
  const check = (req: Request, _res: Response, next: NextFunction) => {
    if (!roles.includes(req.actor!.role)) throw forbidden()
    next()
  }
  return [authenticate, check]
}

/**
 * Cookie-authenticated routes reject requests from other sites. Browsers always send Origin on
 * cross-site POSTs; requests without it (curl, server to server) do not carry the browser's cookie.
 */
export const requireTrustedOrigin: RequestHandler = (req, _res, next) => {
  const origin = req.headers.origin
  if (origin && !env.CORS_ORIGINS.includes(origin)) throw forbidden('Origin not allowed')
  next()
}
