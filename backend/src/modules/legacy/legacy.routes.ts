import { Router } from 'express'
import { requireRole } from '../../middleware/auth.js'
import { upload } from '../../middleware/upload.js'
import { legacyController } from './legacy.controller.js'

/** Old contract used by the current front ends; removed in M6. Reads are public, writes need admin. */
export const legacyRouter = Router()

const admin = requireRole('admin')

legacyRouter.get('/song/list', legacyController.listSongs)
legacyRouter.post(
  '/song/add',
  admin,
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'audio', maxCount: 1 },
  ]),
  legacyController.addSong,
)
legacyRouter.post('/song/remove', admin, legacyController.removeSong)

legacyRouter.get('/album/list', legacyController.listAlbums)
legacyRouter.post('/album/add', admin, upload.single('image'), legacyController.addAlbum)
legacyRouter.post('/album/remove', admin, legacyController.removeAlbum)
