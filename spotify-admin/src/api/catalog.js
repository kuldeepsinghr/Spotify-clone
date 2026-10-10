import { api, fetchAll, fetchPage } from './client.js'

export const catalogApi = {
  listAlbums: () => fetchAll('/v1/albums'),
  pageAlbums: (opts) => fetchPage('/v1/albums', opts),
  pageTracks: (opts) => fetchPage('/v1/tracks', opts),
  pageArtists: (opts) => fetchPage('/v1/artists', opts),
  listArtists: () => fetchAll('/v1/artists'),
  albumsByArtist: (artistId) => fetchAll(`/v1/artists/${artistId}/albums`),

  createAlbum: (formData) => api.post('/v1/albums', formData),
  deleteAlbum: (id) => api.delete(`/v1/albums/${id}`),
  addTrack: (albumId, formData) => api.post(`/v1/albums/${albumId}/tracks`, formData),
  deleteTrack: (id) => api.delete(`/v1/tracks/${id}`),

  createArtist: (formData) => api.post('/v1/artists', formData),
  deleteArtist: (id) => api.delete(`/v1/artists/${id}`),
}
