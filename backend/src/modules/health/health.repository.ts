import { prisma } from '../../shared/db.js'

export const healthRepository = {
  ping: () => prisma.$queryRaw`SELECT 1`,
}
