import { uploadMedia } from '../../config/cloudinary.js'
import type { Actor, Viewer } from '../../shared/actor.js'
import { PLACEHOLDER_ARTIST_NAME } from '../../shared/catalog.js'
import { AppError, ErrorCode, notFound } from '../../shared/errors.js'
import { afterIdFrom, toIdPage, type PageRequest } from '../../shared/pagination.js'
import type { SearchWindow } from '../../shared/search.js'
import {
  assertMaxSize,
  MAX_IMAGE_BYTES,
  withCleanup,
  type TempFile,
} from '../../shared/temp-files.js'
import { albumsService } from '../albums/albums.service.js'
import { tracksService } from '../tracks/tracks.service.js'
import { assertCanManageArtist } from './artists.access.js'
import { artistsRepository, type ArtistRow } from './artists.repository.js'

export type Artist = ArtistRow

async function requireArtist(id: string) {
  const artist = await artistsRepository.findById(id)
  if (!artist) throw notFound('Artist')
  return artist
}

async function uploadImage(image?: TempFile) {
  if (!image) return undefined
  assertMaxSize(image, MAX_IMAGE_BYTES, 'image')
  return (await uploadMedia(image.path, 'image')).url
}

export const artistsService = {
  async list(page: PageRequest) {
    const rows = await artistsRepository.list({ take: page.limit + 1, afterId: afterIdFrom(page) })
    return toIdPage(rows, page.limit)
  },

  async get(id: string) {
    const artist = await artistsRepository.findPublicById(id)
    if (!artist) throw notFound('Artist')
    return withPublicDetails(artist)
  },

  async getBySlug(slug: string) {
    const artist = await artistsRepository.findPublicBySlug(slug)
    if (!artist) throw notFound('Artist')
    return withPublicDetails(artist)
  },

  async listAlbums(artistId: string, page: PageRequest) {
    if (!(await artistsRepository.findPublicById(artistId))) throw notFound('Artist')
    return albumsService.listByArtist(artistId, page)
  },

  async topTracks(artistId: string, limit: number, viewer: Viewer) {
    if (!(await artistsRepository.findPublicById(artistId))) throw notFound('Artist')
    return tracksService.topByArtist(artistId, limit, viewer)
  },

  async search(window: SearchWindow) {
    const ids = await artistsRepository.searchIds(window)
    const byId = new Map((await artistsRepository.findByIds(ids)).map((row) => [row.id, row]))
    return ids.flatMap((id) => byId.get(id) ?? [])
  },

  /** The artist that catalog without a real artist is filed under. */
  async getPlaceholder() {
    return (
      (await artistsRepository.findUnownedByName(PLACEHOLDER_ARTIST_NAME)) ??
      artistsRepository.create({
        name: PLACEHOLDER_ARTIST_NAME,
        bio: 'Placeholder for catalog without a real artist. Reassign albums in the admin app.',
      })
    )
  },

  create: (input: { name: string; bio: string; image?: TempFile }) =>
    withCleanup([input.image], async () =>
      artistsRepository.create({
        name: input.name,
        bio: input.bio,
        imageUrl: await uploadImage(input.image),
      }),
    ),

  update: (actor: Actor, id: string, input: { name?: string; bio?: string; image?: TempFile }) =>
    withCleanup([input.image], async () => {
      await requireArtist(id)
      await assertCanManageArtist(actor, id)
      return artistsRepository.update(id, {
        name: input.name,
        bio: input.bio,
        imageUrl: await uploadImage(input.image),
      })
    }),

  async remove(id: string) {
    await requireArtist(id)
    if ((await albumsService.countByArtist(id)) > 0) {
      throw new AppError(
        409,
        ErrorCode.ARTIST_HAS_ALBUMS,
        'Artist still has albums; move or remove them first',
      )
    }
    await artistsRepository.delete(id)
  },

  getOwnedBy: (userId: string) => artistsRepository.findByOwner(userId),

  /**
   * Links a user to an artist profile: the given one if it is free, otherwise the profile they
   * already own, otherwise a new profile named after them.
   */
  async assignOwner(userId: string, input: { artistId?: string; fallbackName: string }) {
    if (input.artistId) {
      await artistsService.assertAssignable(userId, input.artistId)
      return artistsRepository.setOwner(input.artistId, userId)
    }
    return (
      (await artistsRepository.findByOwner(userId)) ??
      artistsRepository.create({ name: input.fallbackName, ownerUserId: userId })
    )
  },

  async assertAssignable(userId: string, artistId: string) {
    await requireArtist(artistId)
    const owner = await artistsRepository.findOwnerUserId(artistId)
    if (owner && owner !== userId) {
      throw new AppError(
        409,
        ErrorCode.ARTIST_ALREADY_OWNED,
        'That artist profile belongs to another account',
      )
    }
  },

  releaseOwnership: (userId: string) => artistsRepository.releaseOwnership(userId),
}

async function withPublicDetails(artist: ArtistRow) {
  const [extra, monthlyListeners] = await Promise.all([
    artistsRepository.publicDetails(artist.id),
    artistsRepository.monthlyListeners(artist.id),
  ])
  return {
    ...artist,
    longBio: extra?.longBio ?? '',
    languages: extra?.languages ?? [],
    yearFormed: extra?.yearFormed ?? null,
    links: extra?.links ?? [],
    members: extra?.members ?? [],
    gallery: extra?.gallery ?? [],
    genres: extra?.genres.map((row) => row.genre) ?? [],
    releaseCount: extra?._count.albums ?? 0,
    monthlyListeners,
  }
}
