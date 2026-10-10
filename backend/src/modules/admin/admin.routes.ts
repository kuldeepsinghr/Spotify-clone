import { Router } from 'express'
import { requireRole } from '../../middleware/auth.js'
import { adminController } from './admin.controller.js'

export const adminRouter = Router()

adminRouter.use(requireRole('admin'))
adminRouter.get('/users', adminController.listUsers)
adminRouter.get('/users/:id', adminController.getUser)
adminRouter.patch('/users/:id/role', adminController.setRole)
adminRouter.patch('/users/:id/status', adminController.setStatus)
