import { z } from 'zod'
import type { Actor } from '../../shared/actor.js'
import { decodeCursor, toKeyedPage, type PageRequest } from '../../shared/pagination.js'
import { tracksService } from '../tracks/tracks.service.js'
import { likesRepository } from './likes.repository.js'

const likeCursorSchema = z.object({ at: z.string().datetime(), id: z.string().uuid() })

export const likesService = {
  async list(actor: Actor, page: PageRequest) {
    const cursor = page.cursor ? decodeCursor(page.cursor, likeCursorSchema) : undefined
    const rows = await likesRepository.list(actor.id, {
      take: page.limit + 1,
      after: cursor && { likedAt: new Date(cursor.at), trackId: cursor.id },
    })
    const keyed = toKeyedPage(rows, page.limit, (last) => ({
      at: last.likedAt.toISOString(),
      id: last.trackId,
    }))
    return { ...keyed, items: await tracksService.withTracks(keyed.items, actor) }
  },

  async like(actor: Actor, trackId: string) {
    await tracksService.requireDuration(trackId)
    await likesRepository.add(actor.id, trackId)
  },

  /** Unliking a track that is not liked (or no longer exists) is not an error. */
  async unlike(actor: Actor, trackId: string) {
    await likesRepository.remove(actor.id, trackId)
  },

  /** For heart icons on a list of tracks: `{ [trackId]: liked }`. */
  async contains(actor: Actor, trackIds: string[]) {
    const liked = await likesRepository.likedAmong(actor.id, trackIds)
    return Object.fromEntries(trackIds.map((id) => [id, liked.has(id)]))
  },
}
