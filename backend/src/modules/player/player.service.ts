import type { Actor } from '../../shared/actor.js'
import { tracksService } from '../tracks/tracks.service.js'
import { playerRepository, type PlayerStateChanges } from './player.repository.js'

type StoredState = NonNullable<Awaited<ReturnType<typeof playerRepository.find>>>

const DEFAULT_STATE: StoredState = {
  lastTrackId: null,
  positionMs: 0,
  volume: 100,
  repeatMode: 'off',
  shuffle: false,
  updatedAt: new Date(0),
}

async function present(actor: Actor, state: StoredState | null) {
  const { lastTrackId, updatedAt, ...settings } = state ?? DEFAULT_STATE
  const lastTrack = lastTrackId
    ? ((await tracksService.getMany([lastTrackId], actor)).get(lastTrackId) ?? null)
    : null
  return { ...settings, lastTrack, updatedAt: state ? updatedAt : null }
}

export const playerService = {
  async get(actor: Actor) {
    return present(actor, await playerRepository.find(actor.id))
  },

  /**
   * Partial update. Switching tracks without a position starts the new track at 0, and a
   * position past the end of the track is clamped to its length.
   */
  async update(actor: Actor, changes: PlayerStateChanges) {
    const current = await playerRepository.find(actor.id)
    const next: PlayerStateChanges = { ...changes }

    const switching =
      changes.lastTrackId !== undefined && changes.lastTrackId !== current?.lastTrackId
    if (switching && changes.positionMs === undefined) next.positionMs = 0

    const trackId = changes.lastTrackId === undefined ? current?.lastTrackId : changes.lastTrackId
    if (trackId && (switching || changes.positionMs !== undefined)) {
      const durationMs = await tracksService.requireDuration(trackId)
      if (next.positionMs !== undefined) next.positionMs = Math.min(next.positionMs, durationMs)
    }
    if (trackId === null) next.positionMs = 0

    return present(actor, await playerRepository.upsert(actor.id, next))
  },
}
