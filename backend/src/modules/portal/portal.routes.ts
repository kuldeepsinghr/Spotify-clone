import { randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'
import { Router, type RequestHandler } from 'express'
import multer from 'multer'
import { requireRole } from '../../middleware/auth.js'
import { AppError, ErrorCode } from '../../shared/errors.js'
import { prisma } from '../../shared/db.js'
import { portalController } from './portal.controller.js'

const artist = requireRole('artist', 'admin')

const upload = multer({
  storage: multer.diskStorage({
    destination: tmpdir(),
    filename: (_req, _file, callback) => callback(null, randomUUID()),
  }),
  limits: { fileSize: 200 * 1024 * 1024, files: 2, fields: 20 },
})

/** Profile and release writes stay closed until the email link has been used. Admins are exempt. */
const requireVerifiedEmail: RequestHandler = async (req, _res, next) => {
  if (req.actor?.role === 'admin') {
    next()
    return
  }
  const user = await prisma.user.findUnique({
    where: { id: req.actor!.id },
    select: { emailVerifiedAt: true },
  })
  if (!user?.emailVerifiedAt) {
    throw new AppError(403, ErrorCode.EMAIL_NOT_VERIFIED, 'Verify your email before making changes')
  }
  next()
}

const verified: RequestHandler[] = [...artist, requireVerifiedEmail]

export const portalRouter = Router()

portalRouter.get('/profile', artist, portalController.profile)
portalRouter.patch('/profile', verified, portalController.updateProfile)
portalRouter.post('/profile/submit', verified, portalController.submitProfile)
portalRouter.post('/profile/media', verified, upload.single('file'), portalController.uploadMedia)
portalRouter.delete('/profile/gallery/:imageId', verified, portalController.removeGallery)
portalRouter.get('/reference', artist, portalController.reference)

portalRouter.get('/releases', artist, portalController.listReleases)
portalRouter.post('/releases', verified, portalController.createRelease)
portalRouter.get('/releases/:id', artist, portalController.getRelease)
portalRouter.patch('/releases/:id', verified, portalController.updateRelease)
portalRouter.delete('/releases/:id', verified, portalController.removeRelease)
portalRouter.post('/releases/:id/cover', verified, upload.single('cover'), portalController.setCover)
portalRouter.post('/releases/:id/submit', verified, portalController.submitRelease)
portalRouter.post('/releases/:id/unpublish', verified, portalController.unpublish)
portalRouter.post('/releases/:id/tracks/reorder', verified, portalController.reorder)
portalRouter.post('/releases/:id/tracks', verified, upload.single('audio'), portalController.addTrack)
portalRouter.patch('/releases/:id/tracks/:trackId', verified, portalController.updateTrack)
portalRouter.delete('/releases/:id/tracks/:trackId', verified, portalController.removeTrack)

portalRouter.get('/dashboard', artist, portalController.dashboard)
portalRouter.get('/stats', artist, portalController.stats)
portalRouter.get('/notifications', artist, portalController.notifications)
portalRouter.post('/notifications/read', artist, portalController.markRead)
