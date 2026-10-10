import { api, setAccessToken } from './client.js'

const applySession = (payload) => {
  setAccessToken(payload.accessToken)
  return payload.user
}

export const authApi = {
  async restore() {
    try {
      const { data } = await api.post('/v1/auth/refresh')
      return applySession(data.data)
    } catch {
      setAccessToken(null)
      return null
    }
  },

  async login(body) {
    const { data } = await api.post('/v1/auth/login', body)
    return applySession(data.data)
  },

  async logout() {
    try {
      await api.post('/v1/auth/logout')
    } finally {
      setAccessToken(null)
    }
  },
}
