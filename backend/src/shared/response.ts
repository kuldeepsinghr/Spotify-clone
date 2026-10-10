import type { Response } from 'express'
import type { Page } from './pagination.js'

/**
 * Every response uses one envelope:
 *   success: { success: true, data, meta? }
 *   failure: { success: false, error: { code, message, details? } }  (see middleware/error-handler)
 */
export function sendData(
  res: Response,
  data: unknown,
  meta?: Record<string, unknown>,
  status = 200,
) {
  res.status(status).json(meta ? { success: true, data, meta } : { success: true, data })
}

export function sendPage<T>(res: Response, page: Page<T>) {
  sendData(res, page.items, { limit: page.limit, nextCursor: page.nextCursor })
}
