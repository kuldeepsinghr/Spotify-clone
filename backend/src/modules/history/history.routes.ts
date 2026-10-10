import { Router, type RequestHandler } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { historyController } from './history.controller.js'

/** Mounted at /v1/me/history. */
export function createHistoryRouter(playRateLimit: RequestHandler) {
  const router = Router()
  router.use(authenticate)
  router.get('/', historyController.list)
  router.post('/', playRateLimit, historyController.record)
  router.delete('/', historyController.clear)
  return router
}
