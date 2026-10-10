import { PLACEHOLDER_ARTIST_NAME } from '../../shared/catalog.js'
import { notFound } from '../../shared/errors.js'
import { afterIdFrom, toIdPage, type PageRequest } from '../../shared/pagination.js'
import type { SearchWindow } from '../../shared/search.js'
import { albumsService } from '../albums/albums.service.js'
import { tracksService } from '../tracks/tracks.service.js'
import { artistsRepository, type ArtistRow } from './artists.repository.js'

export type Artist = ArtistRow

async function requireArtist(id: string) {
  const artist = await artistsRepository.findById(id)
  if (!artist) throw notFound('Artist')
  return artist
}

export const artistsService = {
  async list(page: PageRequest) {
    const rows = await artistsRepository.list({ take: page.limit + 1, afterId: afterIdFrom(page) })
    return toIdPage(rows, page.limit)
  },

  get: (id: string) => requireArtist(id),

  async listAlbums(artistId: string, page: PageRequest) {
    await requireArtist(artistId)
    return albumsService.listByArtist(artistId, page)
  },

  async topTracks(artistId: string, limit: number) {
    await requireArtist(artistId)
    return tracksService.topByArtist(artistId, limit)
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
}
