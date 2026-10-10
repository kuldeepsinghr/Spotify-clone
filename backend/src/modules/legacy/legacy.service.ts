import type { Actor } from '../../shared/actor.js'
import { formatLegacyDuration } from '../../shared/duration.js'
import { withCleanup, type TempFile } from '../../shared/temp-files.js'
import { albumsService, type Album } from '../albums/albums.service.js'
import { artistsService } from '../artists/artists.service.js'
import { tracksService, type Track } from '../tracks/tracks.service.js'

/**
 * The response shapes the current listener and admin apps expect from /api/song and /api/album.
 * Removed in M6, once both apps call /v1.
 */
export interface LegacySong {
  _id: string
  name: string
  desc: string
  album: string
  image: string
  file: string
  duration: string
}

export interface LegacyAlbum {
  _id: string
  name: string
  desc: string
  bgColor: string
  image: string
}

/** Upper bound for the old unpaged list endpoints. */
export const LEGACY_LIST_LIMIT = 500

const toLegacySong = (track: Track): LegacySong => ({
  _id: track.id,
  name: track.title,
  desc: track.description,
  album: track.album.title,
  image: track.imageUrl,
  file: track.audioUrl,
  duration: formatLegacyDuration(track.durationMs),
})

const toLegacyAlbum = (album: Album): LegacyAlbum => ({
  _id: album.id,
  name: album.title,
  desc: album.description,
  bgColor: album.bgColor,
  image: album.coverUrl,
})

export const legacyService = {
  async listSongs() {
    return (await tracksService.listOldestFirst(LEGACY_LIST_LIMIT)).map(toLegacySong)
  },

  async listAlbums() {
    return (await albumsService.listOldestFirst(LEGACY_LIST_LIMIT)).map(toLegacyAlbum)
  },

  /** The old admin app has no artist picker, so new albums are filed under the placeholder. */
  addAlbum: (
    actor: Actor,
    input: { name: string; desc: string; bgColor: string; image: TempFile },
  ) =>
    withCleanup([input.image], async () => {
      const artist = await artistsService.getPlaceholder()
      const album = await albumsService.create(actor, {
        artistId: artist.id,
        title: input.name,
        description: input.desc,
        bgColor: input.bgColor,
        cover: input.image,
      })
      return toLegacyAlbum(album)
    }),

  addSong: (
    actor: Actor,
    input: { name: string; desc: string; albumName: string; image: TempFile; audio: TempFile },
  ) =>
    withCleanup([input.image, input.audio], async () => {
      const album = await albumsService.findOneByTitle(input.albumName)
      const track = await albumsService.addTrack(actor, album.id, {
        title: input.name,
        description: input.desc,
        audio: input.audio,
        image: input.image,
      })
      return toLegacySong(track)
    }),

  removeSong: (actor: Actor, id: string) => tracksService.remove(actor, id),

  removeAlbum: (actor: Actor, id: string) => albumsService.remove(actor, id),
}
