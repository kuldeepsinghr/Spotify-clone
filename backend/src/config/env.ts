import 'dotenv/config'
import { z } from 'zod'

const optional = z
  .string()
  .optional()
  .transform((value) => (value ? value : undefined))

const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true')

/** docker-compose.yml supplies values starting with this prefix so local dev works out of the box. */
export const DEV_SECRET_PREFIX = 'dev-only-'

const secret = z.string().min(32, 'must be at least 32 characters')

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    DATABASE_URL: z.string().url(),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:5173,http://localhost:5174')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      ),
    /** Number of reverse proxies in front of the API (1 on Render); needed for correct client IPs. */
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),

    JWT_ACCESS_SECRET: secret,
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
    /** HMAC key for stored refresh-token hashes, so a database leak alone cannot validate tokens. */
    REFRESH_TOKEN_SECRET: secret,
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
    COOKIE_SECURE: booleanString.optional(),
    /** Use "none" when the front end and API are on different sites (requires COOKIE_SECURE=true). */
    COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    GUEST_PREVIEW_SECONDS: z.coerce.number().int().min(0).max(120).default(30),

    CLOUDINARY_NAME: optional,
    CLOUDINARY_API_KEY: optional,
    CLOUDINARY_SECRET_KEY: optional,
  })
  .transform((value) => ({
    ...value,
    COOKIE_SECURE: value.COOKIE_SECURE ?? value.NODE_ENV === 'production',
  }))
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === 'production') {
      for (const key of ['JWT_ACCESS_SECRET', 'REFRESH_TOKEN_SECRET'] as const) {
        if (value[key].startsWith(DEV_SECRET_PREFIX)) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: 'dev-only secrets are not allowed in production',
          })
        }
      }
    }
    if (value.COOKIE_SAMESITE === 'none' && !value.COOKIE_SECURE) {
      ctx.addIssue({
        code: 'custom',
        path: ['COOKIE_SAMESITE'],
        message: '"none" requires COOKIE_SECURE=true',
      })
    }
    if (value.JWT_ACCESS_SECRET === value.REFRESH_TOKEN_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['REFRESH_TOKEN_SECRET'],
        message: 'must differ from JWT_ACCESS_SECRET',
      })
    }
  })

export type Env = z.infer<typeof schema>

function loadEnv(): Env {
  const result = schema.safeParse(process.env)
  if (!result.success) {
    const problems = result.error.issues.map(
      (issue) => `  ${issue.path.join('.')}: ${issue.message}`,
    )
    throw new Error(`Invalid environment configuration:\n${problems.join('\n')}`)
  }
  return result.data
}

export const env = loadEnv()
