import { uploadMedia } from '../../config/cloudinary.js'
import type { Actor, Viewer } from '../../shared/actor.js'
import { AppError, ErrorCode, forbidden, notFound } from '../../shared/errors.js'
import { afterIdFrom, toIdPage, type PageRequest } from '../../shared/pagination.js'
import type { SearchWindow } from '../../shared/search.js'
import {
  assertMaxSize,
  MAX_IMAGE_BYTES,
  withCleanup,
  type TempFile,
} from '../../shared/temp-files.js'
import {
  assertArtistExists,
  assertCanManageArtist,
  resolveArtistForRelease,
} from '../artists/artists.access.js'
import { tracksService } from '../tracks/tracks.service.js'
import { albumsRepository, type AlbumRow } from './albums.repository.js'

export type Album = AlbumRow

export interface AlbumInput {
  title: string
  description: string
  bgColor: string
  releasedAt?: Date
  artistId?: string
  cover: TempFile
}

export interface AlbumUpdate {
  title?: string
  description?: string
  bgColor?: string
  releasedAt?: Date | null
  artistId?: string
  cover?: TempFile
}

export interface TrackInput {
  title: string
  description: string
  audio: TempFile
  image?: TempFile
}

const inIdOrder = (ids: string[], rows: Album[]) => {
  const byId = new Map(rows.map((row) => [row.id, row]))
  return ids.flatMap((id) => byId.get(id) ?? [])
}

async function requireAlbum(id: string) {
  const album = await albumsRepository.findById(id)
  if (!album) throw notFound('Album')
  return album
}

async function uploadImage(file: TempFile) {
  assertMaxSize(file, MAX_IMAGE_BYTES, 'image')
  return (await uploadMedia(file.path, 'image')).url
}

export const albumsService = {
  async list(page: PageRequest) {
    const rows = await albumsRepository.list({ take: page.limit + 1, afterId: afterIdFrom(page) })
    return toIdPage(rows, page.limit)
  },

  /** Album with the totals an album page shows: track count and total play time. */
  async get(id: string) {
    const album = await albumsRepository.findPublicById(id)
    if (!album) throw notFound('Album')
    const stats = await tracksService.albumStats(id)
    const explicit = await tracksService.hasExplicit(id)
    return { ...album, ...stats, explicit }
  },

  async listTracks(albumId: string, page: PageRequest, viewer: Viewer) {
    if (!(await albumsRepository.findPublicById(albumId))) throw notFound('Album')
    return tracksService.listByAlbum(albumId, page, viewer)
  },

  async listByArtist(artistId: string, page: PageRequest) {
    const rows = await albumsRepository.listByArtist(artistId, {
      take: page.limit + 1,
      afterId: afterIdFrom(page),
    })
    return toIdPage(rows, page.limit)
  },

  countByArtist: (artistId: string) => albumsRepository.countByArtist(artistId),

  async search(window: SearchWindow) {
    const ids = await albumsRepository.searchIds(window)
    return inIdOrder(ids, await albumsRepository.findByIds(ids))
  },

  /** Legacy clients reference albums by name; refuse to guess when the name is not unique. */
  async findOneByTitle(title: string) {
    const matches = await albumsRepository.findByExactTitle(title)
    if (matches.length === 0) throw notFound('Album')
    if (matches.length > 1) {
      throw new AppError(409, ErrorCode.AMBIGUOUS_ALBUM, `More than one album is named "${title}"`)
    }
    return matches[0]!
  },

  listOldestFirst: (limit: number) => albumsRepository.listOldestFirst(limit),

  create: (actor: Actor, input: AlbumInput) =>
    withCleanup([input.cover], async () => {
      const artistId = await resolveArtistForRelease(actor, input.artistId)
      return albumsRepository.create({
        artistId,
        title: input.title,
        description: input.description,
        bgColor: input.bgColor,
        releasedAt: input.releasedAt,
        coverUrl: await uploadImage(input.cover),
      })
    }),

  /** Only admins can move an album to another artist; its tracks move with it. */
  update: (actor: Actor, id: string, input: AlbumUpdate) =>
    withCleanup([input.cover], async () => {
      const album = await requireAlbum(id)
      await assertCanManageArtist(actor, album.artist.id)

      const { artistId, cover, ...fields } = input
      const changes = { ...fields, coverUrl: cover ? await uploadImage(cover) : undefined }

      if (artistId && artistId !== album.artist.id) {
        if (actor.role !== 'admin') throw forbidden('Only admins can move albums between artists')
        await assertArtistExists(artistId)
        return albumsRepository.reassignArtist(id, artistId, changes)
      }
      return albumsRepository.update(id, changes)
    }),

  /** Deleting an album that still has tracks is blocked; remove or move the tracks first. */
  async remove(actor: Actor, id: string) {
    const album = await requireAlbum(id)
    await assertCanManageArtist(actor, album.artist.id)
    const trackCount = await tracksService.countByAlbum(id)
    if (trackCount > 0) {
      throw new AppError(
        409,
        ErrorCode.ALBUM_HAS_TRACKS,
        `Album still has ${trackCount} track${trackCount === 1 ? '' : 's'}; remove them first`,
      )
    }
    await albumsRepository.delete(id)
  },

  /** Appends a track to the album. Without its own image, the track uses the album cover. */
  addTrack: (actor: Actor, albumId: string, input: TrackInput) =>
    withCleanup([input.audio, input.image], async () => {
      const album = await requireAlbum(albumId)
      await assertCanManageArtist(actor, album.artist.id)
      if (input.image) assertMaxSize(input.image, MAX_IMAGE_BYTES, 'image')
      const [audio, imageUrl] = await Promise.all([
        uploadMedia(input.audio.path, 'audio'),
        input.image ? uploadImage(input.image) : Promise.resolve(album.coverUrl),
      ])
      return tracksService.create({
        albumId,
        artistId: album.artist.id,
        title: input.title,
        description: input.description,
        durationMs: audio.durationMs ?? 0,
        audioUrl: audio.url,
        imageUrl,
      })
    }),
}
