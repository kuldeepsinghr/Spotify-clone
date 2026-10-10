import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'
import { env } from './config/env.js'
import { errorHandler, notFoundHandler } from './middleware/error-handler.js'
import { legacyRouter } from './modules/legacy/legacy.routes.js'
import { createV1Router } from './routes.js'
import { logger } from './shared/logger.js'

export function createApp() {
  const app = express()
  // Number of proxy hops to trust for req.ip; rate limits key on it.
  app.set('trust proxy', env.TRUST_PROXY)

  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/v1/health' },
    }),
  )
  app.use(helmet())
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }))
  app.use(express.json({ limit: '100kb' }))
  app.use(express.urlencoded({ extended: false, limit: '100kb' }))
  app.use(cookieParser())

  app.get('/', (_req, res) => {
    res.json({ success: true, data: { name: 'spotify-clone-api', version: 'v1' } })
  })
  app.use('/v1', createV1Router())
  app.use('/api', legacyRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
