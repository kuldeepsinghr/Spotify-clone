import type { Prisma } from '@prisma/client'
import { prisma } from '../../shared/db.js'
import type { Actor } from '../../shared/actor.js'
import { AppError, ErrorCode, badRequest, forbidden, notFound } from '../../shared/errors.js'
import { slugify } from '../../shared/slug.js'
import { recordAudit } from './audit.js'
import { assertLinkUrl } from './constants.js'
import { notifyAdmins } from './notify.js'

const profileInclude = {
  private: true,
  links: { orderBy: { platform: 'asc' as const } },
  members: { orderBy: { position: 'asc' as const } },
  gallery: { orderBy: { position: 'asc' as const } },
  genres: { include: { genre: { select: { id: true, name: true, slug: true } } } },
  _count: { select: { albums: true } },
} satisfies Prisma.ArtistInclude

export type ArtistProfile = Prisma.ArtistGetPayload<{ include: typeof profileInclude }>

const MISSING_LABELS: Record<string, string> = {
  name: 'Add your artist name',
  image: 'Add a profile picture',
  bio: 'Write a short bio (at least 20 characters)',
  genres: 'Pick 1 to 3 genres',
  country: 'Choose your country',
  legalName: 'Add your legal name',
  contactEmail: 'Add a contact email',
}

export function completeness(artist: ArtistProfile) {
  const missing: string[] = []
  if (artist.name.trim().length < 2) missing.push('name')
  if (!artist.imageUrl) missing.push('image')
  if (artist.bio.trim().length < 20) missing.push('bio')
  if (artist.genres.length < 1 || artist.genres.length > 3) missing.push('genres')
  if (!artist.country) missing.push('country')
  if (!artist.private?.legalName.trim()) missing.push('legalName')
  if (!artist.private?.contactEmail.trim()) missing.push('contactEmail')
  const total = Object.keys(MISSING_LABELS).length
  const percent = Math.round(((total - missing.length) / total) * 100)
  return {
    percent,
    missing: missing.map((id) => ({ id, label: MISSING_LABELS[id] ?? id })),
  }
}

export function toProfile(artist: ArtistProfile, includePrivate: boolean) {
  return {
    id: artist.id,
    name: artist.name,
    slug: artist.slug,
    slugLocked: artist.slugLocked,
    shortBio: artist.bio,
    longBio: artist.longBio,
    artistType: artist.artistType,
    country: artist.country,
    city: artist.city,
    languages: artist.languages,
    yearFormed: artist.yearFormed,
    imageUrl: artist.imageUrl,
    bannerImageUrl: artist.bannerImageUrl,
    status: artist.status,
    verified: artist.verified,
    rejectionReason: artist.rejectionReason,
    rejectionHint: artist.rejectionHint,
    submittedAt: artist.submittedAt,
    approvedAt: artist.approvedAt,
    genres: artist.genres.map((row) => row.genre),
    links: artist.links.map((row) => ({ platform: row.platform, url: row.url })),
    members: artist.members.map((row) => ({ id: row.id, name: row.name, role: row.role })),
    gallery: artist.gallery.map((row) => ({ id: row.id, imageUrl: row.imageUrl, position: row.position })),
    counts: { releases: artist._count.albums },
    completeness: completeness(artist),
    private: includePrivate
      ? {
          legalName: artist.private?.legalName ?? '',
          contactEmail: artist.private?.contactEmail ?? '',
          phone: artist.private?.phone ?? '',
          proofUrl: artist.private?.proofUrl ?? null,
          management: artist.private?.management ?? '',
        }
      : undefined,
  }
}

export async function loadProfile(id: string) {
  const artist = await prisma.artist.findUnique({ where: { id }, include: profileInclude })
  if (!artist) throw notFound('Artist')
  return artist
}

export async function ownedArtist(actor: Actor) {
  const artist = await prisma.artist.findUnique({ where: { ownerUserId: actor.id }, include: profileInclude })
  if (!artist) {
    throw new AppError(403, ErrorCode.ARTIST_PROFILE_REQUIRED, 'This account has no artist profile')
  }
  return artist
}

export function assertWritable(artist: ArtistProfile) {
  if (artist.status === 'suspended') {
    throw new AppError(403, ErrorCode.ACCOUNT_SUSPENDED, 'This artist account is suspended and can only be viewed')
  }
}

async function assertNameAvailable(name: string, exceptId: string) {
  const exact = await prisma.artist.findFirst({
    where: { name: { equals: name, mode: 'insensitive' }, id: { not: exceptId } },
    select: { id: true, verified: true },
  })
  if (exact) {
    throw new AppError(409, ErrorCode.ARTIST_NAME_TAKEN, 'An artist with this name already exists')
  }
  const similar = await prisma.$queryRaw<{ name: string; verified: boolean }[]>`
    SELECT name, verified FROM artists
    WHERE id <> ${exceptId}::uuid AND word_similarity(${name}, name) > 0.55
    ORDER BY word_similarity(${name}, name) DESC
    LIMIT 5`
  return similar
}

export interface ProfilePatch {
  name?: string
  slug?: string
  shortBio?: string
  longBio?: string
  artistType?: ArtistProfile['artistType']
  country?: string
  city?: string
  languages?: string[]
  yearFormed?: number | null
  genreIds?: string[]
  links?: { platform: ArtistProfile['links'][number]['platform']; url: string }[]
  members?: { name: string; role: string }[]
  legalName?: string
  contactEmail?: string
  phone?: string
  proofUrl?: string | null
  management?: string
  confirmSimilarName?: boolean
}

export async function updateProfile(actor: Actor, patch: ProfilePatch) {
  const current = await ownedArtist(actor)
  assertWritable(current)

  if (patch.name) {
    const similar = await assertNameAvailable(patch.name, current.id)
    const verifiedClash = similar.filter((row) => row.verified)
    if (verifiedClash.length > 0) {
      throw new AppError(
        409,
        ErrorCode.NAME_SIMILAR,
        `That name is too close to a verified artist (${verifiedClash[0]!.name}). Choose a different name.`,
      )
    }
    if (similar.length > 0 && !patch.confirmSimilarName) {
      throw new AppError(
        409,
        ErrorCode.NAME_SIMILAR,
        `Similar artist names already exist: ${similar.map((row) => row.name).join(', ')}. Confirm to continue.`,
        { similar: similar.map((row) => row.name) },
      )
    }
  }

  if (patch.slug && patch.slug !== current.slug) {
    if (current.slugLocked) throw badRequest('The profile URL can only be changed once')
    const taken = await prisma.artist.findFirst({
      where: { slug: patch.slug, id: { not: current.id } },
      select: { id: true },
    })
    if (taken) throw new AppError(409, ErrorCode.CONFLICT, 'That profile URL is already taken')
  }

  if (patch.country) {
    const country = await prisma.country.findFirst({
      where: { code: patch.country, isActive: true },
      select: { code: true },
    })
    if (!country) throw badRequest('Choose a country from the list', [{ path: 'country', message: 'Unknown country' }])
  }

  if (patch.genreIds) {
    if (patch.genreIds.length < 1 || patch.genreIds.length > 3) {
      throw badRequest('Pick 1 to 3 genres', [{ path: 'genreIds', message: 'Pick 1 to 3 genres' }])
    }
    const found = await prisma.genre.count({ where: { id: { in: patch.genreIds }, isActive: true } })
    if (found !== patch.genreIds.length) throw badRequest('One of the genres is not available')
  }

  const links = patch.links?.map((link) => {
    try {
      return { platform: link.platform, url: assertLinkUrl(link.platform, link.url) }
    } catch (error) {
      throw badRequest(error instanceof Error ? error.message : 'Invalid link', [
        { path: `links.${link.platform}`, message: error instanceof Error ? error.message : 'Invalid link' },
      ])
    }
  })

  const sensitive =
    current.status === 'approved' &&
    ((patch.name && patch.name !== current.name) ||
      (patch.shortBio !== undefined && patch.shortBio !== current.bio) ||
      (patch.longBio !== undefined && patch.longBio !== current.longBio))

  const updated = await prisma.$transaction(async (tx) => {
    await tx.artist.update({
      where: { id: current.id },
      data: {
        name: patch.name,
        bio: patch.shortBio,
        longBio: patch.longBio,
        artistType: patch.artistType,
        country: patch.country,
        city: patch.city,
        languages: patch.languages,
        yearFormed: patch.yearFormed,
        slug: patch.slug,
        slugLocked: patch.slug && patch.slug !== current.slug ? true : undefined,
        ...(sensitive
          ? { status: 'pending_review', submittedAt: new Date(), rejectionReason: null, rejectionHint: null }
          : {}),
      },
    })
    if (patch.legalName !== undefined || patch.contactEmail !== undefined || patch.phone !== undefined || patch.management !== undefined || patch.proofUrl !== undefined) {
      await tx.artistPrivate.upsert({
        where: { artistId: current.id },
        create: {
          artistId: current.id,
          legalName: patch.legalName ?? '',
          contactEmail: patch.contactEmail ?? '',
          phone: patch.phone ?? '',
          management: patch.management ?? '',
          proofUrl: patch.proofUrl ?? null,
        },
        update: {
          legalName: patch.legalName,
          contactEmail: patch.contactEmail,
          phone: patch.phone,
          management: patch.management,
          proofUrl: patch.proofUrl,
        },
      })
    }
    if (patch.genreIds) {
      await tx.artistGenre.deleteMany({ where: { artistId: current.id } })
      await tx.artistGenre.createMany({
        data: patch.genreIds.map((genreId) => ({ artistId: current.id, genreId })),
      })
    }
    if (links) {
      await tx.artistLink.deleteMany({ where: { artistId: current.id } })
      if (links.length) {
        await tx.artistLink.createMany({
          data: links.map((link) => ({ artistId: current.id, platform: link.platform, url: link.url })),
        })
      }
    }
    if (patch.members) {
      await tx.artistMember.deleteMany({ where: { artistId: current.id } })
      if (patch.members.length) {
        await tx.artistMember.createMany({
          data: patch.members.map((member, position) => ({
            artistId: current.id,
            name: member.name,
            role: member.role,
            position,
          })),
        })
      }
    }
    return tx.artist.findUniqueOrThrow({ where: { id: current.id }, include: profileInclude })
  })

  if (sensitive) {
    await recordAudit({
      actorId: actor.id,
      action: 'artist.sensitive_edit',
      subjectType: 'artist',
      subjectId: current.id,
      details: { name: patch.name ?? current.name },
    })
    await notifyAdmins({
      type: 'artist.pending_review',
      message: `${updated.name} edited their profile and is waiting for review`,
    })
  }
  return toProfile(updated, true)
}

export async function submitProfile(actor: Actor) {
  const artist = await ownedArtist(actor)
  assertWritable(artist)
  const score = completeness(artist)
  if (score.missing.length) {
    throw new AppError(400, ErrorCode.PROFILE_INCOMPLETE, 'Finish the required profile fields before submitting', score.missing)
  }
  if (artist.status === 'pending_review') return toProfile(artist, true)
  const updated = await prisma.artist.update({
    where: { id: artist.id },
    data: { status: 'pending_review', submittedAt: new Date(), rejectionReason: null, rejectionHint: null },
    include: profileInclude,
  })
  await notifyAdmins({
    type: 'artist.pending_review',
    message: `${updated.name} submitted their profile for review`,
  })
  return toProfile(updated, true)
}

export async function setImage(
  actor: Actor,
  kind: 'picture' | 'banner',
  url: string,
) {
  const artist = await ownedArtist(actor)
  assertWritable(artist)
  const sensitive = artist.status === 'approved'
  const updated = await prisma.artist.update({
    where: { id: artist.id },
    data: {
      ...(kind === 'picture' ? { imageUrl: url } : { bannerImageUrl: url }),
      ...(sensitive
        ? { status: 'pending_review', submittedAt: new Date(), rejectionReason: null, rejectionHint: null }
        : {}),
    },
    include: profileInclude,
  })
  if (sensitive) {
    await recordAudit({
      actorId: actor.id,
      action: 'artist.sensitive_edit',
      subjectType: 'artist',
      subjectId: artist.id,
      details: { field: kind },
    })
  }
  return toProfile(updated, true)
}

export async function addGalleryImage(actor: Actor, url: string, publicId: string) {
  const artist = await ownedArtist(actor)
  assertWritable(artist)
  const count = await prisma.artistGallery.count({ where: { artistId: artist.id } })
  if (count >= 6) throw badRequest('A profile can have at most 6 gallery images')
  await prisma.artistGallery.create({
    data: { artistId: artist.id, imageUrl: url, publicId, position: count },
  })
  return toProfile(await loadProfile(artist.id), true)
}

export async function removeGalleryImage(actor: Actor, imageId: string) {
  const artist = await ownedArtist(actor)
  assertWritable(artist)
  const image = await prisma.artistGallery.findFirst({ where: { id: imageId, artistId: artist.id } })
  if (!image) throw notFound('Image')
  await prisma.artistGallery.delete({ where: { id: image.id } })
  return { publicId: image.publicId, profile: toProfile(await loadProfile(artist.id), true) }
}

export function suggestSlug(name: string) {
  return slugify(name)
}

export function assertCanRead(actor: Actor, artist: { ownerUserId: string | null }) {
  if (actor.role === 'admin') return
  if (artist.ownerUserId !== actor.id) throw forbidden()
}
