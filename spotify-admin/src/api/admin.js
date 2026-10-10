import { api, fetchPage } from './client.js'

export const adminApi = {
  pageUsers: (opts) => fetchPage('/v1/admin/users', opts),
  setRole: (id, body) => api.patch(`/v1/admin/users/${id}/role`, body),
  setStatus: (id, disabled) => api.patch(`/v1/admin/users/${id}/status`, { disabled }),
}
