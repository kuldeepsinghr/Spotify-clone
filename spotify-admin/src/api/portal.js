import { api, fetchPage } from './client.js'

export const portalApi = {
  profile: async () => (await api.get('/v1/portal/profile')).data.data,
  updateProfile: async (body) => (await api.patch('/v1/portal/profile', body)).data.data,
  submitProfile: async () => (await api.post('/v1/portal/profile/submit')).data.data,
  uploadMedia: async (file, kind, onProgress) => {
    const body = new FormData()
    body.append('kind', kind)
    body.append('file', file)
    const { data } = await api.post('/v1/portal/profile/media', body, {
      onUploadProgress: (event) => onProgress?.(event.total ? event.loaded / event.total : 0),
    })
    return data.data
  },
  removeGallery: async (imageId) => (await api.delete(`/v1/portal/profile/gallery/${imageId}`)).data.data,
  reference: async () => (await api.get('/v1/portal/reference')).data.data,

  releases: (opts) => fetchPage('/v1/portal/releases', opts),
  release: async (id) => (await api.get(`/v1/portal/releases/${id}`)).data.data,
  createRelease: async (body) => (await api.post('/v1/portal/releases', body)).data.data,
  updateRelease: async (id, body) => (await api.patch(`/v1/portal/releases/${id}`, body)).data.data,
  deleteRelease: (id) => api.delete(`/v1/portal/releases/${id}`),
  uploadCover: async (id, file, onProgress) => {
    const body = new FormData()
    body.append('cover', file)
    const { data } = await api.post(`/v1/portal/releases/${id}/cover`, body, {
      onUploadProgress: (event) => onProgress?.(event.total ? event.loaded / event.total : 0),
    })
    return data.data
  },
  submitRelease: async (id) => (await api.post(`/v1/portal/releases/${id}/submit`, { rights: true })).data.data,
  unpublish: async (id) => (await api.post(`/v1/portal/releases/${id}/unpublish`)).data.data,
  addTrack: async (id, file, fields, onProgress) => {
    const body = new FormData()
    body.append('audio', file)
    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined && value !== null) body.append(key, value)
    })
    const { data } = await api.post(`/v1/portal/releases/${id}/tracks`, body, {
      onUploadProgress: (event) => onProgress?.(event.total ? event.loaded / event.total : 0),
    })
    return data.data
  },
  updateTrack: async (releaseId, trackId, body) =>
    (await api.patch(`/v1/portal/releases/${releaseId}/tracks/${trackId}`, body)).data.data,
  removeTrack: async (releaseId, trackId) =>
    (await api.delete(`/v1/portal/releases/${releaseId}/tracks/${trackId}`)).data.data,
  reorder: async (releaseId, ids) =>
    (await api.post(`/v1/portal/releases/${releaseId}/tracks/reorder`, { ids })).data.data,

  dashboard: async () => (await api.get('/v1/portal/dashboard')).data.data,
  stats: async (days) => (await api.get('/v1/portal/stats', { params: { days } })).data.data,
  notifications: (opts) => fetchPage('/v1/portal/notifications', opts),
  markRead: async (ids) => (await api.post('/v1/portal/notifications/read', { ids })).data.data,
}

export const adminPortalApi = {
  overview: async () => (await api.get('/v1/admin/overview')).data.data,
  profileQueue: (opts) => fetchPage('/v1/admin/queue/profiles', opts),
  profile: async (id) => (await api.get(`/v1/admin/queue/profiles/${id}`)).data.data,
  decideProfile: async (id, body) => (await api.post(`/v1/admin/queue/profiles/${id}/decision`, body)).data.data,
  releaseQueue: (opts) => fetchPage('/v1/admin/queue/releases', opts),
  release: async (id) => (await api.get(`/v1/admin/queue/releases/${id}`)).data.data,
  decideRelease: async (id, body) => (await api.post(`/v1/admin/queue/releases/${id}/decision`, body)).data.data,
  artists: (opts) => fetchPage('/v1/admin/artists', opts),
  suspend: async (id, reason) => (await api.post(`/v1/admin/artists/${id}/suspend`, { reason })).data.data,
  restoreArtist: async (id, reason) => (await api.post(`/v1/admin/artists/${id}/restore`, { reason })).data.data,
  setVerified: async (id, verified) => (await api.post(`/v1/admin/artists/${id}/verified`, { verified })).data.data,
  content: (opts) => fetchPage('/v1/admin/content', opts),
  takedown: async (id, reason) => (await api.post(`/v1/admin/releases/${id}/takedown`, { reason })).data.data,
  restoreRelease: async (id, reason) => (await api.post(`/v1/admin/releases/${id}/restore`, { reason })).data.data,
  genres: async () => (await api.get('/v1/admin/genres')).data.data,
  createGenre: async (name) => (await api.post('/v1/admin/genres', { name })).data.data,
  updateGenre: async (id, body) => (await api.patch(`/v1/admin/genres/${id}`, body)).data.data,
  countries: async () => (await api.get('/v1/admin/countries')).data.data,
  audit: (opts) => fetchPage('/v1/admin/audit', opts),
  reports: (opts) => fetchPage('/v1/admin/reports', opts),
  setReport: async (id, status) => (await api.patch(`/v1/admin/reports/${id}`, { status })).data.data,
}
