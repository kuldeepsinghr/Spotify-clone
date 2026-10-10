import { z } from 'zod'

export const recordPlaySchema = z
  .object({
    trackId: z.string().uuid(),
    /** How long the listener actually heard the track, in milliseconds. */
    playedMs: z
      .number()
      .int()
      .min(0)
      .max(24 * 60 * 60 * 1000),
  })
  .strict()
