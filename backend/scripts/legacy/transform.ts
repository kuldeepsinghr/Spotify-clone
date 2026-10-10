import { parseLegacyDuration } from '../../src/shared/duration.js'
import type { LegacyAlbum, LegacySong } from './types.js'

export const PLACEHOLDER_ARTIST_NAME = 'Unknown Artist'
export const SINGLES_ALBUM_TITLE = 'Singles'
/** Stands in for a Mongo ID so re-runs update the same Singles album instead of adding another. */
export const SINGLES_LEGACY_ID = 'migration:singles'

export interface PlannedAlbum {
  legacyMongoId: string
  title: string
  description: string
  bgColor: string
  coverUrl: string
  createdAt: Date
}

export interface PlannedTrack {
  legacyMongoId: string
  albumLegacyId: string
  title: string
  description: string
  trackNumber: number
  durationMs: number
  audioUrl: string
  imageUrl: string
  createdAt: Date
}

export type IssueKind =
  | 'invalid_album'
  | 'duplicate_album_name'
  | 'invalid_song'
  | 'orphan_song'
  | 'ambiguous_album'
  | 'bad_duration'

export interface Issue {
  kind: IssueKind
  /** Skipped records block a real run; warnings do not. */
  severity: 'skipped' | 'warning'
  legacyId: string
  detail: string
}

export interface MigrationPlan {
  albums: PlannedAlbum[]
  tracks: PlannedTrack[]
  issues: Issue[]
  counts: { albumsIn: number; songsIn: number; albumsOut: number; tracksOut: number }
}

export interface PlanOptions {
  /** Put songs whose album name matches nothing into a placeholder "Singles" album. */
  orphansToSingles?: boolean
  now?: Date
}

const OBJECT_ID = /^[0-9a-f]{24}$/i

/** A Mongo ObjectId starts with its creation time in seconds; this keeps the original ordering. */
export function objectIdTimestamp(id: string, fallback: Date): Date {
  if (!OBJECT_ID.test(id)) return fallback
  return new Date(parseInt(id.slice(0, 8), 16) * 1000)
}

const isBlank = (value: unknown) => typeof value !== 'string' || value.trim() === ''

export function planMigration(
  legacyAlbums: LegacyAlbum[],
  legacySongs: LegacySong[],
  options: PlanOptions = {},
): MigrationPlan {
  const now = options.now ?? new Date()
  const issues: Issue[] = []
  const albums: PlannedAlbum[] = []
  const albumsByName = new Map<string, PlannedAlbum[]>()

  for (const album of legacyAlbums) {
    const missing = (['name', 'image'] as const).filter((field) => isBlank(album[field]))
    if (missing.length > 0) {
      issues.push({
        kind: 'invalid_album',
        severity: 'skipped',
        legacyId: String(album._id),
        detail: `missing ${missing.join(', ')}`,
      })
      continue
    }
    const planned: PlannedAlbum = {
      legacyMongoId: album._id,
      title: album.name.trim(),
      description: album.desc?.trim() ?? '',
      bgColor: isBlank(album.bgColor) ? '#121212' : album.bgColor.trim(),
      coverUrl: album.image,
      createdAt: objectIdTimestamp(album._id, now),
    }
    albums.push(planned)
    const sameName = albumsByName.get(planned.title) ?? []
    sameName.push(planned)
    albumsByName.set(planned.title, sameName)
  }

  for (const [name, matches] of albumsByName) {
    if (matches.length > 1) {
      for (const album of matches) {
        issues.push({
          kind: 'duplicate_album_name',
          severity: 'warning',
          legacyId: album.legacyMongoId,
          detail: `${matches.length} albums are named "${name}"; songs that reference this name are skipped`,
        })
      }
    }
  }

  let singles: PlannedAlbum | undefined
  const unnumbered: Omit<PlannedTrack, 'trackNumber'>[] = []

  for (const song of legacySongs) {
    const legacyId = String(song._id)
    const missing = (['name', 'file', 'image'] as const).filter((field) => isBlank(song[field]))
    if (missing.length > 0) {
      issues.push({ kind: 'invalid_song', severity: 'skipped', legacyId, detail: `missing ${missing.join(', ')}` })
      continue
    }

    const durationMs = parseLegacyDuration(String(song.duration ?? ''))
    if (durationMs === null) {
      issues.push({
        kind: 'bad_duration',
        severity: 'skipped',
        legacyId,
        detail: `duration "${song.duration}" is not m:s`,
      })
      continue
    }

    const matches = albumsByName.get(song.album?.trim() ?? '') ?? []
    let album: PlannedAlbum | undefined
    if (matches.length === 1) {
      album = matches[0]
    } else if (matches.length > 1) {
      issues.push({
        kind: 'ambiguous_album',
        severity: 'skipped',
        legacyId,
        detail: `album "${song.album}" matches ${matches.length} albums`,
      })
      continue
    } else if (options.orphansToSingles) {
      singles ??= {
        legacyMongoId: SINGLES_LEGACY_ID,
        title: SINGLES_ALBUM_TITLE,
        description: 'Songs whose album could not be matched during the MongoDB migration',
        bgColor: '#121212',
        coverUrl: song.image,
        createdAt: now,
      }
      album = singles
      issues.push({
        kind: 'orphan_song',
        severity: 'warning',
        legacyId,
        detail: `album "${song.album}" matches nothing; moved to ${SINGLES_ALBUM_TITLE}`,
      })
    } else {
      issues.push({
        kind: 'orphan_song',
        severity: 'skipped',
        legacyId,
        detail: `album "${song.album}" matches nothing`,
      })
      continue
    }

    unnumbered.push({
      legacyMongoId: legacyId,
      albumLegacyId: album!.legacyMongoId,
      title: song.name.trim(),
      description: song.desc?.trim() ?? '',
      durationMs,
      audioUrl: song.file,
      imageUrl: song.image,
      createdAt: objectIdTimestamp(legacyId, now),
    })
  }

  if (singles) albums.push(singles)

  // Number tracks inside each album in the order they were originally added.
  unnumbered.sort(
    (a, b) =>
      a.createdAt.getTime() - b.createdAt.getTime() || a.legacyMongoId.localeCompare(b.legacyMongoId),
  )
  const nextNumber = new Map<string, number>()
  const tracks = unnumbered.map((track) => {
    const trackNumber = (nextNumber.get(track.albumLegacyId) ?? 0) + 1
    nextNumber.set(track.albumLegacyId, trackNumber)
    return { ...track, trackNumber }
  })

  return {
    albums,
    tracks,
    issues,
    counts: {
      albumsIn: legacyAlbums.length,
      songsIn: legacySongs.length,
      albumsOut: albums.length,
      tracksOut: tracks.length,
    },
  }
}

export const hasBlockingIssues = (plan: MigrationPlan) =>
  plan.issues.some((issue) => issue.severity === 'skipped')
