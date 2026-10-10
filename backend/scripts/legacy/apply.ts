import type { PrismaClient } from '@prisma/client'
import { PLACEHOLDER_ARTIST_NAME, type MigrationPlan } from './transform.js'

/**
 * Writes the plan in dependency order (artist, albums, tracks) inside one transaction,
 * so a failure leaves PostgreSQL untouched. Upserts keyed by the legacy Mongo ID make it re-runnable.
 */
export async function applyPlan(prisma: PrismaClient, plan: MigrationPlan) {
  return prisma.$transaction(
    async (tx) => {
      const artist =
        (await tx.artist.findFirst({
          where: { name: PLACEHOLDER_ARTIST_NAME, ownerUserId: null },
        })) ??
        (await tx.artist.create({
          data: {
            name: PLACEHOLDER_ARTIST_NAME,
            bio: 'Placeholder for catalog migrated from MongoDB. Reassign albums to real artists in the admin app.',
          },
        }))

      const albumIds = new Map<string, string>()
      for (const album of plan.albums) {
        const { legacyMongoId, ...fields } = album
        const row = await tx.album.upsert({
          where: { legacyMongoId },
          create: { ...fields, legacyMongoId, artistId: artist.id },
          // Keep artistId on update so reassignments done in the admin app survive a re-run.
          update: fields,
          select: { id: true, artistId: true },
        })
        albumIds.set(legacyMongoId, row.id)
      }

      const albumArtist = new Map(
        (
          await tx.album.findMany({
            where: { id: { in: [...albumIds.values()] } },
            select: { id: true, artistId: true },
          })
        ).map((a) => [a.id, a.artistId]),
      )

      for (const track of plan.tracks) {
        const { legacyMongoId, albumLegacyId, ...fields } = track
        const albumId = albumIds.get(albumLegacyId)!
        const artistId = albumArtist.get(albumId)!
        await tx.track.upsert({
          where: { legacyMongoId },
          create: { ...fields, legacyMongoId, albumId, artistId },
          update: { ...fields, albumId, artistId },
        })
      }

      return { artistId: artist.id, albums: albumIds.size, tracks: plan.tracks.length }
    },
    { timeout: 120_000, maxWait: 10_000 },
  )
}
