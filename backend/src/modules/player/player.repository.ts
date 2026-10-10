import type { RepeatMode } from '@prisma/client'
import { prisma } from '../../shared/db.js'

export interface PlayerStateChanges {
  lastTrackId?: string | null
  positionMs?: number
  volume?: number
  repeatMode?: RepeatMode
  shuffle?: boolean
}

const stateSelect = {
  lastTrackId: true,
  positionMs: true,
  volume: true,
  repeatMode: true,
  shuffle: true,
  updatedAt: true,
} as const

export const playerRepository = {
  find: (userId: string) =>
    prisma.userPlayerState.findUnique({ where: { userId }, select: stateSelect }),

  upsert: (userId: string, changes: PlayerStateChanges) =>
    prisma.userPlayerState.upsert({
      where: { userId },
      create: { userId, ...changes },
      update: changes,
      select: stateSelect,
    }),
}
