import type { Request, Response } from 'express'
import { pageQuerySchema } from '../../shared/pagination.js'
import { sendData, sendPage } from '../../shared/response.js'
import { idParamsSchema, parse } from '../../shared/validate.js'
import { userListQuerySchema } from '../users/users.schemas.js'
import { setRoleSchema, setStatusSchema } from './admin.schemas.js'
import { adminService } from './admin.service.js'

export const adminController = {
  async listUsers(req: Request, res: Response) {
    const page = parse(pageQuerySchema, req.query)
    const { q, role } = parse(userListQuerySchema, req.query)
    sendPage(res, await adminService.listUsers(page, { query: q, role }))
  },

  async getUser(req: Request, res: Response) {
    const { id } = parse(idParamsSchema, req.params)
    sendData(res, await adminService.getUser(id))
  },

  async setRole(req: Request, res: Response) {
    const { id } = parse(idParamsSchema, req.params)
    sendData(res, await adminService.setRole(id, parse(setRoleSchema, req.body ?? {})))
  },

  async setStatus(req: Request, res: Response) {
    const { id } = parse(idParamsSchema, req.params)
    const { disabled } = parse(setStatusSchema, req.body ?? {})
    sendData(res, await adminService.setStatus(req.actor!, id, disabled))
  },
}
