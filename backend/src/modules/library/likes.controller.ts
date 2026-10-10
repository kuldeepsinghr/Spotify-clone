import type { Request, Response } from 'express'
import { pageQuerySchema } from '../../shared/pagination.js'
import { sendData, sendPage } from '../../shared/response.js'
import { parse, trackIdParamsSchema } from '../../shared/validate.js'
import { containsQuerySchema } from './likes.schemas.js'
import { likesService } from './likes.service.js'

export const likesController = {
  async list(req: Request, res: Response) {
    sendPage(res, await likesService.list(req.actor!, parse(pageQuerySchema, req.query)))
  },

  async contains(req: Request, res: Response) {
    const { ids } = parse(containsQuerySchema, req.query)
    sendData(res, await likesService.contains(req.actor!, ids))
  },

  async like(req: Request, res: Response) {
    const { trackId } = parse(trackIdParamsSchema, req.params)
    await likesService.like(req.actor!, trackId)
    res.status(204).end()
  },

  async unlike(req: Request, res: Response) {
    const { trackId } = parse(trackIdParamsSchema, req.params)
    await likesService.unlike(req.actor!, trackId)
    res.status(204).end()
  },
}
