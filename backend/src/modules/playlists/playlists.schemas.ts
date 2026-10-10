import { z } from 'zod'
import { MAX_PLAYLIST_TRACKS } from './playlists.service.js'

const name = z.string().trim().min(1).max(100)
const description = z.string().trim().max(300)
/** JSON sends a boolean; multipart (with a cover) sends "true" or "false". */
const flag = z.union([
  z.boolean(),
  z.enum(['true', 'false']).transform((value) => value === 'true'),
])
const position = z.coerce.number().int().min(0).max(MAX_PLAYLIST_TRACKS)

export const createPlaylistSchema = z
  .object({
    name: name.optional(),
    description: description.default(''),
    isPublic: flag.default(false),
  })
  .strict()

export const updatePlaylistSchema = z
  .object({
    name: name.optional(),
    description: description.optional(),
    isPublic: flag.optional(),
  })
  .strict()

export const addTrackSchema = z
  .object({
    trackId: z.string().uuid(),
    position: position.optional(),
  })
  .strict()

export const moveTrackSchema = z.object({ position }).strict()

export const playlistTrackParamsSchema = z.object({
  id: z.string().uuid(),
  trackId: z.string().uuid(),
})
