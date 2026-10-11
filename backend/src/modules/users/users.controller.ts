import type { Request, Response } from 'express'
import { sendData } from '../../shared/response.js'
import { parse } from '../../shared/validate.js'
import { authService } from '../auth/auth.service.js'
import { sendSession } from '../auth/session-cookie.js'
import { changeEmailSchema } from '../auth/auth.schemas.js'
import { changePasswordSchema, updateProfileSchema } from './users.schemas.js'
import { usersService } from './users.service.js'

export const meController = {
  async get(req: Request, res: Response) {
    sendData(res, await usersService.getProfile(req.actor!.id))
  },

  async update(req: Request, res: Response) {
    sendData(
      res,
      await usersService.updateProfile(req.actor!, parse(updateProfileSchema, req.body)),
    )
  },

  /** Other devices are signed out; this one gets a new session. */
  async changePassword(req: Request, res: Response) {
    sendSession(
      res,
      await authService.changePassword(req.actor!, parse(changePasswordSchema, req.body)),
    )
  },

  async changeEmail(req: Request, res: Response) {
    sendData(res, await authService.changeEmail(req.actor!, parse(changeEmailSchema, req.body)))
  },
}
