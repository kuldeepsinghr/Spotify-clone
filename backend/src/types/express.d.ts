import type { Actor } from '../shared/actor.js'

declare global {
  namespace Express {
    interface Request {
      /** Set by the authenticate middleware. */
      actor?: Actor
    }
  }
}

export {}
