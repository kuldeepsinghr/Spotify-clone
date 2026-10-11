import type { Request, Response } from 'express'
import { badRequest } from '../../shared/errors.js'
import { pageQuerySchema } from '../../shared/pagination.js'
import { sendData, sendPage } from '../../shared/response.js'
import { idParamsSchema, parse } from '../../shared/validate.js'
import { z } from 'zod'
import { createReport, moderationService } from './moderation.service.js'

const decisionSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  reason: z.string().trim().min(1).max(80).optional(),
  hint: z.string().trim().min(1).max(500).optional(),
})

const reasonSchema = z.object({ reason: z.string().trim().min(3).max(500) })
const queueQuery = pageQuerySchema.extend({
  status: z.string().trim().min(1).max(40).optional(),
  q: z.string().trim().min(1).max(120).optional(),
})

export const moderationController = {
  async overview(_req: Request, res: Response) {
    sendData(res, await moderationService.overview())
  },
  async profileQueue(req: Request, res: Response) {
    const query = parse(queueQuery, req.query)
    sendPage(res, await moderationService.profileQueue(query, query.status))
  },
  async profileDetail(req: Request, res: Response) {
    sendData(res, await moderationService.profileDetail(parse(idParamsSchema, req.params).id))
  },
  async decideProfile(req: Request, res: Response) {
    const { id } = parse(idParamsSchema, req.params)
    sendData(res, await moderationService.decideProfile(req.actor!, id, parse(decisionSchema, req.body)))
  },
  async releaseQueue(req: Request, res: Response) {
    const query = parse(queueQuery, req.query)
    sendPage(res, await moderationService.releaseQueue(query, query.status))
  },
  async releaseDetail(req: Request, res: Response) {
    sendData(res, await moderationService.releaseDetail(parse(idParamsSchema, req.params).id))
  },
  async decideRelease(req: Request, res: Response) {
    const { id } = parse(idParamsSchema, req.params)
    sendData(res, await moderationService.decideRelease(req.actor!, id, parse(decisionSchema, req.body)))
  },
  async suspend(req: Request, res: Response) {
    const { id } = parse(idParamsSchema, req.params)
    const { reason } = parse(reasonSchema, req.body)
    sendData(res, await moderationService.setArtistState(req.actor!, id, 'suspend', reason))
  },
  async restoreArtist(req: Request, res: Response) {
    const { id } = parse(idParamsSchema, req.params)
    const { reason } = parse(reasonSchema, req.body)
    sendData(res, await moderationService.setArtistState(req.actor!, id, 'restore', reason))
  },
  async verified(req: Request, res: Response) {
    const { id } = parse(idParamsSchema, req.params)
    const { verified } = parse(z.object({ verified: z.boolean() }), req.body)
    sendData(res, await moderationService.setVerified(req.actor!, id, verified))
  },
  async takedown(req: Request, res: Response) {
    const { id } = parse(idParamsSchema, req.params)
    const { reason } = parse(reasonSchema, req.body)
    sendData(res, await moderationService.takedown(req.actor!, id, reason, false))
  },
  async restoreRelease(req: Request, res: Response) {
    const { id } = parse(idParamsSchema, req.params)
    const { reason } = parse(reasonSchema, req.body)
    sendData(res, await moderationService.takedown(req.actor!, id, reason, true))
  },
  async artists(req: Request, res: Response) {
    const query = parse(queueQuery, req.query)
    sendPage(res, await moderationService.listArtists(query, query.q))
  },
  async content(req: Request, res: Response) {
    const query = parse(queueQuery, req.query)
    sendPage(res, await moderationService.listContent(query, query.q))
  },
  async genres(_req: Request, res: Response) {
    sendData(res, await moderationService.listGenres())
  },
  async createGenre(req: Request, res: Response) {
    const { name } = parse(z.object({ name: z.string().trim().min(2).max(40) }), req.body)
    sendData(res, await moderationService.createGenre(req.actor!, name), undefined, 201)
  },
  async updateGenre(req: Request, res: Response) {
    const { id } = parse(idParamsSchema, req.params)
    const body = parse(z.object({ name: z.string().trim().min(2).max(40).optional(), isActive: z.boolean().optional() }), req.body)
    sendData(res, await moderationService.updateGenre(req.actor!, id, body))
  },
  async countries(_req: Request, res: Response) {
    sendData(res, await moderationService.listCountries())
  },
  async createCountry(req: Request, res: Response) {
    const body = parse(z.object({ code: z.string().trim().length(2), name: z.string().trim().min(2).max(60) }), req.body)
    sendData(res, await moderationService.createCountry(req.actor!, body), undefined, 201)
  },
  async updateCountry(req: Request, res: Response) {
    const { id } = parse(idParamsSchema, req.params)
    const { isActive } = parse(z.object({ isActive: z.boolean() }), req.body)
    sendData(res, await moderationService.updateCountry(id, isActive))
  },
  async audit(req: Request, res: Response) {
    const query = parse(queueQuery, req.query)
    sendPage(res, await moderationService.auditLog(query, query.status))
  },
  async reports(req: Request, res: Response) {
    const query = parse(queueQuery, req.query)
    sendPage(res, await moderationService.reports(query, query.status))
  },
  async setReport(req: Request, res: Response) {
    const { id } = parse(idParamsSchema, req.params)
    const { status } = parse(z.object({ status: z.enum(['open', 'resolved', 'dismissed']) }), req.body)
    sendData(res, await moderationService.setReportStatus(req.actor!, id, status))
  },
}

export const reportsController = {
  async create(req: Request, res: Response) {
    const body = parse(
      z.object({
        subjectType: z.enum(['artist', 'track', 'release']),
        subjectId: z.string().uuid(),
        reason: z.string().trim().min(3).max(500),
      }),
      req.body,
    )
    if (!req.actor) throw badRequest('Sign in to report content')
    sendData(res, await createReport(req.actor, body), undefined, 201)
  },
}
