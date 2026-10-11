import { rm } from 'node:fs/promises'
import type { Request, Response } from 'express'
import { uploadMedia } from '../../config/cloudinary.js'
import { destroyMedia } from '../../config/cloudinary.js'
import { badRequest } from '../../shared/errors.js'
import { afterIdFrom, pageQuerySchema, toIdPage } from '../../shared/pagination.js'
import { sendData, sendPage } from '../../shared/response.js'
import { parse } from '../../shared/validate.js'
import { z } from 'zod'
import { dashboard, referenceData, statistics } from './dashboard.service.js'
import { inspectImage } from './media.js'
import { notificationsRepository } from './notify.js'
import {
  addGalleryImage,
  ownedArtist,
  removeGalleryImage,
  setImage,
  submitProfile,
  toProfile,
  updateProfile,
} from './profile.service.js'
import {
  profilePatchSchema,
  releaseListSchema,
  releaseUpdateSchema,
  releaseWriteSchema,
  reorderSchema,
  statsQuerySchema,
  submitReleaseSchema,
  trackPatchSchema,
  trackWriteSchema,
} from './portal.schemas.js'
import { releasesService } from './releases.service.js'

const imageIdParams = z.object({ imageId: z.string().uuid() })
const releaseParams = z.object({ id: z.string().uuid() })
const trackParams = z.object({ id: z.string().uuid(), trackId: z.string().uuid() })
const readSchema = z.object({ ids: z.array(z.string().uuid()).optional() })

async function cleanup(file?: Express.Multer.File) {
  if (file) await rm(file.path, { force: true })
}

export const portalController = {
  async profile(req: Request, res: Response) {
    sendData(res, toProfile(await ownedArtist(req.actor!), true))
  },

  async updateProfile(req: Request, res: Response) {
    sendData(res, await updateProfile(req.actor!, parse(profilePatchSchema, req.body ?? {})))
  },

  async submitProfile(req: Request, res: Response) {
    sendData(res, await submitProfile(req.actor!))
  },

  async uploadMedia(req: Request, res: Response) {
    if (!req.file) throw badRequest('file is required')
    const kind = req.body?.kind
    try {
      if (kind === 'picture' || kind === 'banner') {
        await inspectImage(req.file.path, {
          minEdge: kind === 'picture' ? 640 : 1000,
          square: kind === 'picture',
          label: kind === 'picture' ? 'Profile picture' : 'Banner',
          maxBytes: kind === 'picture' ? 5 * 1024 * 1024 : 8 * 1024 * 1024,
          size: req.file.size,
        })
        if (kind === 'banner') {
          const { imageSize } = await import('image-size')
          const { readFile } = await import('node:fs/promises')
          const size = imageSize(await readFile(req.file.path))
          if ((size.width ?? 0) < (size.height ?? 0) * 1.5) {
            throw badRequest('Banner must be a wide image')
          }
        }
        const uploaded = await uploadMedia(req.file.path, 'image')
        sendData(res, await setImage(req.actor!, kind, uploaded.url))
        return
      }
      if (kind === 'gallery') {
        await inspectImage(req.file.path, {
          minEdge: 640,
          square: false,
          label: 'Gallery image',
          maxBytes: 5 * 1024 * 1024,
          size: req.file.size,
        })
        const uploaded = await uploadMedia(req.file.path, 'image')
        sendData(res, await addGalleryImage(req.actor!, uploaded.url, uploaded.publicId), undefined, 201)
        return
      }
      throw badRequest('kind must be picture, banner, or gallery')
    } finally {
      await cleanup(req.file)
    }
  },

  async removeGallery(req: Request, res: Response) {
    const { imageId } = parse(imageIdParams, req.params)
    const result = await removeGalleryImage(req.actor!, imageId)
    await destroyMedia(result.publicId, 'image')
    sendData(res, result.profile)
  },

  async reference(_req: Request, res: Response) {
    sendData(res, await referenceData())
  },

  async listReleases(req: Request, res: Response) {
    const query = parse(releaseListSchema, req.query)
    sendPage(res, await releasesService.list(req.actor!, query, { status: query.status, q: query.q }))
  },

  async createRelease(req: Request, res: Response) {
    const body = parse(releaseWriteSchema, req.body ?? {})
    sendData(res, await releasesService.create(req.actor!, body), undefined, 201)
  },

  async getRelease(req: Request, res: Response) {
    const { id } = parse(releaseParams, req.params)
    sendData(res, await releasesService.get(req.actor!, id))
  },

  async updateRelease(req: Request, res: Response) {
    const { id } = parse(releaseParams, req.params)
    sendData(res, await releasesService.update(req.actor!, id, parse(releaseUpdateSchema, req.body ?? {})))
  },

  async removeRelease(req: Request, res: Response) {
    const { id } = parse(releaseParams, req.params)
    await releasesService.remove(req.actor!, id)
    res.status(204).end()
  },

  async setCover(req: Request, res: Response) {
    if (!req.file) throw badRequest('cover file is required')
    const { id } = parse(releaseParams, req.params)
    try {
      sendData(res, await releasesService.setCover(req.actor!, id, req.file))
    } finally {
      await cleanup(req.file)
    }
  },

  async submitRelease(req: Request, res: Response) {
    const { id } = parse(releaseParams, req.params)
    const body = parse(submitReleaseSchema, req.body ?? {})
    sendData(res, await releasesService.submit(req.actor!, id, body.rights))
  },

  async unpublish(req: Request, res: Response) {
    const { id } = parse(releaseParams, req.params)
    sendData(res, await releasesService.unpublish(req.actor!, id))
  },

  async addTrack(req: Request, res: Response) {
    if (!req.file) throw badRequest('audio file is required')
    const { id } = parse(releaseParams, req.params)
    const body = parse(trackWriteSchema, req.body ?? {})
    let credits
    let featuredArtistIds
    if (body.credits) {
      try {
        credits = z.array(z.object({ personName: z.string().trim().min(1).max(80), role: z.enum(['songwriter', 'composer', 'producer', 'other']) })).parse(JSON.parse(body.credits))
      } catch {
        throw badRequest('credits must be a JSON list of name and role')
      }
    }
    if (body.featuredArtistIds) {
      try {
        featuredArtistIds = z.array(z.string().uuid()).parse(JSON.parse(body.featuredArtistIds))
      } catch {
        throw badRequest('featuredArtistIds must be a JSON list of artist ids')
      }
    }
    sendData(
      res,
      await releasesService.addTrack(req.actor!, id, req.file, { ...body, credits, featuredArtistIds }),
      undefined,
      201,
    )
  },

  async updateTrack(req: Request, res: Response) {
    const { id, trackId } = parse(trackParams, req.params)
    sendData(res, await releasesService.updateTrack(req.actor!, id, trackId, parse(trackPatchSchema, req.body ?? {})))
  },

  async removeTrack(req: Request, res: Response) {
    const { id, trackId } = parse(trackParams, req.params)
    sendData(res, await releasesService.removeTrack(req.actor!, id, trackId))
  },

  async reorder(req: Request, res: Response) {
    const { id } = parse(releaseParams, req.params)
    sendData(res, await releasesService.reorder(req.actor!, id, parse(reorderSchema, req.body).ids))
  },

  async dashboard(req: Request, res: Response) {
    sendData(res, await dashboard(req.actor!))
  },

  async stats(req: Request, res: Response) {
    const { days } = parse(statsQuerySchema, req.query)
    sendData(res, await statistics(req.actor!, days))
  },

  async notifications(req: Request, res: Response) {
    const page = parse(pageQuerySchema, req.query)
    const rows = await notificationsRepository.list(req.actor!.id, page.limit + 1, afterIdFrom(page))
    sendPage(res, toIdPage(rows, page.limit))
  },

  async markRead(req: Request, res: Response) {
    const body = parse(readSchema, req.body ?? {})
    await notificationsRepository.markRead(req.actor!.id, body.ids)
    sendData(res, { unread: await notificationsRepository.unreadCount(req.actor!.id) })
  },
}
