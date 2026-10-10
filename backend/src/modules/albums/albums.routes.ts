import { Router } from 'express'
import { optionalAuthenticate, requireRole } from '../../middleware/auth.js'
import { upload } from '../../middleware/upload.js'
import { albumsController } from './albums.controller.js'

export const albumsRouter = Router()

const publisher = requireRole('artist', 'admin')

albumsRouter.get('/', albumsController.list)
albumsRouter.get('/:id', albumsController.get)
albumsRouter.get('/:id/tracks', optionalAuthenticate, albumsController.listTracks)

albumsRouter.post('/', publisher, upload.single('cover'), albumsController.create)
albumsRouter.patch('/:id', publisher, upload.single('cover'), albumsController.update)
albumsRouter.delete('/:id', publisher, albumsController.remove)
albumsRouter.post(
  '/:id/tracks',
  publisher,
  upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ]),
  albumsController.addTrack,
)
