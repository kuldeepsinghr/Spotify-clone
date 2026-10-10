import {
  decodeCursor,
  offsetCursorSchema,
  toOffsetPage,
  type Page,
} from '../../shared/pagination.js'
import type { SearchWindow } from '../../shared/search.js'
import { albumsService, type Album } from '../albums/albums.service.js'
import { artistsService, type Artist } from '../artists/artists.service.js'
import { tracksService, type Track } from '../tracks/tracks.service.js'
import { SEARCH_TYPES, type SearchQuery } from './search.schemas.js'

export interface SearchResults {
  tracks?: Page<Track>
  albums?: Page<Album>
  artists?: Page<Artist>
}

export const searchService = {
  /** One section per requested type, each paged on its own. */
  async search({ q, type, limit, cursor }: SearchQuery): Promise<SearchResults> {
    const offset = cursor ? decodeCursor(cursor, offsetCursorSchema).offset : 0
    const window: SearchWindow = { query: q, take: limit + 1, skip: offset }
    const wanted = new Set(type === 'all' ? SEARCH_TYPES : [type])

    const [tracks, albums, artists] = await Promise.all([
      wanted.has('track') ? tracksService.search(window) : undefined,
      wanted.has('album') ? albumsService.search(window) : undefined,
      wanted.has('artist') ? artistsService.search(window) : undefined,
    ])

    return {
      ...(tracks && { tracks: toOffsetPage(tracks, limit, offset) }),
      ...(albums && { albums: toOffsetPage(albums, limit, offset) }),
      ...(artists && { artists: toOffsetPage(artists, limit, offset) }),
    }
  },
}
