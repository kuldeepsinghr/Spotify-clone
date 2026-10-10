import { Router } from 'express'
import { artistsController } from './artists.controller.js'

export const artistsRouter = Router()

artistsRouter.get('/', artistsController.list)
artistsRouter.get('/:id', artistsController.get)
artistsRouter.get('/:id/albums', artistsController.listAlbums)
artistsRouter.get('/:id/top-tracks', artistsController.topTracks)
