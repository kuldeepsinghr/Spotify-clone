import type { Request, Response } from 'express'
import { MAX_IMAGE_BYTES } from '../../middleware/upload.js'
import { badRequest } from '../../shared/errors.js'
import { parse } from '../../shared/validate.js'
import { addAlbumBodySchema, addSongBodySchema, removeBodySchema } from './legacy.schemas.js'
import { legacyService } from './legacy.service.js'

const fieldFile = (req: Request, field: string) =>
  Array.isArray(req.files) ? undefined : req.files?.[field]?.[0]

/** Responses keep the old top-level keys (`songs`, `album`) but use real booleans for `success`. */
export const legacyController = {
  async listSongs(_req: Request, res: Response) {
    res.json({ success: true, songs: await legacyService.listSongs() })
  },

  async listAlbums(_req: Request, res: Response) {
    res.json({ success: true, album: await legacyService.listAlbums() })
  },

  async addAlbum(req: Request, res: Response) {
    if (!req.file) throw badRequest('image file is required')
    const body = parse(addAlbumBodySchema, req.body)
    const album = await legacyService.addAlbum({
      ...body,
      image: req.file,
      maxImageBytes: MAX_IMAGE_BYTES,
    })
    res.status(201).json({ success: true, message: 'album added', album })
  },

  async addSong(req: Request, res: Response) {
    const image = fieldFile(req, 'image')
    const audio = fieldFile(req, 'audio')
    if (!image || !audio) throw badRequest('image and audio files are required')
    const body = parse(addSongBodySchema, req.body)
    const song = await legacyService.addSong({
      name: body.name,
      desc: body.desc,
      albumName: body.album,
      image,
      audio,
      maxImageBytes: MAX_IMAGE_BYTES,
    })
    res.status(201).json({ success: true, message: 'song added', song })
  },

  async removeSong(req: Request, res: Response) {
    await legacyService.removeSong(parse(removeBodySchema, req.body).id)
    res.json({ success: true, message: 'song removed' })
  },

  async removeAlbum(req: Request, res: Response) {
    await legacyService.removeAlbum(parse(removeBodySchema, req.body).id)
    res.json({ success: true, message: 'album removed' })
  },
}
