import { AppError, ErrorCode } from '../../shared/errors.js'
import { healthRepository } from './health.repository.js'

export const healthService = {
  /** Liveness: the process is up. Never touches dependencies, so restarts are not triggered by a slow database. */
  liveness: () => ({ status: 'ok' as const, uptimeSeconds: Math.round(process.uptime()) }),

  /** Readiness: the process can serve traffic, which needs the database. */
  async readiness() {
    try {
      await healthRepository.ping()
      return { status: 'ready' as const }
    } catch {
      throw new AppError(503, ErrorCode.SERVICE_UNAVAILABLE, 'Database is not reachable')
    }
  },
}
