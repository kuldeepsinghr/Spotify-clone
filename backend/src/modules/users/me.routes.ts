import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { meController } from './users.controller.js'

export const meRouter = Router()

meRouter.use(authenticate)
meRouter.get('/', meController.get)
meRouter.patch('/', meController.update)
meRouter.post('/password', meController.changePassword)
meRouter.post('/email', meController.changeEmail)
