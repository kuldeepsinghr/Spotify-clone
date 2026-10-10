import type { Request, Response } from 'express'
import { badRequest } from '../../shared/errors.js'
import { pageQuerySchema } from '../../shared/pagination.js'
import { sendData, sendPage } from '../../shared/response.js'
import { idParamsSchema, parse } from '../../shared/validate.js'
import {
  addTrackSchema,
  createPlaylistSchema,
  moveTrackSchema,
  playlistTrackParamsSchema,
  updatePlaylistSchema,
} from './playlists.schemas.js'
import { playlistsService } from './playlists.service.js'

export const playlistsController = {
  async create(req: Request, res: Response) {
    const body = parse(createPlaylistSchema, req.body ?? {})
    sendData(res, await playlistsService.create(req.actor!, body), undefined, 201)
  },

  async listMine(req: Request, res: Response) {
    sendPage(res, await playlistsService.listMine(req.actor!, parse(pageQuerySchema, req.query)))
  },

  async get(req: Request, res: Response) {
    const { id } = parse(idParamsSchema, req.params)
    sendData(res, await playlistsService.get(req.actor ?? null, id))
  },

  async update(req: Request, res: Response) {
    const { id } = parse(idParamsSchema, req.params)
    const body = parse(updatePlaylistSchema, req.body ?? {})
    if (Object.keys(body).length === 0 && !req.file)
      throw badRequest('Send at least one field to change')
    sendData(res, await playlistsService.update(req.actor!, id, { ...body, cover: req.file }))
  },

  async remove(req: Request, res: Response) {
    const { id } = parse(idParamsSchema, req.params)
    await playlistsService.remove(req.actor!, id)
    res.status(204).end()
  },

  async listTracks(req: Request, res: Response) {
    const { id } = parse(idParamsSchema, req.params)
    const page = parse(pageQuerySchema, req.query)
    sendPage(res, await playlistsService.listTracks(req.actor ?? null, id, page))
  },

  async addTrack(req: Request, res: Response) {
    const { id } = parse(idParamsSchema, req.params)
    const body = parse(addTrackSchema, req.body ?? {})
    sendData(res, await playlistsService.addTrack(req.actor!, id, body), undefined, 201)
  },

  async removeTrack(req: Request, res: Response) {
    const { id, trackId } = parse(playlistTrackParamsSchema, req.params)
    await playlistsService.removeTrack(req.actor!, id, trackId)
    res.status(204).end()
  },

  async moveTrack(req: Request, res: Response) {
    const { id, trackId } = parse(playlistTrackParamsSchema, req.params)
    const { position } = parse(moveTrackSchema, req.body ?? {})
    sendData(res, await playlistsService.moveTrack(req.actor!, id, trackId, position))
  },
}
