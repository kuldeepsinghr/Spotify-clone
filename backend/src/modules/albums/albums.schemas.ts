import { z } from 'zod'

const text = (max: number) => z.string().trim().max(max)
const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i, 'must be a hex colour such as #1db954')
const releaseDate = z
  .string()
  .date()
  .transform((value) => new Date(value))

/** Multipart bodies: every field arrives as a string. */
export const createAlbumSchema = z
  .object({
    title: text(200).min(1),
    description: text(1000).default(''),
    bgColor: hexColor.default('#121212'),
    releasedAt: releaseDate.optional(),
    artistId: z.string().uuid().optional(),
  })
  .strict()

export const updateAlbumSchema = z
  .object({
    title: text(200).min(1).optional(),
    description: text(1000).optional(),
    bgColor: hexColor.optional(),
    releasedAt: releaseDate.optional(),
    artistId: z.string().uuid().optional(),
  })
  .strict()

export const createTrackSchema = z
  .object({
    title: text(200).min(1),
    description: text(1000).default(''),
  })
  .strict()
