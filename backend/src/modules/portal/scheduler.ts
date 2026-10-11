import { prisma } from '../../shared/db.js'
import { todayUtc } from '../../shared/visibility.js'
import { notify } from './notify.js'

/** Promotes scheduled releases whose date has arrived. Safe to run often. */
export async function publishDueReleases() {
  const due = await prisma.album.findMany({
    where: {
      status: 'scheduled',
      releasedAt: { lte: todayUtc() },
      artist: { status: 'approved' },
    },
    select: {
      id: true,
      title: true,
      artist: { select: { ownerUserId: true, name: true } },
    },
  })
  for (const release of due) {
    await prisma.album.update({
      where: { id: release.id },
      data: { status: 'published', publishedAt: new Date() },
    })
    if (release.artist.ownerUserId) {
      await notify({
        userId: release.artist.ownerUserId,
        type: 'release.published',
        message: `"${release.title}" is now public`,
        email: undefined,
      })
    }
  }
  return due.length
}
