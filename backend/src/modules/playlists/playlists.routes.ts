import { Router } from 'express'
import { authenticate, optionalAuthenticate } from '../../middleware/auth.js'
import { upload } from '../../middleware/upload.js'
import { playlistsController } from './playlists.controller.js'

export const playlistsRouter = Router()

playlistsRouter.post('/', authenticate, playlistsController.create)
playlistsRouter.get('/:id', optionalAuthenticate, playlistsController.get)
playlistsRouter.patch('/:id', authenticate, upload.single('cover'), playlistsController.update)
playlistsRouter.delete('/:id', authenticate, playlistsController.remove)

playlistsRouter.get('/:id/tracks', optionalAuthenticate, playlistsController.listTracks)
playlistsRouter.post('/:id/tracks', authenticate, playlistsController.addTrack)
playlistsRouter.patch('/:id/tracks/:trackId', authenticate, playlistsController.moveTrack)
playlistsRouter.delete('/:id/tracks/:trackId', authenticate, playlistsController.removeTrack)

/** Mounted at /v1/me/playlists. */
export const myPlaylistsRouter = Router()

myPlaylistsRouter.get('/', authenticate, playlistsController.listMine)
