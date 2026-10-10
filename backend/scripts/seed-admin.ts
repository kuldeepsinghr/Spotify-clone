/**
 * Creates the first admin account, or promotes an existing account to admin.
 *
 *   SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD='...' npm run db:seed
 *
 * SEED_ADMIN_PASSWORD is only needed when the account does not exist yet; an existing
 * account keeps its password and is re-enabled if it was disabled.
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { assertStrongPassword, hashPassword, passwordSchema } from '../src/shared/password.js'

const input = z
  .object({
    SEED_ADMIN_EMAIL: z.string().trim().toLowerCase().email(),
    SEED_ADMIN_PASSWORD: passwordSchema.optional(),
    SEED_ADMIN_NAME: z.string().trim().min(1).max(60).default('Admin'),
  })
  .safeParse(process.env)

if (!input.success) {
  for (const issue of input.error.issues) console.error(`${issue.path.join('.')}: ${issue.message}`)
  process.exit(1)
}

const { SEED_ADMIN_EMAIL: email, SEED_ADMIN_PASSWORD: password, SEED_ADMIN_NAME: name } = input.data
const prisma = new PrismaClient()

try {
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: 'admin', isDisabled: false },
    })
    console.log(`Promoted ${email} to admin.`)
  } else {
    if (!password) {
      console.error('SEED_ADMIN_PASSWORD is required to create a new account.')
      process.exitCode = 1
    } else {
      assertStrongPassword(password, [email.split('@')[0] ?? '', name])
      await prisma.user.create({
        data: {
          email,
          displayName: name,
          role: 'admin',
          passwordHash: await hashPassword(password),
        },
      })
      console.log(`Created admin ${email}.`)
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
