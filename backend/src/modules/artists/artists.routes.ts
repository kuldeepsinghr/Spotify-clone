import { Router } from 'express'
import { optionalAuthenticate, requireRole } from '../../middleware/auth.js'
import { upload } from '../../middleware/upload.js'
import { artistsController } from './artists.controller.js'

export const artistsRouter = Router()

artistsRouter.get('/', artistsController.list)
artistsRouter.get('/slug/:slug', artistsController.getBySlug)
artistsRouter.get('/:id', artistsController.get)
artistsRouter.get('/:id/albums', artistsController.listAlbums)
artistsRouter.get('/:id/top-tracks', optionalAuthenticate, artistsController.topTracks)

artistsRouter.post('/', requireRole('admin'), upload.single('image'), artistsController.create)
artistsRouter.patch(
  '/:id',
  requireRole('artist', 'admin'),
  upload.single('image'),
  artistsController.update,
)
artistsRouter.delete('/:id', requireRole('admin'), artistsController.remove)
