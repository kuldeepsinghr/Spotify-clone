import { setDefaultResultOrder } from 'node:dns'
import { setDefaultAutoSelectFamily } from 'node:net'
import { createApp } from './app.js'
import { env } from './config/env.js'
import { prisma } from './shared/db.js'
import { publishDueReleases } from './modules/portal/scheduler.js'
import { logger } from './shared/logger.js'

// Docker's DNS returns NAT64 IPv6 addresses that never connect. Prefer IPv4 so Cloudinary uploads
// do not fail with ETIMEDOUT while IPv4 is reachable.
setDefaultResultOrder('ipv4first')
setDefaultAutoSelectFamily(false)

const server = createApp().listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'api listening')
})

const publisher = setInterval(() => {
  publishDueReleases().catch((error: unknown) => logger.error({ err: error }, 'release scheduler failed'))
}, 60_000)
publisher.unref()

function shutdown(signal: string) {
  clearInterval(publisher)
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
