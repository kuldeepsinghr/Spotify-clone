import { z } from 'zod'

export const topTracksQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
})

export const createArtistSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    bio: z.string().trim().max(2000).default(''),
  })
  .strict()

export const updateArtistSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    bio: z.string().trim().max(2000).optional(),
  })
  .strict()
