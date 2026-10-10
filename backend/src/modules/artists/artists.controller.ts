import type { Request, Response } from 'express'
import { pageQuerySchema } from '../../shared/pagination.js'
import { sendData, sendPage } from '../../shared/response.js'
import { idParamsSchema, parse } from '../../shared/validate.js'
import { topTracksQuerySchema } from './artists.schemas.js'
import { artistsService } from './artists.service.js'

export const artistsController = {
  async list(req: Request, res: Response) {
    sendPage(res, await artistsService.list(parse(pageQuerySchema, req.query)))
  },

  async get(req: Request, res: Response) {
    const { id } = parse(idParamsSchema, req.params)
    sendData(res, await artistsService.get(id))
  },

  async listAlbums(req: Request, res: Response) {
    const { id } = parse(idParamsSchema, req.params)
    sendPage(res, await artistsService.listAlbums(id, parse(pageQuerySchema, req.query)))
  },

  async topTracks(req: Request, res: Response) {
    const { id } = parse(idParamsSchema, req.params)
    const { limit } = parse(topTracksQuerySchema, req.query)
    sendData(res, await artistsService.topTracks(id, limit))
  },
}
