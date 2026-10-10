import { Router } from 'express'
import { optionalAuthenticate, requireRole } from '../../middleware/auth.js'
import { upload } from '../../middleware/upload.js'
import { tracksController } from './tracks.controller.js'

export const tracksRouter = Router()

tracksRouter.get('/', optionalAuthenticate, tracksController.list)
tracksRouter.get('/:id', optionalAuthenticate, tracksController.get)
// New tracks are added through POST /v1/albums/:id/tracks
tracksRouter.patch(
  '/:id',
  requireRole('artist', 'admin'),
  upload.single('image'),
  tracksController.update,
)
tracksRouter.delete('/:id', requireRole('artist', 'admin'), tracksController.remove)
