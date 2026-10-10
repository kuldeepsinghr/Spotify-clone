import axios from 'axios'
import { API_URL } from '../config.js'

/** Held in memory only. The refresh token lives in an httpOnly cookie. */
let accessToken = null

export const setAccessToken = (token) => {
  accessToken = token
}

export const getAccessToken = () => accessToken

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

let refreshInFlight = null

const isAuthPath = (url = '') => url.includes('/v1/auth/')

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (!original || original._retried || error.response?.status !== 401 || isAuthPath(original.url)) {
      throw error
    }
    original._retried = true
    refreshInFlight ??= api.post('/v1/auth/refresh').finally(() => {
      refreshInFlight = null
    })
    try {
      const { data } = await refreshInFlight
      setAccessToken(data.data.accessToken)
      original.headers.Authorization = `Bearer ${data.data.accessToken}`
      return api(original)
    } catch {
      setAccessToken(null)
      throw error
    }
  },
)

export async function fetchAll(path, { max = 500, params = {} } = {}) {
  const items = []
  let cursor
  do {
    const { data } = await api.get(path, { params: { ...params, limit: 100, cursor } })
    items.push(...data.data)
    cursor = data.meta?.nextCursor
  } while (cursor && items.length < max)
  return items
}
