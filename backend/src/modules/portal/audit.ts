import type { Prisma } from '@prisma/client'
import { prisma } from '../../shared/db.js'

export async function recordAudit(entry: {
  actorId?: string | null
  action: string
  subjectType: string
  subjectId: string
  details?: Prisma.InputJsonValue
}) {
  await prisma.auditLog.create({
    data: {
      actorId: entry.actorId ?? null,
      action: entry.action,
      subjectType: entry.subjectType,
      subjectId: entry.subjectId,
      details: entry.details ?? {},
    },
  })
}
