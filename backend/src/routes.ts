import { Router } from 'express'
import { createAuthRateLimits } from './middleware/rate-limit.js'
import { adminRouter } from './modules/admin/admin.routes.js'
import { albumsRouter } from './modules/albums/albums.routes.js'
import { artistsRouter } from './modules/artists/artists.routes.js'
import { createAuthRouter } from './modules/auth/auth.routes.js'
import { healthRouter } from './modules/health/health.routes.js'
import { searchRouter } from './modules/search/search.routes.js'
import { tracksRouter } from './modules/tracks/tracks.routes.js'
import { meRouter } from './modules/users/me.routes.js'

/** Built per app so every app (and every test) gets its own rate-limit counters. */
export function createV1Router() {
  const v1Router = Router()
  v1Router.use(healthRouter)
  v1Router.use('/auth', createAuthRouter(createAuthRateLimits()))
  v1Router.use('/me', meRouter)
  v1Router.use('/admin', adminRouter)
  v1Router.use('/albums', albumsRouter)
  v1Router.use('/artists', artistsRouter)
  v1Router.use('/tracks', tracksRouter)
  v1Router.use('/search', searchRouter)
  return v1Router
}
