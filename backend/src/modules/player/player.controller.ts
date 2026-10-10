import type { Request, Response } from 'express'
import { sendData } from '../../shared/response.js'
import { parse } from '../../shared/validate.js'
import { updatePlayerSchema } from './player.schemas.js'
import { playerService } from './player.service.js'

export const playerController = {
  async get(req: Request, res: Response) {
    sendData(res, await playerService.get(req.actor!))
  },

  async update(req: Request, res: Response) {
    const changes = parse(updatePlayerSchema, req.body ?? {})
    sendData(res, await playerService.update(req.actor!, changes))
  },
}
