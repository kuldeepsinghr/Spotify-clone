import type { Request, Response } from 'express'
import { badRequest } from '../../shared/errors.js'
import { pageQuerySchema } from '../../shared/pagination.js'
import { sendData, sendPage } from '../../shared/response.js'
import { idParamsSchema, parse } from '../../shared/validate.js'
import { createAlbumSchema, createTrackSchema, updateAlbumSchema } from './albums.schemas.js'
import { albumsService } from './albums.service.js'

const fieldFile = (req: Request, field: string) =>
  Array.isArray(req.files) ? undefined : req.files?.[field]?.[0]

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
    const page = parse(pageQuerySchema, req.query)
    sendPage(res, await albumsService.listTracks(id, page, req.actor ?? null))
  },

  async create(req: Request, res: Response) {
    if (!req.file) throw badRequest('cover file is required')
    const body = parse(createAlbumSchema, req.body ?? {})
    const album = await albumsService.create(req.actor!, { ...body, cover: req.file })
    sendData(res, album, undefined, 201)
  },

  async update(req: Request, res: Response) {
    const { id } = parse(idParamsSchema, req.params)
    const body = parse(updateAlbumSchema, req.body ?? {})
    if (Object.keys(body).length === 0 && !req.file)
      throw badRequest('Send at least one field to change')
    sendData(res, await albumsService.update(req.actor!, id, { ...body, cover: req.file }))
  },

  async remove(req: Request, res: Response) {
    const { id } = parse(idParamsSchema, req.params)
    await albumsService.remove(req.actor!, id)
    res.status(204).end()
  },

  async addTrack(req: Request, res: Response) {
    const { id } = parse(idParamsSchema, req.params)
    const audio = fieldFile(req, 'audio')
    if (!audio) throw badRequest('audio file is required')
    const body = parse(createTrackSchema, req.body ?? {})
    const image = fieldFile(req, 'image')
    const track = await albumsService.addTrack(req.actor!, id, { ...body, audio, image })
    sendData(res, track, undefined, 201)
  },
}
