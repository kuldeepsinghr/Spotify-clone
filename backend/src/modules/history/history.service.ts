import type { Actor } from '../../shared/actor.js'
import { afterIdFrom, toIdPage, type PageRequest } from '../../shared/pagination.js'
import { tracksService } from '../tracks/tracks.service.js'
import { historyRepository } from './history.repository.js'

/** A play counts after 30 seconds, or half the track if it is shorter than a minute. */
export const MIN_PLAY_MS = 30_000
/** A second report of the same track within this window is a duplicate, not a replay. */
export const DUPLICATE_WINDOW_MS = 10_000

export const minimumPlayMs = (durationMs: number) => Math.min(MIN_PLAY_MS, durationMs / 2)

export type PlayResult =
  | { recorded: true; id: string; playedAt: Date }
  | { recorded: false; reason: 'TOO_SHORT' | 'DUPLICATE' }

export const historyService = {
  async record(actor: Actor, input: { trackId: string; playedMs: number }): Promise<PlayResult> {
    const durationMs = await tracksService.requireDuration(input.trackId)
    if (input.playedMs < minimumPlayMs(durationMs)) return { recorded: false, reason: 'TOO_SHORT' }

    const last = await historyRepository.lastPlayOf(actor.id, input.trackId)
    if (last && Date.now() - last.playedAt.getTime() < DUPLICATE_WINDOW_MS) {
      return { recorded: false, reason: 'DUPLICATE' }
    }
    const play = await historyRepository.create(actor.id, input.trackId)
    return { recorded: true, id: play.id, playedAt: play.playedAt }
  },

  async list(actor: Actor, page: PageRequest) {
    const rows = await historyRepository.list(actor.id, {
      take: page.limit + 1,
      afterId: afterIdFrom(page),
    })
    const idPage = toIdPage(rows, page.limit)
    return { ...idPage, items: await tracksService.withTracks(idPage.items, actor) }
  },

  async clear(actor: Actor) {
    await historyRepository.clear(actor.id)
  },
}
