import type { Request, Response } from 'express'
import { sendData } from '../../shared/response.js'
import { healthService } from './health.service.js'

export const healthController = {
  health(_req: Request, res: Response) {
    sendData(res, healthService.liveness())
  },

  async ready(_req: Request, res: Response) {
    sendData(res, await healthService.readiness())
  },
}
