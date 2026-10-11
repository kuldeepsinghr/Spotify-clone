import { Router } from 'express'
import { requireRole } from '../../middleware/auth.js'
import { moderationController } from '../moderation/moderation.controller.js'
import { adminController } from './admin.controller.js'

export const adminRouter = Router()

adminRouter.use(requireRole('admin'))
adminRouter.get('/users', adminController.listUsers)
adminRouter.get('/users/:id', adminController.getUser)
adminRouter.patch('/users/:id/role', adminController.setRole)
adminRouter.patch('/users/:id/status', adminController.setStatus)

adminRouter.get('/overview', moderationController.overview)
adminRouter.get('/queue/profiles', moderationController.profileQueue)
adminRouter.get('/queue/profiles/:id', moderationController.profileDetail)
adminRouter.post('/queue/profiles/:id/decision', moderationController.decideProfile)
adminRouter.get('/queue/releases', moderationController.releaseQueue)
adminRouter.get('/queue/releases/:id', moderationController.releaseDetail)
adminRouter.post('/queue/releases/:id/decision', moderationController.decideRelease)
adminRouter.post('/artists/:id/suspend', moderationController.suspend)
adminRouter.post('/artists/:id/restore', moderationController.restoreArtist)
adminRouter.post('/artists/:id/verified', moderationController.verified)
adminRouter.get('/artists', moderationController.artists)
adminRouter.post('/releases/:id/takedown', moderationController.takedown)
adminRouter.post('/releases/:id/restore', moderationController.restoreRelease)
adminRouter.get('/content', moderationController.content)
adminRouter.get('/genres', moderationController.genres)
adminRouter.post('/genres', moderationController.createGenre)
adminRouter.patch('/genres/:id', moderationController.updateGenre)
adminRouter.get('/countries', moderationController.countries)
adminRouter.post('/countries', moderationController.createCountry)
adminRouter.patch('/countries/:id', moderationController.updateCountry)
adminRouter.get('/audit', moderationController.audit)
adminRouter.get('/reports', moderationController.reports)
adminRouter.patch('/reports/:id', moderationController.setReport)
