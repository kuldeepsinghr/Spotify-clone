import { z } from 'zod'
import { ROLES } from '../../shared/actor.js'

export const setRoleSchema = z
  .object({
    role: z.enum(ROLES),
    artistId: z.string().uuid().optional(),
  })
  .strict()

export const setStatusSchema = z.object({ disabled: z.boolean() }).strict()
