import { api, fetchAll, fetchPage } from './client.js'

const CONTAINS_CHUNK = 50

export const libraryApi = {
  like: (trackId) => api.put(`/v1/me/likes/${trackId}`),
  unlike: (trackId) => api.delete(`/v1/me/likes/${trackId}`),
  listLikes: (opts) => fetchAll('/v1/me/likes', opts),
  pageLikes: (opts) => fetchPage('/v1/me/likes', opts),
  async contains(ids) {
    const unique = [...new Set(ids.filter(Boolean))]
    const liked = {}
    for (let i = 0; i < unique.length; i += CONTAINS_CHUNK) {
      const chunk = unique.slice(i, i + CONTAINS_CHUNK)
      const { data } = await api.get('/v1/me/likes/contains', { params: { ids: chunk.join(',') } })
      Object.assign(liked, data.data)
    }
    return liked
  },

  listMyPlaylists: (opts) => fetchAll('/v1/me/playlists', opts),
  createPlaylist: async (body = {}) => (await api.post('/v1/playlists', body)).data.data,
  getPlaylist: async (id) => (await api.get(`/v1/playlists/${id}`)).data.data,
  updatePlaylist: async (id, body) => (await api.patch(`/v1/playlists/${id}`, body)).data.data,
  deletePlaylist: (id) => api.delete(`/v1/playlists/${id}`),
  listPlaylistTracks: (id, opts) => fetchAll(`/v1/playlists/${id}/tracks`, opts),
  pagePlaylistTracks: (id, opts) => fetchPage(`/v1/playlists/${id}/tracks`, opts),
  addPlaylistTrack: async (id, trackId, position) =>
    (await api.post(`/v1/playlists/${id}/tracks`, { trackId, ...(position !== undefined && { position }) }))
      .data.data,
  removePlaylistTrack: (id, trackId) => api.delete(`/v1/playlists/${id}/tracks/${trackId}`),

  listHistory: (opts) => fetchAll('/v1/me/history', opts),
  pageHistory: (opts) => fetchPage('/v1/me/history', opts),
  recordPlay: async (body) => (await api.post('/v1/me/history', body)).data.data,
  clearHistory: () => api.delete('/v1/me/history'),

  getPlayer: async () => (await api.get('/v1/me/player')).data.data,
  patchPlayer: async (body) => (await api.patch('/v1/me/player', body)).data.data,
}
