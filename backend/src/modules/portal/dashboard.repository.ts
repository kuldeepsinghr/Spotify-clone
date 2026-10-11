import { prisma } from '../../shared/db.js'
import { REJECTION_REASONS } from './constants.js'
import type { Actor } from '../../shared/actor.js'
import { completeness, ownedArtist, toProfile } from './profile.repository.js'
import { notificationsRepository } from './notify.js'

export async function referenceData() {
  const [genres, countries] = await Promise.all([
    prisma.genre.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    }),
    prisma.country.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { code: true, name: true },
    }),
  ])
  return { genres, countries, rejectionReasons: REJECTION_REASONS }
}

export async function dashboard(actor: Actor) {
  const artist = await ownedArtist(actor)
  const [releases, notifications] = await Promise.all([
    prisma.album.findMany({
      where: { artistId: artist.id },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { id: true, title: true, status: true, type: true, coverUrl: true, updatedAt: true },
    }),
    notificationsRepository.list(actor.id, 5),
  ])
  const score = completeness(artist)
  const todos = [...score.missing]
  if ((await prisma.album.count({ where: { artistId: artist.id } })) === 0) {
    todos.push({ id: 'release', label: 'Upload your first release' })
  }
  if (artist.status === 'draft' || artist.status === 'rejected') {
    todos.push({ id: 'submit-profile', label: 'Submit your profile for review' })
  }
  return {
    profile: toProfile(artist, true),
    todos,
    releases,
    notifications,
    unread: await notificationsRepository.unreadCount(actor.id),
  }
}

export async function statistics(actor: Actor, days: number) {
  const artist = await ownedArtist(actor)
  const since = new Date(Date.now() - days * 86_400_000)
  const tracks = await prisma.track.findMany({
    where: { artistId: artist.id },
    select: { id: true, title: true, album: { select: { id: true, title: true } } },
  })
  const ids = tracks.map((track) => track.id)
  if (ids.length === 0) {
    return { days, series: [], tracks: [], releases: [] }
  }
  const [plays, likes, playlistAdds, series] = await Promise.all([
    prisma.playHistory.groupBy({
      by: ['trackId'],
      where: { trackId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.likedTrack.groupBy({
      by: ['trackId'],
      where: { trackId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.playlistTrack.groupBy({
      by: ['trackId'],
      where: { trackId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.$queryRaw<{ day: Date; plays: number }[]>`
      SELECT date_trunc('day', p.played_at) AS day, count(*)::int AS plays
      FROM play_history p
      WHERE p.track_id = ANY(${ids}::uuid[]) AND p.played_at >= ${since}
      GROUP BY 1
      ORDER BY 1`,
  ])
  const playCount = new Map(plays.map((row) => [row.trackId, row._count._all]))
  const likeCount = new Map(likes.map((row) => [row.trackId, row._count._all]))
  const addCount = new Map(playlistAdds.map((row) => [row.trackId, row._count._all]))
  const perTrack = tracks
    .map((track) => ({
      id: track.id,
      title: track.title,
      releaseId: track.album.id,
      releaseTitle: track.album.title,
      plays: playCount.get(track.id) ?? 0,
      likes: likeCount.get(track.id) ?? 0,
      playlistAdds: addCount.get(track.id) ?? 0,
    }))
    .sort((a, b) => b.plays - a.plays)
  const byRelease = new Map<string, { id: string; title: string; plays: number }>()
  for (const track of perTrack) {
    const current = byRelease.get(track.releaseId) ?? { id: track.releaseId, title: track.releaseTitle, plays: 0 }
    current.plays += track.plays
    byRelease.set(track.releaseId, current)
  }
  return {
    days,
    series: series.map((row) => ({ day: row.day, plays: row.plays })),
    tracks: perTrack,
    releases: [...byRelease.values()].sort((a, b) => b.plays - a.plays),
  }
}
