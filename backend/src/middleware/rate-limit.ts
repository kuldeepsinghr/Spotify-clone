import type { Request } from 'express'
import { ipKeyGenerator, rateLimit, type Options } from 'express-rate-limit'
import { AppError, ErrorCode } from '../shared/errors.js'

const ip = (req: Request) => ipKeyGenerator(req.ip ?? 'unknown')
const emailOf = (req: Request) => {
  const email: unknown = req.body?.email
  return typeof email === 'string' ? email.trim().toLowerCase() : ''
}

const base: Partial<Options> = {
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, _res, next, options) =>
    next(
      new AppError(
        429,
        ErrorCode.RATE_LIMITED,
        `Too many attempts; try again in ${Math.ceil(options.windowMs / 60_000)} minute(s)`,
      ),
    ),
}

/**
 * Counters live in process memory, so they reset on restart and are per instance.
 * Phase 1 moves them to Redis when the API runs more than one instance.
 * Built per app so each test app starts with empty counters.
 */
export function createAuthRateLimits() {
  return {
    /** 5 login attempts per minute for one email from one IP. */
    login: rateLimit({
      ...base,
      windowMs: 60_000,
      limit: 5,
      keyGenerator: (req) => `${ip(req)}|${emailOf(req)}`,
    }),
    /** Temporary lockout: 10 failed logins for one email in 15 minutes, from any IP. */
    loginLockout: rateLimit({
      ...base,
      windowMs: 15 * 60_000,
      limit: 10,
      skipSuccessfulRequests: true,
      keyGenerator: (req) => `lockout|${emailOf(req)}`,
    }),
    register: rateLimit({ ...base, windowMs: 60 * 60_000, limit: 10, keyGenerator: ip }),
    refresh: rateLimit({ ...base, windowMs: 60_000, limit: 30, keyGenerator: ip }),
    /** Password reset and verification emails. */
    email: rateLimit({ ...base, windowMs: 60 * 60_000, limit: 5, keyGenerator: ip }),
  }
}

/** Plays feed top-track rankings, so one account cannot record more than 60 a minute. Runs after authenticate. */
export const createPlayRateLimit = () =>
  rateLimit({
    ...base,
    windowMs: 60_000,
    limit: 60,
    keyGenerator: (req) => `play|${req.actor?.id ?? ip(req)}`,
  })
