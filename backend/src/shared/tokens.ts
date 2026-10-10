import { createHmac, randomBytes } from 'node:crypto'
import { jwtVerify, SignJWT } from 'jose'
import { env } from '../config/env.js'

const ISSUER = 'spotify-clone-api'
const AUDIENCE = 'spotify-clone'
const accessKey = new TextEncoder().encode(env.JWT_ACCESS_SECRET)

export async function signAccessToken(userId: string) {
  return new SignJWT({ typ: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${env.ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(accessKey)
}

/** Returns the user ID, or null when the token is malformed, tampered with, or expired. */
export async function verifyAccessToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, accessKey, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['HS256'],
    })
    return payload.typ === 'access' && typeof payload.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}

/** Refresh tokens are random, opaque strings; only their HMAC is stored. */
export function newRefreshToken() {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: hashRefreshToken(token) }
}

export const hashRefreshToken = (token: string) =>
  createHmac('sha256', env.REFRESH_TOKEN_SECRET).update(token).digest('hex')
