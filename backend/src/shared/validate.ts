import { z } from 'zod'
import { badRequest } from './errors.js'

export function parse<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw badRequest(
      'Request is invalid',
      result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    )
  }
  return result.data
}

export const idParamsSchema = z.object({ id: z.string().uuid() })
export const trackIdParamsSchema = z.object({ trackId: z.string().uuid() })
