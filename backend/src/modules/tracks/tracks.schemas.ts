import { z } from 'zod'
import { pageQuerySchema } from '../../shared/pagination.js'

export const listTracksQuerySchema = pageQuerySchema.extend({
  artistId: z.string().uuid().optional(),
})

export const updateTrackSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(1000).optional(),
  })
  .strict()
