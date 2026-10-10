import { z } from 'zod'
import { uploadMedia } from '../../config/cloudinary.js'
import type { Actor, Viewer } from '../../shared/actor.js'
import { AppError, ErrorCode, forbidden, notFound } from '../../shared/errors.js'
import {
  afterIdFrom,
  decodeCursor,
  toIdPage,
  toKeyedPage,
  type PageRequest,
} from '../../shared/pagination.js'
import {
  assertMaxSize,
  MAX_IMAGE_BYTES,
  withCleanup,
  type TempFile,
} from '../../shared/temp-files.js'
import { tracksService } from '../tracks/tracks.service.js'
import { playlistsRepository, type PlaylistRow } from './playlists.repository.js'

export const MAX_PLAYLISTS_PER_USER = 500
export const MAX_PLAYLIST_TRACKS = 10_000

export type Playlist = PlaylistRow

const positionCursorSchema = z.object({ position: z.number().int().min(0) })

const isOwnerOrAdmin = (viewer: Viewer, playlist: Playlist) =>
  viewer !== null && (viewer.id === playlist.owner.id || viewer.role === 'admin')

/** Private playlists are invisible to everyone but the owner and admins: 404, not 403. */
async function requireVisible(viewer: Viewer, id: string) {
  const playlist = await playlistsRepository.findById(id)
  if (!playlist || !(playlist.isPublic || isOwnerOrAdmin(viewer, playlist))) {
    throw notFound('Playlist')
  }
  return playlist
}

async function requireEditable(actor: Actor, id: string) {
  const playlist = await requireVisible(actor, id)
  if (!isOwnerOrAdmin(actor, playlist)) throw forbidden('You can only change your own playlists')
  return playlist
}

export const playlistsService = {
  /** Without a name, playlists are numbered like Spotify's: "My Playlist #3". */
  async create(actor: Actor, input: { name?: string; description: string; isPublic: boolean }) {
    const count = await playlistsRepository.countByOwner(actor.id)
    if (count >= MAX_PLAYLISTS_PER_USER) {
      throw new AppError(
        409,
        ErrorCode.PLAYLIST_LIMIT_REACHED,
        `You can have at most ${MAX_PLAYLISTS_PER_USER} playlists`,
      )
    }
    return playlistsRepository.create({
      ownerId: actor.id,
      name: input.name ?? `My Playlist #${count + 1}`,
      description: input.description,
      isPublic: input.isPublic,
    })
  },

  async listMine(actor: Actor, page: PageRequest) {
    const rows = await playlistsRepository.listByOwner(actor.id, {
      take: page.limit + 1,
      afterId: afterIdFrom(page),
    })
    return toIdPage(rows, page.limit)
  },

  async get(viewer: Viewer, id: string) {
    const playlist = await requireVisible(viewer, id)
    return { ...playlist, totalDurationMs: await playlistsRepository.totalDurationMs(id) }
  },

  update: (
    actor: Actor,
    id: string,
    input: { name?: string; description?: string; isPublic?: boolean; cover?: TempFile },
  ) =>
    withCleanup([input.cover], async () => {
      await requireEditable(actor, id)
      const { cover, ...fields } = input
      let coverUrl: string | undefined
      if (cover) {
        assertMaxSize(cover, MAX_IMAGE_BYTES, 'cover')
        coverUrl = (await uploadMedia(cover.path, 'image')).url
      }
      return playlistsRepository.update(id, { ...fields, coverUrl })
    }),

  async remove(actor: Actor, id: string) {
    await requireEditable(actor, id)
    await playlistsRepository.delete(id)
  },

  async listTracks(viewer: Viewer, id: string, page: PageRequest) {
    await requireVisible(viewer, id)
    const after = page.cursor ? decodeCursor(page.cursor, positionCursorSchema) : undefined
    const rows = await playlistsRepository.listTracks(id, {
      take: page.limit + 1,
      afterPosition: after?.position,
    })
    const keyed = toKeyedPage(rows, page.limit, (last) => ({ position: last.position }))
    return { ...keyed, items: await tracksService.withTracks(keyed.items, viewer) }
  },

  async addTrack(actor: Actor, id: string, input: { trackId: string; position?: number }) {
    await requireEditable(actor, id)
    await tracksService.requireDuration(input.trackId)
    const result = await playlistsRepository.addTrack(id, input.trackId, {
      position: input.position,
      maxTracks: MAX_PLAYLIST_TRACKS,
    })
    if (result.status === 'exists') {
      throw new AppError(
        409,
        ErrorCode.TRACK_ALREADY_IN_PLAYLIST,
        'Track is already in this playlist',
      )
    }
    if (result.status === 'full') {
      throw new AppError(
        409,
        ErrorCode.PLAYLIST_FULL,
        `A playlist can hold at most ${MAX_PLAYLIST_TRACKS} tracks`,
      )
    }
    return { trackId: input.trackId, position: result.position }
  },

  async removeTrack(actor: Actor, id: string, trackId: string) {
    await requireEditable(actor, id)
    if (!(await playlistsRepository.removeTrack(id, trackId))) throw notFound('Track in playlist')
  },

  async moveTrack(actor: Actor, id: string, trackId: string, position: number) {
    await requireEditable(actor, id)
    const to = await playlistsRepository.moveTrack(id, trackId, position)
    if (to === null) throw notFound('Track in playlist')
    return { trackId, position: to }
  },
}
