import type { Actor } from '../../shared/actor.js'
import { AppError, badRequest, ErrorCode, forbidden, notFound } from '../../shared/errors.js'
import { artistsRepository } from './artists.repository.js'

/**
 * Ownership rules for catalog writes, shared by the albums and tracks services.
 * Kept apart from artists.service so those modules can use it without an import cycle.
 */

export async function assertCanManageArtist(actor: Actor, artistId: string) {
  if (actor.role === 'admin') return
  if (actor.role === 'artist') {
    const owned = await artistsRepository.findByOwner(actor.id)
    if (owned?.id === artistId) return
  }
  throw forbidden('You can only manage your own artist profile')
}

/** Admins name the artist; artists always publish under their own profile. */
export async function resolveArtistForRelease(actor: Actor, requestedArtistId?: string) {
  if (actor.role === 'admin') {
    if (!requestedArtistId) throw badRequest('artistId is required')
    const artist = await artistsRepository.findById(requestedArtistId)
    if (!artist) throw notFound('Artist')
    return artist.id
  }
  if (actor.role === 'artist') {
    const owned = await artistsRepository.findByOwner(actor.id)
    if (!owned) {
      throw new AppError(
        403,
        ErrorCode.ARTIST_PROFILE_REQUIRED,
        'Ask an admin to link an artist profile to your account',
      )
    }
    if (requestedArtistId && requestedArtistId !== owned.id) {
      throw forbidden('You can only publish under your own artist profile')
    }
    return owned.id
  }
  throw forbidden()
}

export async function assertArtistExists(artistId: string) {
  if (!(await artistsRepository.findById(artistId))) throw notFound('Artist')
}
