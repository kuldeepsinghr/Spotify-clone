import { rm } from 'node:fs/promises'
import { uploadMedia } from '../../config/cloudinary.js'
import { formatLegacyDuration } from '../../shared/duration.js'
import { AppError, ErrorCode } from '../../shared/errors.js'
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

export interface TempFile {
  path: string
  size: number
}

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

function assertMaxSize(file: TempFile, maxBytes: number, label: string) {
  if (file.size > maxBytes) {
    throw new AppError(
      413,
      ErrorCode.PAYLOAD_TOO_LARGE,
      `${label} must be at most ${maxBytes / 1024 / 1024} MB`,
    )
  }
}

async function withCleanup<T>(files: TempFile[], work: () => Promise<T>): Promise<T> {
  try {
    return await work()
  } finally {
    await Promise.all(files.map((file) => rm(file.path, { force: true })))
  }
}

export const legacyService = {
  async listSongs() {
    return (await tracksService.listOldestFirst(LEGACY_LIST_LIMIT)).map(toLegacySong)
  },

  async listAlbums() {
    return (await albumsService.listOldestFirst(LEGACY_LIST_LIMIT)).map(toLegacyAlbum)
  },

  addAlbum(input: {
    name: string
    desc: string
    bgColor: string
    image: TempFile
    maxImageBytes: number
  }) {
    return withCleanup([input.image], async () => {
      assertMaxSize(input.image, input.maxImageBytes, 'image')
      const artist = await artistsService.getPlaceholder()
      const cover = await uploadMedia(input.image.path, 'image')
      const album = await albumsService.create({
        artistId: artist.id,
        title: input.name,
        description: input.desc,
        bgColor: input.bgColor,
        coverUrl: cover.url,
      })
      return toLegacyAlbum(album)
    })
  },

  addSong(input: {
    name: string
    desc: string
    albumName: string
    image: TempFile
    audio: TempFile
    maxImageBytes: number
  }) {
    return withCleanup([input.image, input.audio], async () => {
      assertMaxSize(input.image, input.maxImageBytes, 'image')
      const album = await albumsService.findOneByTitle(input.albumName)
      const [image, audio] = await Promise.all([
        uploadMedia(input.image.path, 'image'),
        uploadMedia(input.audio.path, 'audio'),
      ])
      const track = await tracksService.create({
        albumId: album.id,
        artistId: album.artist.id,
        title: input.name,
        description: input.desc,
        durationMs: audio.durationMs ?? 0,
        audioUrl: audio.url,
        imageUrl: image.url,
      })
      return toLegacySong(track)
    })
  },

  removeSong: (id: string) => tracksService.remove(id),

  removeAlbum: (id: string) => albumsService.remove(id),
}
