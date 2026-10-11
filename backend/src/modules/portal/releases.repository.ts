import { copyFile, rm } from 'node:fs/promises'
import { destroyMedia, uploadMedia } from '../../config/cloudinary.js'
import type { Actor } from '../../shared/actor.js'
import { prisma } from '../../shared/db.js'
import { AppError, ErrorCode, badRequest, notFound } from '../../shared/errors.js'
import { afterIdFrom, startAfter, toIdPage, type PageRequest } from '../../shared/pagination.js'
import type { TempFile } from '../../shared/temp-files.js'
import { todayUtc } from '../../shared/visibility.js'
import { recordAudit } from './audit.js'
import { inspectAudio, inspectImage } from './media.js'
import { notify, notifyAdmins } from './notify.js'
import { assertWritable, ownedArtist } from './profile.repository.js'

const releaseInclude = {
  primaryGenre: { select: { id: true, name: true, slug: true } },
  secondaryGenre: { select: { id: true, name: true, slug: true } },
  tracks: {
    orderBy: [{ discNumber: 'asc' as const }, { trackNumber: 'asc' as const }],
    include: {
      credits: true,
      artists: { include: { artist: { select: { id: true, name: true } } } },
    },
  },
}

const MAX_COVER_BYTES = 10 * 1024 * 1024
const MAX_AUDIO_BYTES = 200 * 1024 * 1024

function suggestedType(count: number) {
  if (count <= 3) return 'single' as const
  if (count <= 6) return 'ep' as const
  return 'album' as const
}

function present(release: {
  id: string
  title: string
  type: string
  status: string
  description: string
  bgColor: string
  coverUrl: string
  releasedAt: Date | null
  label: string
  copyrightC: string
  copyrightP: string
  upc: string | null
  rejectionReason: string | null
  rejectionHint: string | null
  publishedAt: Date | null
  rightsConfirmedAt: Date | null
  isCatalog: boolean
  primaryGenre: { id: string; name: string; slug: string } | null
  secondaryGenre: { id: string; name: string; slug: string } | null
  tracks: {
    id: string
    title: string
    trackNumber: number
    discNumber: number
    durationMs: number
    isExplicit: boolean
    isrc: string | null
    language: string
    lyrics: string
    processingStatus: string
    processingError: string
    audioUrl: string
    credits: { id: string; personName: string; role: string }[]
    artists: { role: string; artist: { id: string; name: string } }[]
  }[]
}) {
  const explicit = release.tracks.some((track) => track.isExplicit)
  return {
    ...release,
    explicit,
    suggestedType: suggestedType(release.tracks.length),
    tracks: release.tracks.map((track) => ({
      id: track.id,
      title: track.title,
      trackNumber: track.trackNumber,
      discNumber: track.discNumber,
      durationMs: track.durationMs,
      isExplicit: track.isExplicit,
      isrc: track.isrc,
      language: track.language,
      lyrics: track.lyrics,
      processingStatus: track.processingStatus,
      processingError: track.processingError,
      audioUrl: track.audioUrl,
      credits: track.credits.map((credit) => ({
        id: credit.id,
        personName: credit.personName,
        role: credit.role,
      })),
      featuredArtists: track.artists
        .filter((row) => row.role === 'featured')
        .map((row) => row.artist),
    })),
  }
}

async function ownRelease(actor: Actor, id: string) {
  const artist = await ownedArtist(actor)
  const release = await prisma.album.findFirst({
    where: { id, artistId: artist.id },
    include: releaseInclude,
  })
  if (!release) throw notFound('Release')
  return { artist, release }
}

async function assertGenre(id: string | null | undefined, path: string) {
  if (!id) return
  const genre = await prisma.genre.findFirst({ where: { id, isActive: true }, select: { id: true } })
  if (!genre) throw badRequest('Choose a genre from the list', [{ path, message: 'Unknown genre' }])
}

export interface ReleaseInput {
  title?: string
  type?: 'single' | 'ep' | 'album' | 'compilation'
  description?: string
  bgColor?: string
  releaseDate?: string
  label?: string
  copyrightC?: string
  copyrightP?: string
  upc?: string | null
  primaryGenreId?: string | null
  secondaryGenreId?: string | null
  isCatalog?: boolean
  confirmDuplicate?: boolean
}

function dateOrNull(value?: string) {
  if (!value) return undefined
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) throw badRequest('Release date is invalid', [{ path: 'releaseDate', message: 'Use YYYY-MM-DD' }])
  return date
}

async function assertTitle(artistId: string, title: string, exceptId?: string, confirm?: boolean) {
  const existing = await prisma.album.findFirst({
    where: {
      artistId,
      title: { equals: title, mode: 'insensitive' },
      status: { not: 'taken_down' },
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: { id: true, title: true },
  })
  if (existing && !confirm) {
    throw new AppError(
      409,
      ErrorCode.CONFLICT,
      `You already have a release named "${existing.title}". Confirm to create another.`,
      { duplicateOf: existing.id },
    )
  }
}

export const releasesService = {
  async list(actor: Actor, page: PageRequest, filters: { status?: string; q?: string }) {
    const artist = await ownedArtist(actor)
    const rows = await prisma.album.findMany({
      where: {
        artistId: artist.id,
        ...(filters.status ? { status: filters.status as 'draft' } : {}),
        ...(filters.q ? { title: { contains: filters.q, mode: 'insensitive' } } : {}),
      },
      include: releaseInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: page.limit + 1,
      ...startAfter(afterIdFrom(page)),
    })
    const paged = toIdPage(rows, page.limit)
    return { ...paged, items: paged.items.map(present) }
  },

  async get(actor: Actor, id: string) {
    const { release } = await ownRelease(actor, id)
    return present(release)
  },

  async create(actor: Actor, input: ReleaseInput) {
    const artist = await ownedArtist(actor)
    assertWritable(artist)
    if (!input.title) throw badRequest('A title is required', [{ path: 'title', message: 'Required' }])
    await assertTitle(artist.id, input.title, undefined, input.confirmDuplicate)
    await assertGenre(input.primaryGenreId, 'primaryGenreId')
    await assertGenre(input.secondaryGenreId, 'secondaryGenreId')
    const releasedAt = dateOrNull(input.releaseDate)
    if (releasedAt && releasedAt < todayUtc() && !input.isCatalog) {
      throw badRequest('Past release dates are only allowed when you mark this as a catalog release', [
        { path: 'releaseDate', message: 'Date is in the past' },
      ])
    }
    const release = await prisma.album.create({
      data: {
        artistId: artist.id,
        title: input.title,
        type: input.type ?? 'album',
        description: input.description ?? '',
        bgColor: input.bgColor ?? '#121212',
        coverUrl: '',
        releasedAt,
        label: input.label ?? artist.name,
        copyrightC: input.copyrightC ?? '',
        copyrightP: input.copyrightP ?? '',
        upc: input.upc ?? null,
        primaryGenreId: input.primaryGenreId ?? null,
        secondaryGenreId: input.secondaryGenreId ?? null,
        isCatalog: input.isCatalog ?? false,
        status: 'draft',
      },
      include: releaseInclude,
    })
    return present(release)
  },

  async update(actor: Actor, id: string, input: ReleaseInput) {
    const { artist, release } = await ownRelease(actor, id)
    assertWritable(artist)
    if (release.status === 'taken_down') throw badRequest('Restore this release before editing it')
    if (input.title) await assertTitle(artist.id, input.title, id, input.confirmDuplicate)
    await assertGenre(input.primaryGenreId, 'primaryGenreId')
    await assertGenre(input.secondaryGenreId, 'secondaryGenreId')
    const releasedAt = input.releaseDate === undefined ? undefined : dateOrNull(input.releaseDate)
    if (releasedAt && releasedAt < todayUtc() && !(input.isCatalog ?? release.isCatalog)) {
      throw badRequest('Past release dates are only allowed when you mark this as a catalog release', [
        { path: 'releaseDate', message: 'Date is in the past' },
      ])
    }
    const descriptiveOnly = release.status === 'published' || release.status === 'scheduled'
    const updated = await prisma.album.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        bgColor: input.bgColor,
        label: input.label,
        copyrightC: input.copyrightC,
        copyrightP: input.copyrightP,
        upc: input.upc,
        primaryGenreId: input.primaryGenreId,
        secondaryGenreId: input.secondaryGenreId,
        isCatalog: input.isCatalog,
        releasedAt,
        type: descriptiveOnly ? undefined : input.type,
      },
      include: releaseInclude,
    })
    return present(updated)
  },

  async remove(actor: Actor, id: string) {
    const { artist, release } = await ownRelease(actor, id)
    assertWritable(artist)
    if (release.status !== 'draft' && release.status !== 'rejected') {
      throw new AppError(409, ErrorCode.CONFLICT, 'Published releases cannot be deleted. Take the release down instead.')
    }
    await destroyMedia(release.coverPublicId, 'image')
    for (const track of release.tracks) {
      const stored = await prisma.track.findUnique({
        where: { id: track.id },
        select: { audioPublicId: true },
      })
      if (stored?.audioPublicId) await destroyMedia(stored.audioPublicId, 'audio')
    }
    await prisma.track.deleteMany({ where: { albumId: id } })
    await prisma.album.delete({ where: { id } })
  },

  async setCover(actor: Actor, id: string, file: TempFile) {
    const { artist, release } = await ownRelease(actor, id)
    assertWritable(artist)
    await inspectImage(file.path, {
      minEdge: 1400,
      square: true,
      label: 'Cover art',
      maxBytes: MAX_COVER_BYTES,
      size: file.size,
    })
    const uploaded = await uploadMedia(file.path, 'image')
    if (release.coverPublicId) await destroyMedia(release.coverPublicId, 'image')
    const backToReview = release.status === 'published' || release.status === 'scheduled'
    const updated = await prisma.album.update({
      where: { id },
      data: {
        coverUrl: uploaded.url,
        coverPublicId: uploaded.publicId,
        ...(backToReview
          ? { status: 'in_review', rejectionReason: null, rejectionHint: null }
          : {}),
      },
      include: releaseInclude,
    })
    await prisma.track.updateMany({
      where: { albumId: id, OR: [{ imageUrl: '' }, { imageUrl: release.coverUrl }] },
      data: { imageUrl: uploaded.url },
    })
    if (backToReview) {
      await notifyAdmins({ type: 'release.pending_review', message: `${artist.name} changed the cover of "${release.title}"` })
    }
    return present(updated)
  },

  async addTrack(
    actor: Actor,
    releaseId: string,
    file: TempFile,
    input: {
      title: string
      explicit: boolean
      language?: string
      lyrics?: string
      isrc?: string | null
      credits?: { personName: string; role: 'songwriter' | 'composer' | 'producer' | 'other' }[]
      featuredArtistIds?: string[]
    },
  ) {
    const { artist, release } = await ownRelease(actor, releaseId)
    assertWritable(artist)
    if (release.status !== 'draft' && release.status !== 'rejected') {
      throw badRequest('Audio can only be added while the release is a draft')
    }
    if (file.size > MAX_AUDIO_BYTES) {
      throw new AppError(413, ErrorCode.PAYLOAD_TOO_LARGE, 'Audio must be at most 200 MB')
    }
    const inspected = await inspectAudio(file.path)
    if (input.featuredArtistIds?.length) {
      const found = await prisma.artist.count({
        where: { id: { in: input.featuredArtistIds }, status: 'approved' },
      })
      if (found !== input.featuredArtistIds.length) throw badRequest('Featured artists must be approved profiles on this platform')
    }
    const last = await prisma.track.aggregate({ where: { albumId: releaseId }, _max: { trackNumber: true } })
    const track = await prisma.track.create({
      data: {
        albumId: releaseId,
        artistId: artist.id,
        title: input.title,
        trackNumber: (last._max.trackNumber ?? 0) + 1,
        durationMs: inspected.durationMs,
        audioUrl: '',
        imageUrl: release.coverUrl,
        isExplicit: input.explicit,
        language: input.language ?? '',
        lyrics: input.lyrics ?? '',
        isrc: input.isrc ?? null,
        processingStatus: 'processing',
        credits: input.credits?.length ? { create: input.credits } : undefined,
        artists: input.featuredArtistIds?.length
          ? { create: input.featuredArtistIds.map((artistId) => ({ artistId, role: 'featured' as const })) }
          : undefined,
      },
      select: { id: true },
    })

    const path = `${file.path}.processing`
    await copyFile(file.path, path)
    await rm(file.path, { force: true })
    setImmediate(() => {
      void finishAudio(track.id, path, actor.id)
    })
    return releasesService.get(actor, releaseId)
  },

  async updateTrack(
    actor: Actor,
    releaseId: string,
    trackId: string,
    input: {
      title?: string
      explicit?: boolean
      language?: string
      lyrics?: string
      isrc?: string | null
      credits?: { personName: string; role: 'songwriter' | 'composer' | 'producer' | 'other' }[]
      featuredArtistIds?: string[]
    },
  ) {
    const { artist, release } = await ownRelease(actor, releaseId)
    assertWritable(artist)
    const track = release.tracks.find((item) => item.id === trackId)
    if (!track) throw notFound('Track')
    await prisma.$transaction(async (tx) => {
      await tx.track.update({
        where: { id: trackId },
        data: {
          title: input.title,
          isExplicit: input.explicit,
          language: input.language,
          lyrics: input.lyrics,
          isrc: input.isrc,
        },
      })
      if (input.credits) {
        await tx.trackCredit.deleteMany({ where: { trackId } })
        if (input.credits.length) await tx.trackCredit.createMany({ data: input.credits.map((credit) => ({ ...credit, trackId })) })
      }
      if (input.featuredArtistIds) {
        await tx.trackArtist.deleteMany({ where: { trackId } })
        if (input.featuredArtistIds.length) {
          await tx.trackArtist.createMany({
            data: input.featuredArtistIds.map((artistId) => ({ trackId, artistId, role: 'featured' as const })),
          })
        }
      }
    })
    return releasesService.get(actor, releaseId)
  },

  async removeTrack(actor: Actor, releaseId: string, trackId: string) {
    const { artist, release } = await ownRelease(actor, releaseId)
    assertWritable(artist)
    if (release.status !== 'draft' && release.status !== 'rejected') {
      throw badRequest('Tracks can only be removed from a draft')
    }
    const track = await prisma.track.findFirst({
      where: { id: trackId, albumId: releaseId },
      select: { id: true, audioPublicId: true },
    })
    if (!track) throw notFound('Track')
    await destroyMedia(track.audioPublicId, 'audio')
    await prisma.track.delete({ where: { id: track.id } })
    const rest = await prisma.track.findMany({
      where: { albumId: releaseId },
      orderBy: { trackNumber: 'asc' },
      select: { id: true },
    })
    await prisma.$transaction(
      rest.map((row, index) =>
        prisma.track.update({ where: { id: row.id }, data: { trackNumber: index + 1 } }),
      ),
    )
    return releasesService.get(actor, releaseId)
  },

  async reorder(actor: Actor, releaseId: string, ids: string[]) {
    const { artist, release } = await ownRelease(actor, releaseId)
    assertWritable(artist)
    const current = new Set(release.tracks.map((track) => track.id))
    if (ids.length !== current.size || ids.some((id) => !current.has(id))) {
      throw badRequest('The track order must include every track on this release exactly once')
    }
    await prisma.$transaction(
      ids.map((id, index) => prisma.track.update({ where: { id }, data: { trackNumber: index + 1 + ids.length } })),
    )
    await prisma.$transaction(
      ids.map((id, index) => prisma.track.update({ where: { id }, data: { trackNumber: index + 1 } })),
    )
    return releasesService.get(actor, releaseId)
  },

  async submit(actor: Actor, id: string, rights: boolean) {
    const { artist, release } = await ownRelease(actor, id)
    assertWritable(artist)
    if (artist.status !== 'approved') {
      throw new AppError(403, ErrorCode.FORBIDDEN, 'Your profile has to be approved before you can submit a release')
    }
    if (!rights) throw badRequest('Confirm that you own or control the rights to this content', [{ path: 'rights', message: 'Required' }])
    const problems: { path: string; message: string }[] = []
    if (!release.coverUrl) problems.push({ path: 'cover', message: 'Add square cover art' })
    if (!release.releasedAt) problems.push({ path: 'releaseDate', message: 'Choose a release date' })
    if (!release.primaryGenreId) problems.push({ path: 'primaryGenreId', message: 'Choose a primary genre' })
    if (release.copyrightC.trim().length < 3) problems.push({ path: 'copyrightC', message: 'Add the composition copyright' })
    if (release.copyrightP.trim().length < 3) problems.push({ path: 'copyrightP', message: 'Add the recording copyright' })
    if (release.tracks.length === 0) problems.push({ path: 'tracks', message: 'Add at least one track' })
    if (release.tracks.some((track) => track.processingStatus !== 'ready')) {
      problems.push({ path: 'tracks', message: 'Wait until every track is Ready' })
    }
    if (problems.length) {
      throw new AppError(400, ErrorCode.RELEASE_NOT_READY, 'This release is not ready to submit', problems)
    }
    const updated = await prisma.album.update({
      where: { id },
      data: { status: 'in_review', rightsConfirmedAt: new Date(), rejectionReason: null, rejectionHint: null },
      include: releaseInclude,
    })
    await notifyAdmins({ type: 'release.pending_review', message: `${artist.name} submitted "${release.title}" for review` })
    return present(updated)
  },

  async unpublish(actor: Actor, id: string) {
    const { artist, release } = await ownRelease(actor, id)
    assertWritable(artist)
    if (release.status !== 'published' && release.status !== 'scheduled') {
      throw badRequest('Only a published or scheduled release can be taken down')
    }
    const updated = await prisma.album.update({
      where: { id },
      data: { status: 'taken_down' },
      include: releaseInclude,
    })
    await recordAudit({
      actorId: actor.id,
      action: 'release.takedown',
      subjectType: 'release',
      subjectId: id,
      details: { by: 'artist' },
    })
    return present(updated)
  },
}

async function finishAudio(trackId: string, path: string, actorId: string) {
  try {
    const uploaded = await uploadMedia(path, 'audio')
    const track = await prisma.track.update({
      where: { id: trackId },
      data: {
        audioUrl: uploaded.url,
        audioPublicId: uploaded.publicId,
        durationMs: uploaded.durationMs ?? undefined,
        processingStatus: 'ready',
        processingError: '',
      },
      select: { title: true },
    })
    await notify({
      userId: actorId,
      type: 'track.ready',
      message: `"${track.title}" finished processing and is ready`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Processing failed'
    const track = await prisma.track.update({
      where: { id: trackId },
      data: { processingStatus: 'failed', processingError: message },
      select: { title: true },
    }).catch(() => null)
    await notify({
      userId: actorId,
      type: 'track.failed',
      message: `"${track?.title ?? 'A track'}" could not be processed`,
      reason: message,
      hint: 'Check the file format and try the upload again.',
    })
  } finally {
    await rm(path, { force: true })
  }
}
