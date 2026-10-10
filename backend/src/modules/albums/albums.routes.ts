import { Router } from 'express'
import { albumsController } from './albums.controller.js'

export const albumsRouter = Router()

albumsRouter.get('/', albumsController.list)
albumsRouter.get('/:id', albumsController.get)
albumsRouter.get('/:id/tracks', albumsController.listTracks)
