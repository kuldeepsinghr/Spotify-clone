import type { Request, Response } from 'express'
import { pageQuerySchema } from '../../shared/pagination.js'
import { sendData, sendPage } from '../../shared/response.js'
import { parse } from '../../shared/validate.js'
import { recordPlaySchema } from './history.schemas.js'
import { historyService } from './history.service.js'

export const historyController = {
  /** 201 when the play was recorded; 200 with `recorded: false` and a reason when it was not. */
  async record(req: Request, res: Response) {
    const result = await historyService.record(req.actor!, parse(recordPlaySchema, req.body ?? {}))
    sendData(res, result, undefined, result.recorded ? 201 : 200)
  },

  async list(req: Request, res: Response) {
    sendPage(res, await historyService.list(req.actor!, parse(pageQuerySchema, req.query)))
  },

  async clear(req: Request, res: Response) {
    await historyService.clear(req.actor!)
    res.status(204).end()
  },
}
