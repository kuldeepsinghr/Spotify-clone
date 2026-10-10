import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { playerController } from './player.controller.js'

/** Mounted at /v1/me/player. */
export const playerRouter = Router()

playerRouter.use(authenticate)
playerRouter.get('/', playerController.get)
playerRouter.patch('/', playerController.update)
