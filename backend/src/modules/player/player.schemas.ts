import { z } from 'zod'

export const updatePlayerSchema = z
  .object({
    lastTrackId: z.string().uuid().nullable().optional(),
    positionMs: z
      .number()
      .int()
      .min(0)
      .max(24 * 60 * 60 * 1000)
      .optional(),
    volume: z.number().int().min(0).max(100).optional(),
    repeatMode: z.enum(['off', 'all', 'one']).optional(),
    shuffle: z.boolean().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, 'Send at least one field to change')
