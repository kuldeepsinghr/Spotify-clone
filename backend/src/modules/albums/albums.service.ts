import { AppError, ErrorCode, notFound } from '../../shared/errors.js'
import { afterIdFrom, toIdPage, type PageRequest } from '../../shared/pagination.js'
import type { SearchWindow } from '../../shared/search.js'
import { tracksService } from '../tracks/tracks.service.js'
import { albumsRepository, type AlbumRow, type NewAlbum } from './albums.repository.js'

export type Album = AlbumRow
export type { NewAlbum }

const inIdOrder = (ids: string[], rows: Album[]) => {
  const byId = new Map(rows.map((row) => [row.id, row]))
  return ids.flatMap((id) => byId.get(id) ?? [])
}

async function requireAlbum(id: string) {
  const album = await albumsRepository.findById(id)
  if (!album) throw notFound('Album')
  return album
}

export const albumsService = {
  async list(page: PageRequest) {
    const rows = await albumsRepository.list({ take: page.limit + 1, afterId: afterIdFrom(page) })
    return toIdPage(rows, page.limit)
  },

  /** Album with the totals an album page shows: track count and total play time. */
  async get(id: string) {
    const album = await requireAlbum(id)
    return { ...album, ...(await tracksService.albumStats(id)) }
  },

  async listTracks(albumId: string, page: PageRequest) {
    await requireAlbum(albumId)
    return tracksService.listByAlbum(albumId, page)
  },

  async listByArtist(artistId: string, page: PageRequest) {
    const rows = await albumsRepository.listByArtist(artistId, {
      take: page.limit + 1,
      afterId: afterIdFrom(page),
    })
    return toIdPage(rows, page.limit)
  },

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

  create: (album: NewAlbum) => albumsRepository.create(album),

  /** Deleting an album that still has tracks is blocked; remove or move the tracks first. */
  async remove(id: string) {
    await requireAlbum(id)
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
}
