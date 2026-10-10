import { Router } from 'express'
import { upload } from '../../middleware/upload.js'
import { legacyController } from './legacy.controller.js'

/** Old contract used by the current front ends. Unauthenticated, as before; removed in M6. */
export const legacyRouter = Router()

legacyRouter.get('/song/list', legacyController.listSongs)
legacyRouter.post(
  '/song/add',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'audio', maxCount: 1 },
  ]),
  legacyController.addSong,
)
legacyRouter.post('/song/remove', legacyController.removeSong)

legacyRouter.get('/album/list', legacyController.listAlbums)
legacyRouter.post('/album/add', upload.single('image'), legacyController.addAlbum)
legacyRouter.post('/album/remove', legacyController.removeAlbum)
