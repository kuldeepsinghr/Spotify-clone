import { z } from 'zod'
import { passwordSchema } from '../../shared/password.js'

const email = z.string().trim().email().max(254)

export const registerSchema = z.object({
  email,
  password: passwordSchema,
  displayName: z.string().trim().min(1).max(60),
})

export const loginSchema = z.object({
  email,
  // Length is not checked here: a short guess gets the same answer as a wrong one.
  password: z.string().min(1).max(256),
})
