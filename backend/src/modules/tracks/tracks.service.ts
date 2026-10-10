import { notFound } from '../../shared/errors.js'
import { afterIdFrom, toIdPage, type PageRequest } from '../../shared/pagination.js'
import type { SearchWindow } from '../../shared/search.js'
import { tracksRepository, type NewTrack, type TrackRow } from './tracks.repository.js'

export type Track = TrackRow
export type { NewTrack }

/** Returns rows in the order of `ids`, dropping IDs that no longer exist. */
const inIdOrder = (ids: string[], rows: Track[]) => {
  const byId = new Map(rows.map((row) => [row.id, row]))
  return ids.flatMap((id) => byId.get(id) ?? [])
}

export const tracksService = {
  async list(page: PageRequest) {
    const rows = await tracksRepository.list({ take: page.limit + 1, afterId: afterIdFrom(page) })
    return toIdPage(rows, page.limit)
  },

  async get(id: string) {
    const track = await tracksRepository.findById(id)
    if (!track) throw notFound('Track')
    return track
  },

  async listByAlbum(albumId: string, page: PageRequest) {
    const rows = await tracksRepository.listByAlbum(albumId, {
      take: page.limit + 1,
      afterId: afterIdFrom(page),
    })
    return toIdPage(rows, page.limit)
  },

  albumStats: (albumId: string) => tracksRepository.albumStats(albumId),

  countByAlbum: (albumId: string) => tracksRepository.countByAlbum(albumId),

  async topByArtist(artistId: string, limit: number) {
    const ids = await tracksRepository.topIdsByArtist(artistId, limit)
    return inIdOrder(ids, await tracksRepository.findByIds(ids))
  },

  async search(window: SearchWindow) {
    const ids = await tracksRepository.searchIds(window)
    return inIdOrder(ids, await tracksRepository.findByIds(ids))
  },

  listOldestFirst: (limit: number) => tracksRepository.listOldestFirst(limit),

  create: (track: NewTrack) => tracksRepository.create(track),

  async remove(id: string) {
    await tracksService.get(id)
    await tracksRepository.delete(id)
  },
}
