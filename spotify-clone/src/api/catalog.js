import { api, fetchAll, fetchPage } from './client.js'

export const catalogApi = {
  listAlbums: () => fetchAll('/v1/albums'),
  listTracks: () => fetchAll('/v1/tracks'),
  listArtists: () => fetchAll('/v1/artists'),
  pageAlbums: (opts) => fetchPage('/v1/albums', opts),
  pageTracks: (opts) => fetchPage('/v1/tracks', opts),
  getAlbum: async (id) => (await api.get(`/v1/albums/${id}`)).data.data,
  albumTracks: (id) => fetchAll(`/v1/albums/${id}/tracks`),
  getArtist: async (id) => (await api.get(`/v1/artists/${id}`)).data.data,
  artistAlbums: (id) => fetchAll(`/v1/artists/${id}/albums`),
  artistTopTracks: async (id, limit = 10) =>
    (await api.get(`/v1/artists/${id}/top-tracks`, { params: { limit } })).data.data,
  search: async ({ q, type = 'all', limit = 8, cursor } = {}) =>
    (await api.get('/v1/search', { params: { q, type, limit, cursor } })).data.data,
  report: async (body) => (await api.post('/v1/reports', body)).data.data,
}
