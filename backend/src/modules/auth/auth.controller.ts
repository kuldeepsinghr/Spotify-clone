import type { Request, Response } from 'express'
import { parse } from '../../shared/validate.js'
import { loginSchema, registerSchema } from './auth.schemas.js'
import { authService } from './auth.service.js'
import { clearRefreshCookie, readRefreshCookie, sendSession } from './session-cookie.js'

export const authController = {
  async register(req: Request, res: Response) {
    sendSession(res, await authService.register(parse(registerSchema, req.body)), 201)
  },

  async login(req: Request, res: Response) {
    sendSession(res, await authService.login(parse(loginSchema, req.body)))
  },

  async refresh(req: Request, res: Response) {
    try {
      sendSession(res, await authService.refresh(readRefreshCookie(req)))
    } catch (error) {
      clearRefreshCookie(res)
      throw error
    }
  },

  async logout(req: Request, res: Response) {
    await authService.logout(readRefreshCookie(req))
    clearRefreshCookie(res)
    res.status(204).end()
  },

  async logoutAll(req: Request, res: Response) {
    await authService.logoutAll(req.actor!)
    clearRefreshCookie(res)
    res.status(204).end()
  },
}
