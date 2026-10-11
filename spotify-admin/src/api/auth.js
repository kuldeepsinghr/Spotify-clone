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

  async logoutAll() {
    try {
      await api.post('/v1/auth/logout-all')
    } finally {
      setAccessToken(null)
    }
  },

  async registerArtist(body) {
    const { data } = await api.post('/v1/auth/register-artist', body)
    return { user: applySession(data.data), devVerificationUrl: data.data.devVerificationUrl }
  },

  async verifyEmail(token) {
    const { data } = await api.post('/v1/auth/verify-email', { token })
    return data.data.user
  },

  async resendVerification() {
    await api.post('/v1/auth/resend-verification')
  },

  async forgotPassword(email) {
    await api.post('/v1/auth/forgot-password', { email })
  },

  async resetPassword(body) {
    await api.post('/v1/auth/reset-password', body)
  },

  async changePassword(body) {
    const { data } = await api.post('/v1/me/password', body)
    return applySession(data.data)
  },

  async changeEmail(body) {
    const { data } = await api.post('/v1/me/email', body)
    return data.data
  },

  async me() {
    const { data } = await api.get('/v1/me')
    return data.data
  },
}
