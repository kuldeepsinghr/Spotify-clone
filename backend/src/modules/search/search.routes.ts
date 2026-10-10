import { Router } from 'express'
import { optionalAuthenticate } from '../../middleware/auth.js'
import { searchController } from './search.controller.js'

export const searchRouter = Router()

searchRouter.get('/', optionalAuthenticate, searchController.search)
