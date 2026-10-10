import { uploadMedia } from '../../config/cloudinary.js'
import { env } from '../../config/env.js'
import type { Actor, Viewer } from '../../shared/actor.js'
import { notFound } from '../../shared/errors.js'
import { previewAudioUrl } from '../../shared/media-preview.js'
import { afterIdFrom, toIdPage, type Page, type PageRequest } from '../../shared/pagination.js'
import type { SearchWindow } from '../../shared/search.js'
import {
  assertMaxSize,
  MAX_IMAGE_BYTES,
  withCleanup,
  type TempFile,
} from '../../shared/temp-files.js'
import { assertCanManageArtist } from '../artists/artists.access.js'
import { tracksRepository, type NewTrack, type TrackRow } from './tracks.repository.js'

export type Track = TrackRow
export type { NewTrack }

/** What a viewer receives. Guests get a preview URL (or none) instead of the full audio. */
export type ViewerTrack = Omit<Track, 'audioUrl'> & {
  audioUrl: string | null
  isPreview: boolean
  previewMs: number | null
}

/** Signed-in listeners hear the full track; guests hear the first GUEST_PREVIEW_SECONDS. */
export function forViewer(track: Track, viewer: Viewer): ViewerTrack {
  if (viewer) return { ...track, isPreview: false, previewMs: null }
  const audioUrl = previewAudioUrl(track.audioUrl, env.GUEST_PREVIEW_SECONDS)
  return {
    ...track,
    audioUrl,
    isPreview: true,
    previewMs: audioUrl ? Math.min(env.GUEST_PREVIEW_SECONDS * 1000, track.durationMs) : null,
  }
}

const pageForViewer = (page: Page<Track>, viewer: Viewer): Page<ViewerTrack> => ({
  ...page,
  items: page.items.map((track) => forViewer(track, viewer)),
})

/** Returns rows in the order of `ids`, dropping IDs that no longer exist. */
const inIdOrder = (ids: string[], rows: Track[]) => {
  const byId = new Map(rows.map((row) => [row.id, row]))
  return ids.flatMap((id) => byId.get(id) ?? [])
}

async function requireTrack(id: string) {
  const track = await tracksRepository.findById(id)
  if (!track) throw notFound('Track')
  return track
}

export const tracksService = {
  async list(page: PageRequest, viewer: Viewer) {
    const rows = await tracksRepository.list({ take: page.limit + 1, afterId: afterIdFrom(page) })
    return pageForViewer(toIdPage(rows, page.limit), viewer)
  },

  async get(id: string, viewer: Viewer) {
    return forViewer(await requireTrack(id), viewer)
  },

  /** Throws 404 unless the track exists; returns its duration for callers that need it. */
  async requireDuration(id: string) {
    const track = await requireTrack(id)
    return track.durationMs
  },

  /** Tracks keyed by ID for the viewer; IDs that no longer exist are absent from the map. */
  async getMany(ids: string[], viewer: Viewer) {
    const rows = ids.length ? await tracksRepository.findByIds(ids) : []
    return new Map(rows.map((row) => [row.id, forViewer(row, viewer)]))
  },

  /** Replaces each row's `trackId` with the track; rows whose track was deleted are dropped. */
  async withTracks<T extends { trackId: string }>(rows: T[], viewer: Viewer) {
    const tracks = await tracksService.getMany([...new Set(rows.map((row) => row.trackId))], viewer)
    return rows.flatMap(({ trackId, ...rest }) => {
      const track = tracks.get(trackId)
      return track ? [{ ...rest, track }] : []
    })
  },

  async listByAlbum(albumId: string, page: PageRequest, viewer: Viewer) {
    const rows = await tracksRepository.listByAlbum(albumId, {
      take: page.limit + 1,
      afterId: afterIdFrom(page),
    })
    return pageForViewer(toIdPage(rows, page.limit), viewer)
  },

  albumStats: (albumId: string) => tracksRepository.albumStats(albumId),

  countByAlbum: (albumId: string) => tracksRepository.countByAlbum(albumId),

  async topByArtist(artistId: string, limit: number, viewer: Viewer) {
    const ids = await tracksRepository.topIdsByArtist(artistId, limit)
    return inIdOrder(ids, await tracksRepository.findByIds(ids)).map((t) => forViewer(t, viewer))
  },

  async search(window: SearchWindow, viewer: Viewer) {
    const ids = await tracksRepository.searchIds(window)
    return inIdOrder(ids, await tracksRepository.findByIds(ids)).map((t) => forViewer(t, viewer))
  },

  /** Full audio URLs, for the legacy front ends that have no sign-in until M6. */
  listOldestFirst: (limit: number) => tracksRepository.listOldestFirst(limit),

  /** Callers check ownership of the album first (see albumsService.addTrack). */
  create: (track: NewTrack) => tracksRepository.create(track),

  update: (
    actor: Actor,
    id: string,
    input: { title?: string; description?: string; image?: TempFile },
  ) =>
    withCleanup([input.image], async () => {
      const track = await requireTrack(id)
      await assertCanManageArtist(actor, track.artist.id)
      let imageUrl: string | undefined
      if (input.image) {
        assertMaxSize(input.image, MAX_IMAGE_BYTES, 'image')
        imageUrl = (await uploadMedia(input.image.path, 'image')).url
      }
      return tracksRepository.update(id, {
        title: input.title,
        description: input.description,
        imageUrl,
      })
    }),

  async remove(actor: Actor, id: string) {
    const track = await requireTrack(id)
    await assertCanManageArtist(actor, track.artist.id)
    await tracksRepository.delete(id)
  },
}
