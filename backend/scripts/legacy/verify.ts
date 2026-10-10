import type { PrismaClient } from '@prisma/client'
import type { MigrationPlan } from './transform.js'

export interface CheckResult {
  name: string
  passed: boolean
  detail: string
}

const SAMPLE_SIZE = 10

function sample<T>(items: T[], size: number): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy.slice(0, size)
}

/** Compares what PostgreSQL holds against what the plan said it should hold. */
export async function verifyPlan(prisma: PrismaClient, plan: MigrationPlan): Promise<CheckResult[]> {
  const albumIds = plan.albums.map((a) => a.legacyMongoId)
  const trackIds = plan.tracks.map((t) => t.legacyMongoId)
  const results: CheckResult[] = []

  const albumCount = await prisma.album.count({ where: { legacyMongoId: { in: albumIds } } })
  results.push({
    name: 'album count',
    passed: albumCount === plan.albums.length,
    detail: `expected ${plan.albums.length}, found ${albumCount} (source had ${plan.counts.albumsIn})`,
  })

  const trackCount = await prisma.track.count({ where: { legacyMongoId: { in: trackIds } } })
  results.push({
    name: 'track count',
    passed: trackCount === plan.tracks.length,
    detail: `expected ${plan.tracks.length}, found ${trackCount} (source had ${plan.counts.songsIn} songs)`,
  })

  const tracks = await prisma.track.findMany({
    where: { legacyMongoId: { in: trackIds } },
    select: {
      legacyMongoId: true,
      artistId: true,
      title: true,
      audioUrl: true,
      durationMs: true,
      album: { select: { legacyMongoId: true, artistId: true } },
    },
  })

  const mismatchedArtist = tracks.filter((t) => t.artistId !== t.album.artistId)
  results.push({
    name: 'track artist matches album artist',
    passed: mismatchedArtist.length === 0,
    detail: mismatchedArtist.length === 0 ? 'all match' : `mismatched: ${mismatchedArtist.map((t) => t.legacyMongoId).join(', ')}`,
  })

  const expected = new Map(plan.tracks.map((t) => [t.legacyMongoId, t]))
  const wrong = sample(tracks, SAMPLE_SIZE).filter((row) => {
    const planned = expected.get(row.legacyMongoId!)!
    return (
      row.title !== planned.title ||
      row.audioUrl !== planned.audioUrl ||
      row.durationMs !== planned.durationMs ||
      row.album.legacyMongoId !== planned.albumLegacyId
    )
  })
  results.push({
    name: `spot check of ${Math.min(SAMPLE_SIZE, tracks.length)} random tracks`,
    passed: wrong.length === 0,
    detail: wrong.length === 0 ? 'fields match the source' : `differ: ${wrong.map((t) => t.legacyMongoId).join(', ')}`,
  })

  return results
}
