import { z } from 'zod'

const text = (max: number) => z.string().trim().max(max)

export const addAlbumBodySchema = z.object({
  name: text(200).min(1),
  desc: text(1000).default(''),
  bgColor: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i, 'must be a hex colour such as #1db954')
    .default('#121212'),
})

export const addSongBodySchema = z.object({
  name: text(200).min(1),
  desc: text(1000).default(''),
  /** The legacy admin app sends the album's name, not its ID. */
  album: text(200).min(1),
})

export const removeBodySchema = z.object({ id: z.string().uuid() })
