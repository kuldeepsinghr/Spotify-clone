import { Router } from 'express'
import { albumsRouter } from './modules/albums/albums.routes.js'
import { artistsRouter } from './modules/artists/artists.routes.js'
import { healthRouter } from './modules/health/health.routes.js'
import { searchRouter } from './modules/search/search.routes.js'
import { tracksRouter } from './modules/tracks/tracks.routes.js'

export const v1Router = Router()

v1Router.use(healthRouter)
v1Router.use('/albums', albumsRouter)
v1Router.use('/artists', artistsRouter)
v1Router.use('/tracks', tracksRouter)
v1Router.use('/search', searchRouter)
