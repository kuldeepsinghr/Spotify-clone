import type { Request, Response } from 'express'
import { pageQuerySchema } from '../../shared/pagination.js'
import { sendData, sendPage } from '../../shared/response.js'
import { idParamsSchema, parse } from '../../shared/validate.js'
import { albumsService } from './albums.service.js'

export const albumsController = {
  async list(req: Request, res: Response) {
    sendPage(res, await albumsService.list(parse(pageQuerySchema, req.query)))
  },

  async get(req: Request, res: Response) {
    const { id } = parse(idParamsSchema, req.params)
    sendData(res, await albumsService.get(id))
  },

  async listTracks(req: Request, res: Response) {
    const { id } = parse(idParamsSchema, req.params)
    sendPage(res, await albumsService.listTracks(id, parse(pageQuerySchema, req.query)))
  },
}
