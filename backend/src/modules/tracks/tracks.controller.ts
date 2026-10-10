import type { Request, Response } from 'express'
import { badRequest } from '../../shared/errors.js'
import { sendData, sendPage } from '../../shared/response.js'
import { idParamsSchema, parse } from '../../shared/validate.js'
import { listTracksQuerySchema, updateTrackSchema } from './tracks.schemas.js'
import { tracksService } from './tracks.service.js'

export const tracksController = {
  async list(req: Request, res: Response) {
    const { artistId, ...page } = parse(listTracksQuerySchema, req.query)
    sendPage(res, await tracksService.list(page, req.actor ?? null, { artistId }))
  },

  async get(req: Request, res: Response) {
    const { id } = parse(idParamsSchema, req.params)
    sendData(res, await tracksService.get(id, req.actor ?? null))
  },

  async update(req: Request, res: Response) {
    const { id } = parse(idParamsSchema, req.params)
    const body = parse(updateTrackSchema, req.body ?? {})
    if (Object.keys(body).length === 0 && !req.file)
      throw badRequest('Send at least one field to change')
    sendData(res, await tracksService.update(req.actor!, id, { ...body, image: req.file }))
  },

  async remove(req: Request, res: Response) {
    const { id } = parse(idParamsSchema, req.params)
    await tracksService.remove(req.actor!, id)
    res.status(204).end()
  },
}
