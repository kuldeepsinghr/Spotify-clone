import type { Actor } from '../../shared/actor.js'
import { prisma } from '../../shared/db.js'
import { AppError, ErrorCode, badRequest, notFound } from '../../shared/errors.js'
import { afterIdFrom, startAfter, toIdPage, type PageRequest } from '../../shared/pagination.js'
import { portalLink } from '../../shared/mail.js'
import { recordAudit } from '../portal/audit.js'
import { rejectionLabel } from '../portal/constants.js'
import { notify, notifyAdmins } from '../portal/notify.js'
import { loadProfile, toProfile } from '../portal/profile.repository.js'

const releaseInclude = {
  artist: { select: { id: true, name: true, status: true, ownerUserId: true } },
  primaryGenre: { select: { id: true, name: true } },
  tracks: {
    orderBy: { trackNumber: 'asc' as const },
    select: {
      id: true,
      title: true,
      durationMs: true,
      audioUrl: true,
      isExplicit: true,
      processingStatus: true,
      trackNumber: true,
    },
  },
}

async function artistOwnerEmail(artistId: string) {
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { name: true, ownerUserId: true, owner: { select: { email: true } } },
  })
  if (!artist?.ownerUserId || !artist.owner) return null
  return artist
}

export const moderationService = {
  async overview() {
    const weekAgo = new Date(Date.now() - 7 * 86_400_000)
    const [pendingProfiles, pendingReleases, newArtists, openReports] = await Promise.all([
      prisma.artist.count({ where: { status: 'pending_review' } }),
      prisma.album.count({ where: { status: 'in_review' } }),
      prisma.artist.count({ where: { createdAt: { gte: weekAgo }, ownerUserId: { not: null } } }),
      prisma.report.count({ where: { status: 'open' } }),
    ])
    return { pendingProfiles, pendingReleases, newArtists, openReports }
  },

  async profileQueue(page: PageRequest, status?: string) {
    const rows = await prisma.artist.findMany({
      where: { status: (status as 'pending_review') ?? 'pending_review', ownerUserId: { not: null } },
      orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
      take: page.limit + 1,
      ...cursor(page),
      select: { id: true, name: true, status: true, submittedAt: true, imageUrl: true, country: true },
    })
    return toIdPage(rows, page.limit)
  },

  async profileDetail(id: string) {
    const artist = await loadProfile(id)
    return toProfile(artist, true)
  },

  async decideProfile(
    actor: Actor,
    id: string,
    input: { decision: 'approved' | 'rejected'; reason?: string; hint?: string },
  ) {
    const artist = await loadProfile(id)
    if (artist.status !== 'pending_review') throw badRequest('This profile is not waiting for review')
    if (input.decision === 'rejected' && !input.reason) {
      throw badRequest('A rejection needs a reason', [{ path: 'reason', message: 'Required' }])
    }
    const reason = input.reason ? rejectionLabel(input.reason) : ''
    const hint = input.hint?.trim() ?? ''
    if (input.decision === 'rejected' && !hint) {
      throw badRequest('Tell the artist how to fix it', [{ path: 'hint', message: 'Required' }])
    }
    const updated = await prisma.artist.update({
      where: { id },
      data:
        input.decision === 'approved'
          ? { status: 'approved', approvedAt: new Date(), approvedById: actor.id, rejectionReason: null, rejectionHint: null }
          : { status: 'rejected', rejectionReason: reason, rejectionHint: hint },
      include: { owner: { select: { id: true, email: true } } },
    })
    await prisma.reviewEvent.create({
      data: {
        subjectType: 'artist',
        subjectId: id,
        reviewerId: actor.id,
        decision: input.decision,
        reason,
        hint,
      },
    })
    await recordAudit({
      actorId: actor.id,
      action: input.decision === 'approved' ? 'artist.approved' : 'artist.rejected',
      subjectType: 'artist',
      subjectId: id,
      details: { reason, hint },
    })
    if (updated.owner) {
      const approved = input.decision === 'approved'
      await notify({
        userId: updated.owner.id,
        type: approved ? 'artist.approved' : 'artist.rejected',
        message: approved
          ? `${updated.name} is approved. You can now submit releases.`
          : `${updated.name} was not approved.`,
        reason: approved ? '' : reason,
        hint: approved ? '' : hint,
        email: {
          to: updated.owner.email,
          subject: approved ? 'Your artist profile was approved' : 'Your artist profile needs changes',
          text: approved
            ? `Your profile ${updated.name} is approved. Open ${portalLink('/dashboard')} to publish music.`
            : `Your profile was not approved.\nReason: ${reason}\nHow to fix it: ${hint}\n${portalLink('/profile')}`,
        },
      })
    }
    return { id, status: updated.status }
  },

  async releaseQueue(page: PageRequest, status?: string) {
    const rows = await prisma.album.findMany({
      where: { status: (status as 'in_review') ?? 'in_review' },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      take: page.limit + 1,
      ...cursor(page),
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        coverUrl: true,
        updatedAt: true,
        artist: { select: { id: true, name: true } },
      },
    })
    return toIdPage(rows, page.limit)
  },

  async releaseDetail(id: string) {
    const release = await prisma.album.findUnique({ where: { id }, include: releaseInclude })
    if (!release) throw notFound('Release')
    return {
      ...release,
      explicit: release.tracks.some((track) => track.isExplicit),
      rightsConfirmed: Boolean(release.rightsConfirmedAt),
    }
  },

  async decideRelease(
    actor: Actor,
    id: string,
    input: { decision: 'approved' | 'rejected'; reason?: string; hint?: string },
  ) {
    const release = await prisma.album.findUnique({
      where: { id },
      include: { artist: { select: { id: true, name: true, status: true, ownerUserId: true } } },
    })
    if (!release) throw notFound('Release')
    if (release.status !== 'in_review') throw badRequest('This release is not waiting for review')
    if (input.decision === 'approved' && release.artist.status !== 'approved') {
      throw new AppError(409, ErrorCode.CONFLICT, 'Approve the artist profile before approving a release')
    }
    if (input.decision === 'rejected' && (!input.reason || !input.hint?.trim())) {
      throw badRequest('A rejection needs a reason and a fix hint')
    }
    const reason = input.reason ? rejectionLabel(input.reason) : ''
    const hint = input.hint?.trim() ?? ''
    const future = release.releasedAt && release.releasedAt > new Date()
    const nextStatus = input.decision === 'rejected' ? 'rejected' : future ? 'scheduled' : 'published'
    await prisma.album.update({
      where: { id },
      data: {
        status: nextStatus,
        publishedAt: nextStatus === 'published' ? new Date() : null,
        rejectionReason: input.decision === 'rejected' ? reason : null,
        rejectionHint: input.decision === 'rejected' ? hint : null,
      },
    })
    await prisma.reviewEvent.create({
      data: { subjectType: 'release', subjectId: id, reviewerId: actor.id, decision: input.decision, reason, hint },
    })
    await recordAudit({
      actorId: actor.id,
      action: input.decision === 'approved' ? 'release.approved' : 'release.rejected',
      subjectType: 'release',
      subjectId: id,
      details: { status: nextStatus, reason, hint },
    })
    const owner = await artistOwnerEmail(release.artistId)
    if (owner?.ownerUserId && owner.owner) {
      const published = nextStatus === 'published'
      await notify({
        userId: owner.ownerUserId,
        type: `release.${nextStatus}`,
        message: published
          ? `"${release.title}" is now public`
          : nextStatus === 'scheduled'
            ? `"${release.title}" is approved and will go live on its release date`
            : `"${release.title}" was not approved`,
        reason,
        hint,
        email: {
          to: owner.owner.email,
          subject: `Release “${release.title}” was ${input.decision === 'approved' ? 'approved' : 'rejected'}`,
          text:
            input.decision === 'approved'
              ? `"${release.title}" is ${nextStatus}.`
              : `Reason: ${reason}\nHow to fix it: ${hint}`,
        },
      })
    }
    return { id, status: nextStatus }
  },

  async setArtistState(actor: Actor, id: string, action: 'suspend' | 'restore', reason: string) {
    if (!reason.trim()) throw badRequest('A reason is required')
    const artist = await prisma.artist.findUnique({ where: { id }, select: { id: true, status: true, ownerUserId: true, name: true } })
    if (!artist) throw notFound('Artist')
    const status = action === 'suspend' ? 'suspended' : 'approved'
    await prisma.artist.update({ where: { id }, data: { status } })
    await recordAudit({
      actorId: actor.id,
      action: action === 'suspend' ? 'artist.suspended' : 'artist.restored',
      subjectType: 'artist',
      subjectId: id,
      details: { reason },
    })
    if (artist.ownerUserId) {
      const owner = await prisma.user.findUnique({ where: { id: artist.ownerUserId }, select: { email: true } })
      await notify({
        userId: artist.ownerUserId,
        type: `artist.${status}`,
        message: action === 'suspend' ? `${artist.name} was suspended` : `${artist.name} was restored`,
        reason,
        hint: action === 'suspend' ? 'Contact support if you think this is a mistake.' : '',
        email: owner
          ? { to: owner.email, subject: `Artist account ${action === 'suspend' ? 'suspended' : 'restored'}`, text: reason }
          : undefined,
      })
    }
    return { id, status }
  },

  async setVerified(actor: Actor, id: string, verified: boolean) {
    const artist = await prisma.artist.findUnique({ where: { id }, select: { id: true } })
    if (!artist) throw notFound('Artist')
    await prisma.artist.update({ where: { id }, data: { verified } })
    await recordAudit({
      actorId: actor.id,
      action: verified ? 'artist.verified' : 'artist.unverified',
      subjectType: 'artist',
      subjectId: id,
      details: {},
    })
    return { id, verified }
  },

  async takedown(actor: Actor, id: string, reason: string, restore: boolean) {
    if (!reason.trim()) throw badRequest('A reason is required')
    const release = await prisma.album.findUnique({
      where: { id },
      select: { id: true, title: true, status: true, artistId: true },
    })
    if (!release) throw notFound('Release')
    const status = restore ? 'published' : 'taken_down'
    if (!restore && release.status !== 'published' && release.status !== 'scheduled') {
      throw badRequest('Only a live release can be taken down')
    }
    if (restore) {
      const artist = await prisma.artist.findUnique({ where: { id: release.artistId }, select: { status: true } })
      if (artist?.status !== 'approved') throw new AppError(409, ErrorCode.CONFLICT, 'The artist is not approved')
    }
    await prisma.album.update({
      where: { id },
      data: { status, publishedAt: restore ? new Date() : undefined },
    })
    await recordAudit({
      actorId: actor.id,
      action: restore ? 'release.restored' : 'release.takedown',
      subjectType: 'release',
      subjectId: id,
      details: { reason },
    })
    const owner = await artistOwnerEmail(release.artistId)
    if (owner?.ownerUserId && owner.owner) {
      await notify({
        userId: owner.ownerUserId,
        type: restore ? 'release.restored' : 'release.taken_down',
        message: restore ? `"${release.title}" is public again` : `"${release.title}" was taken down`,
        reason,
        hint: restore ? '' : 'Review the reason and contact support if you want to appeal.',
        email: {
          to: owner.owner.email,
          subject: restore ? `“${release.title}” was restored` : `“${release.title}” was taken down`,
          text: `Reason: ${reason}`,
        },
      })
    }
    return { id, status }
  },

  async listArtists(page: PageRequest, q?: string) {
    const rows = await prisma.artist.findMany({
      where: q
        ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { slug: { contains: q, mode: 'insensitive' } }] }
        : {},
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: page.limit + 1,
      ...cursor(page),
      select: { id: true, name: true, slug: true, status: true, verified: true, imageUrl: true, createdAt: true },
    })
    return toIdPage(rows, page.limit)
  },

  async listContent(page: PageRequest, q?: string) {
    const rows = await prisma.album.findMany({
      where: q ? { title: { contains: q, mode: 'insensitive' } } : {},
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: page.limit + 1,
      ...cursor(page),
      select: {
        id: true,
        title: true,
        status: true,
        type: true,
        coverUrl: true,
        artist: { select: { id: true, name: true } },
      },
    })
    return toIdPage(rows, page.limit)
  },

  listGenres: () => prisma.genre.findMany({ orderBy: { name: 'asc' } }),

  async createGenre(actor: Actor, name: string) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const genre = await prisma.genre.create({ data: { name, slug } })
    await recordAudit({ actorId: actor.id, action: 'genre.created', subjectType: 'genre', subjectId: genre.id, details: { name } })
    return genre
  },

  async updateGenre(actor: Actor, id: string, input: { name?: string; isActive?: boolean }) {
    const genre = await prisma.genre.update({
      where: { id },
      data: {
        name: input.name,
        isActive: input.isActive,
        slug: input.name ? input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : undefined,
      },
    })
    await recordAudit({ actorId: actor.id, action: 'genre.updated', subjectType: 'genre', subjectId: id, details: input })
    return genre
  },

  listCountries: () => prisma.country.findMany({ orderBy: { name: 'asc' } }),

  async createCountry(actor: Actor, input: { code: string; name: string }) {
    const country = await prisma.country.create({ data: { code: input.code.toUpperCase(), name: input.name } })
    await recordAudit({ actorId: actor.id, action: 'country.created', subjectType: 'country', subjectId: country.id, details: input })
    return country
  },

  async updateCountry(id: string, isActive: boolean) {
    return prisma.country.update({ where: { id }, data: { isActive } })
  },

  async auditLog(page: PageRequest, action?: string) {
    const rows = await prisma.auditLog.findMany({
      where: action ? { action } : {},
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: page.limit + 1,
      ...cursor(page),
      include: { actor: { select: { id: true, email: true, displayName: true } } },
    })
    return toIdPage(rows, page.limit)
  },

  async reports(page: PageRequest, status?: string) {
    const rows = await prisma.report.findMany({
      where: status ? { status: status as 'open' } : {},
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: page.limit + 1,
      ...cursor(page),
      include: { reporter: { select: { id: true, email: true, displayName: true } } },
    })
    return toIdPage(rows, page.limit)
  },

  async setReportStatus(actor: Actor, id: string, status: 'open' | 'resolved' | 'dismissed') {
    const report = await prisma.report.update({ where: { id }, data: { status } })
    await recordAudit({
      actorId: actor.id,
      action: 'report.updated',
      subjectType: 'report',
      subjectId: id,
      details: { status },
    })
    return report
  },
}

function cursor(page: PageRequest) {
  return startAfter(afterIdFrom(page))
}

export async function createReport(actor: Actor, input: { subjectType: 'artist' | 'track' | 'release'; subjectId: string; reason: string }) {
  const report = await prisma.report.create({
    data: { reporterId: actor.id, subjectType: input.subjectType, subjectId: input.subjectId, reason: input.reason },
  })
  await notifyAdmins({ type: 'report.opened', message: `New report on a ${input.subjectType}` })
  return { id: report.id }
}
