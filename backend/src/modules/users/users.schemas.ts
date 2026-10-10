import { z } from 'zod'
import { ROLES } from '../../shared/actor.js'
import { passwordSchema } from '../../shared/password.js'

export const updateProfileSchema = z
  .object({
    displayName: z.string().trim().min(1).max(60).optional(),
    avatarUrl: z.string().url().max(500).startsWith('https://').nullable().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, 'Send at least one field to change')

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: passwordSchema,
})

export const userListQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  role: z.enum(ROLES).optional(),
})
