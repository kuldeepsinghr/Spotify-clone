import type { Request, Response } from 'express'
import { sendData } from '../../shared/response.js'
import { parse } from '../../shared/validate.js'
import { searchQuerySchema } from './search.schemas.js'
import { searchService } from './search.service.js'

export const searchController = {
  async search(req: Request, res: Response) {
    sendData(
      res,
      await searchService.search(parse(searchQuerySchema, req.query), req.actor ?? null),
    )
  },
}
