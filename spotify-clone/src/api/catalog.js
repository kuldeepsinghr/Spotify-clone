import { api, fetchAll } from './client.js'

export const catalogApi = {
  listAlbums: () => fetchAll('/v1/albums'),
  listTracks: () => fetchAll('/v1/tracks'),
  getAlbum: async (id) => (await api.get(`/v1/albums/${id}`)).data.data,
  albumTracks: async (id) => (await fetchAll(`/v1/albums/${id}/tracks`)),
}
