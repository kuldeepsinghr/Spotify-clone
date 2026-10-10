import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { likesController } from './likes.controller.js'

export const likesRouter = Router()

likesRouter.use(authenticate)
likesRouter.get('/', likesController.list)
likesRouter.get('/contains', likesController.contains)
likesRouter.put('/:trackId', likesController.like)
likesRouter.delete('/:trackId', likesController.unlike)
