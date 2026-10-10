import type { Request, Response } from 'express'
import { badRequest } from '../../shared/errors.js'
import { pageQuerySchema } from '../../shared/pagination.js'
import { sendData, sendPage } from '../../shared/response.js'
import { idParamsSchema, parse } from '../../shared/validate.js'
import { createArtistSchema, topTracksQuerySchema, updateArtistSchema } from './artists.schemas.js'
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
    sendData(res, await artistsService.topTracks(id, limit, req.actor ?? null))
  },

  async create(req: Request, res: Response) {
    const body = parse(createArtistSchema, req.body ?? {})
    sendData(res, await artistsService.create({ ...body, image: req.file }), undefined, 201)
  },

  async update(req: Request, res: Response) {
    const { id } = parse(idParamsSchema, req.params)
    const body = parse(updateArtistSchema, req.body ?? {})
    if (Object.keys(body).length === 0 && !req.file)
      throw badRequest('Send at least one field to change')
    sendData(res, await artistsService.update(req.actor!, id, { ...body, image: req.file }))
  },

  async remove(req: Request, res: Response) {
    const { id } = parse(idParamsSchema, req.params)
    await artistsService.remove(id)
    res.status(204).end()
  },
}
