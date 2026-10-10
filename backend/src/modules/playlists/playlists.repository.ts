import type { Prisma } from '@prisma/client'
import { prisma } from '../../shared/db.js'
import { startAfter } from '../../shared/pagination.js'

const playlistSelect = {
  id: true,
  name: true,
  description: true,
  coverUrl: true,
  isPublic: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: { id: true, displayName: true } },
  _count: { select: { tracks: true } },
} satisfies Prisma.PlaylistSelect

type PlaylistPayload = Prisma.PlaylistGetPayload<{ select: typeof playlistSelect }>

const toPlaylist = ({ _count, ...row }: PlaylistPayload) => ({ ...row, trackCount: _count.tracks })

export type PlaylistRow = ReturnType<typeof toPlaylist>

export interface PlaylistChanges {
  name?: string
  description?: string
  isPublic?: boolean
  coverUrl?: string
}

export type AddTrackResult =
  { status: 'added'; position: number } | { status: 'exists' } | { status: 'full' }

type Tx = Prisma.TransactionClient

/**
 * Serialises track edits on one playlist and renumbers positions to 0..n-1, closing gaps
 * left when a track is deleted from the catalog (its playlist rows cascade away).
 * Returns the number of tracks.
 */
async function lockAndCompact(tx: Tx, playlistId: string) {
  await tx.$queryRaw`SELECT id FROM playlists WHERE id = ${playlistId}::uuid FOR UPDATE`
  await tx.$executeRaw`
    UPDATE playlist_tracks pt
    SET position = r.pos
    FROM (
      SELECT track_id,
             (row_number() OVER (ORDER BY position, added_at, track_id) - 1)::int AS pos
      FROM playlist_tracks
      WHERE playlist_id = ${playlistId}::uuid
    ) r
    WHERE pt.playlist_id = ${playlistId}::uuid AND pt.track_id = r.track_id AND pt.position <> r.pos`
  return tx.playlistTrack.count({ where: { playlistId } })
}

const touch = (tx: Tx, id: string) =>
  tx.playlist.update({ where: { id }, data: { updatedAt: new Date() }, select: { id: true } })

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export const playlistsRepository = {
  async findById(id: string) {
    const row = await prisma.playlist.findUnique({ where: { id }, select: playlistSelect })
    return row && toPlaylist(row)
  },

  async listByOwner(ownerId: string, { take, afterId }: { take: number; afterId?: string }) {
    const rows = await prisma.playlist.findMany({
      where: { ownerId },
      select: playlistSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      ...startAfter(afterId),
    })
    return rows.map(toPlaylist)
  },

  countByOwner: (ownerId: string) => prisma.playlist.count({ where: { ownerId } }),

  async create(data: { ownerId: string; name: string; description: string; isPublic: boolean }) {
    return toPlaylist(await prisma.playlist.create({ data, select: playlistSelect }))
  },

  async update(id: string, data: PlaylistChanges) {
    return toPlaylist(await prisma.playlist.update({ where: { id }, data, select: playlistSelect }))
  },

  delete: (id: string) => prisma.playlist.delete({ where: { id }, select: { id: true } }),

  async totalDurationMs(playlistId: string) {
    const [row] = await prisma.$queryRaw<{ total: bigint | null }[]>`
      SELECT sum(t.duration_ms) AS total
      FROM playlist_tracks pt
      JOIN tracks t ON t.id = pt.track_id
      WHERE pt.playlist_id = ${playlistId}::uuid`
    return Number(row?.total ?? 0)
  },

  listTracks: (
    playlistId: string,
    { take, afterPosition }: { take: number; afterPosition?: number },
  ) =>
    prisma.playlistTrack.findMany({
      where: {
        playlistId,
        ...(afterPosition !== undefined && { position: { gt: afterPosition } }),
      },
      select: { trackId: true, position: true, addedAt: true },
      orderBy: [{ position: 'asc' }, { addedAt: 'asc' }, { trackId: 'asc' }],
      take,
    }),

  /** Inserts at `position` (default: the end), shifting later tracks down. */
  addTrack: (
    playlistId: string,
    trackId: string,
    { position, maxTracks }: { position?: number; maxTracks: number },
  ) =>
    prisma.$transaction(async (tx): Promise<AddTrackResult> => {
      const count = await lockAndCompact(tx, playlistId)
      const existing = await tx.playlistTrack.findUnique({
        where: { playlistId_trackId: { playlistId, trackId } },
        select: { position: true },
      })
      if (existing) return { status: 'exists' }
      if (count >= maxTracks) return { status: 'full' }

      const at = clamp(position ?? count, 0, count)
      await tx.playlistTrack.updateMany({
        where: { playlistId, position: { gte: at } },
        data: { position: { increment: 1 } },
      })
      await tx.playlistTrack.create({ data: { playlistId, trackId, position: at } })
      await touch(tx, playlistId)
      return { status: 'added', position: at }
    }),

  /** Returns false when the track is not in the playlist. */
  removeTrack: (playlistId: string, trackId: string) =>
    prisma.$transaction(async (tx) => {
      await lockAndCompact(tx, playlistId)
      const existing = await tx.playlistTrack.findUnique({
        where: { playlistId_trackId: { playlistId, trackId } },
        select: { position: true },
      })
      if (!existing) return false
      await tx.playlistTrack.delete({ where: { playlistId_trackId: { playlistId, trackId } } })
      await tx.playlistTrack.updateMany({
        where: { playlistId, position: { gt: existing.position } },
        data: { position: { decrement: 1 } },
      })
      await touch(tx, playlistId)
      return true
    }),

  /** Moves a track to `position` (clamped to the list); returns null when it is not in the playlist. */
  moveTrack: (playlistId: string, trackId: string, position: number) =>
    prisma.$transaction(async (tx) => {
      const count = await lockAndCompact(tx, playlistId)
      const existing = await tx.playlistTrack.findUnique({
        where: { playlistId_trackId: { playlistId, trackId } },
        select: { position: true },
      })
      if (!existing) return null
      const from = existing.position
      const to = clamp(position, 0, count - 1)
      if (to === from) return to

      if (to < from) {
        await tx.playlistTrack.updateMany({
          where: { playlistId, position: { gte: to, lt: from } },
          data: { position: { increment: 1 } },
        })
      } else {
        await tx.playlistTrack.updateMany({
          where: { playlistId, position: { gt: from, lte: to } },
          data: { position: { decrement: 1 } },
        })
      }
      await tx.playlistTrack.update({
        where: { playlistId_trackId: { playlistId, trackId } },
        data: { position: to },
      })
      await touch(tx, playlistId)
      return to
    }),
}
