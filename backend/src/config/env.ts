import 'dotenv/config'
import { z } from 'zod'

const optional = z
  .string()
  .optional()
  .transform((value) => (value ? value : undefined))

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
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
  CLOUDINARY_NAME: optional,
  CLOUDINARY_API_KEY: optional,
  CLOUDINARY_SECRET_KEY: optional,
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
