import { Router } from 'express'
import { authenticate, requireTrustedOrigin } from '../../middleware/auth.js'
import type { createAuthRateLimits } from '../../middleware/rate-limit.js'
import { authController } from './auth.controller.js'

export function createAuthRouter(limits: ReturnType<typeof createAuthRateLimits>) {
  const router = Router()
  router.post('/register', requireTrustedOrigin, limits.register, authController.register)
  router.post(
    '/login',
    requireTrustedOrigin,
    limits.login,
    limits.loginLockout,
    authController.login,
  )
  router.post('/refresh', requireTrustedOrigin, limits.refresh, authController.refresh)
  router.post('/logout', requireTrustedOrigin, authController.logout)
  router.post('/logout-all', authenticate, authController.logoutAll)
  router.post('/register-artist', requireTrustedOrigin, limits.register, authController.registerArtist)
  router.post('/verify-email', limits.email, authController.verifyEmail)
  router.post('/resend-verification', authenticate, limits.email, authController.resendVerification)
  router.post('/forgot-password', requireTrustedOrigin, limits.email, authController.forgotPassword)
  router.post('/reset-password', requireTrustedOrigin, limits.email, authController.resetPassword)
  return router
}
