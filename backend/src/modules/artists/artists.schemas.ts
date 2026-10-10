import { z } from 'zod'

export const topTracksQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
})
