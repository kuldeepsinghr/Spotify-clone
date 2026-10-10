import { Router } from 'express'
import { tracksController } from './tracks.controller.js'

export const tracksRouter = Router()

tracksRouter.get('/', tracksController.list)
tracksRouter.get('/:id', tracksController.get)
