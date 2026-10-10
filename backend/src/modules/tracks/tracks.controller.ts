import type { Request, Response } from 'express'
import { pageQuerySchema } from '../../shared/pagination.js'
import { sendData, sendPage } from '../../shared/response.js'
import { idParamsSchema, parse } from '../../shared/validate.js'
import { tracksService } from './tracks.service.js'

export const tracksController = {
  async list(req: Request, res: Response) {
    sendPage(res, await tracksService.list(parse(pageQuerySchema, req.query)))
  },

  async get(req: Request, res: Response) {
    const { id } = parse(idParamsSchema, req.params)
    sendData(res, await tracksService.get(id))
  },
}
