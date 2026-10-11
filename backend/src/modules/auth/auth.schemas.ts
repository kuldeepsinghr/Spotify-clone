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

export const registerArtistSchema = z
  .object({
    email,
    password: passwordSchema,
    confirmPassword: z.string().min(1).max(256),
    artistName: z.string().trim().min(2).max(80),
    acceptTerms: z.literal(true),
    confirmSimilarName: z.boolean().optional(),
  })
  .refine((body) => body.password === body.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

export const tokenSchema = z.object({ token: z.string().min(20).max(500) })

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(500),
  password: passwordSchema,
})

export const forgotPasswordSchema = z.object({ email })

export const changeEmailSchema = z.object({
  email,
  currentPassword: z.string().min(1).max(256),
})
