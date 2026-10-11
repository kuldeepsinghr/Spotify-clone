import type { Actor, Role } from '../../shared/actor.js'
import { badRequest } from '../../shared/errors.js'
import type { PageRequest } from '../../shared/pagination.js'
import { artistsService } from '../artists/artists.service.js'
import { authService } from '../auth/auth.service.js'
import { recordAudit } from '../portal/audit.js'
import { usersService } from '../users/users.service.js'

export const adminService = {
  listUsers: (page: PageRequest, filters: { query?: string; role?: Role }) =>
    usersService.list(page, filters),

  getUser: (id: string) => usersService.getProfile(id),

  /**
   * Making someone an artist links them to an artist profile: the one given, the one they
   * already own, or a new one named after them. Any other role releases their profile.
   */
  async setRole(actor: Actor, targetId: string, input: { role: Role; artistId?: string }) {
    if (input.artistId && input.role !== 'artist') {
      throw badRequest('artistId only applies when the role is artist')
    }
    if (input.artistId) await artistsService.assertAssignable(targetId, input.artistId)

    const { user } = await usersService.setRole(targetId, input.role)
    if (input.role === 'artist') {
      await artistsService.assignOwner(user.id, {
        artistId: input.artistId,
        fallbackName: user.displayName,
      })
    } else {
      await artistsService.releaseOwnership(user.id)
    }
    await recordAudit({
      actorId: actor.id,
      action: 'user.role_changed',
      subjectType: 'user',
      subjectId: targetId,
      details: { role: input.role },
    })
    return usersService.getProfile(user.id)
  },

  /** Disabling signs the user out everywhere; their access token stops working on the next request. */
  async setStatus(actor: Actor, targetId: string, disabled: boolean) {
    const user = await usersService.setDisabled(actor, targetId, disabled)
    if (disabled) await authService.revokeAllForUser(targetId)
    await recordAudit({
      actorId: actor.id,
      action: disabled ? 'user.disabled' : 'user.enabled',
      subjectType: 'user',
      subjectId: targetId,
      details: {},
    })
    return user
  },
}
