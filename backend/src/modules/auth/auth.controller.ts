import type { Request, Response } from 'express'
import { parse } from '../../shared/validate.js'
import {
  forgotPasswordSchema,
  loginSchema,
  registerArtistSchema,
  registerSchema,
  resetPasswordSchema,
  tokenSchema,
} from './auth.schemas.js'
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

  async registerArtist(req: Request, res: Response) {
    const { session, devVerificationUrl } = await authService.registerArtist(
      parse(registerArtistSchema, req.body),
    )
    sendSession(res, session, 201, devVerificationUrl ? { devVerificationUrl } : undefined)
  },

  async verifyEmail(req: Request, res: Response) {
    const user = await authService.verifyEmail(parse(tokenSchema, req.body).token)
    res.status(200).json({ success: true, data: { user } })
  },

  async resendVerification(req: Request, res: Response) {
    res.status(200).json({ success: true, data: await authService.resendVerification(req.actor!) })
  },

  async forgotPassword(req: Request, res: Response) {
    await authService.forgotPassword(parse(forgotPasswordSchema, req.body).email)
    res.status(204).end()
  },

  async resetPassword(req: Request, res: Response) {
    await authService.resetPassword(parse(resetPasswordSchema, req.body))
    res.status(204).end()
  },
}
