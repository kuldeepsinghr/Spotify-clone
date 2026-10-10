import { createApp } from './app.js'
import { env } from './config/env.js'
import { prisma } from './shared/db.js'
import { logger } from './shared/logger.js'

const server = createApp().listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'api listening')
})

function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down')
  // Stop accepting connections, let in-flight requests finish, then release the database pool.
  server.close(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10_000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
