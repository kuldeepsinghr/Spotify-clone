import { z } from 'zod'

export const updateTrackSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(1000).optional(),
  })
  .strict()
