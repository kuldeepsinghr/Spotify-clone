import { prisma } from '../../shared/db.js'
import { sendMail } from '../../shared/mail.js'

export async function notify(input: {
  userId: string
  type: string
  message: string
  reason?: string
  hint?: string
  email?: { to: string; subject: string; text: string }
}) {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      message: input.message,
      reason: input.reason ?? '',
      hint: input.hint ?? '',
    },
  })
  if (input.email) await sendMail(input.email).catch(() => undefined)
}

export async function notifyAdmins(input: { type: string; message: string }) {
  const admins = await prisma.user.findMany({
    where: { role: 'admin', isDisabled: false },
    select: { id: true },
  })
  if (admins.length === 0) return
  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      type: input.type,
      message: input.message,
    })),
  })
}

export const notificationsRepository = {
  list: (userId: string, take: number, afterId?: string) =>
    prisma.notification.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      ...(afterId ? { cursor: { id: afterId }, skip: 1 } : {}),
    }),

  unreadCount: (userId: string) => prisma.notification.count({ where: { userId, isRead: false } }),

  markRead: (userId: string, ids?: string[]) =>
    prisma.notification.updateMany({
      where: { userId, ...(ids?.length ? { id: { in: ids } } : {}), isRead: false },
      data: { isRead: true },
    }),
}
