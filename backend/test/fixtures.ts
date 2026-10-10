import type { Role } from '../src/shared/actor.js'
import { prisma } from '../src/shared/db.js'
import { signAccessToken } from '../src/shared/tokens.js'

export async function resetDatabase() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`
  if (tables.length === 0) return
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ')
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`)
}

let counter = 0
const unique = () => ++counter

export async function createArtist(name = `Artist ${unique()}`) {
  return prisma.artist.create({ data: { name } })
}

export async function createAlbum(artistId: string, title = `Album ${unique()}`, createdAt?: Date) {
  return prisma.album.create({
    data: {
      artistId,
      title,
      coverUrl: `https://img.test/${unique()}.jpg`,
      bgColor: '#123456',
      createdAt,
    },
  })
}

export async function createTrack(
  album: { id: string; artistId: string },
  trackNumber: number,
  title = `Track ${unique()}`,
  durationMs = 180_000,
) {
  return prisma.track.create({
    data: {
      albumId: album.id,
      artistId: album.artistId,
      title,
      trackNumber,
      durationMs,
      audioUrl: `https://audio.test/${unique()}.mp3`,
      imageUrl: `https://img.test/${unique()}.jpg`,
    },
  })
}

export async function createUser(role: Role = 'user', options: { isDisabled?: boolean } = {}) {
  const n = unique()
  return prisma.user.create({
    data: {
      email: `user${n}@test.dev`,
      passwordHash: 'not-a-real-hash',
      displayName: `User ${n}`,
      role,
      isDisabled: options.isDisabled ?? false,
    },
  })
}

/** A user with a valid access token, ready for `.set('authorization', ...)`. */
export async function signedIn(role: Role = 'user') {
  const user = await createUser(role)
  return { user, auth: `Bearer ${await signAccessToken(user.id)}` }
}

/** An artist-role user who owns a fresh artist profile. */
export async function signedInArtist() {
  const session = await signedIn('artist')
  const artist = await prisma.artist.create({
    data: { name: `Owned ${unique()}`, ownerUserId: session.user.id },
  })
  return { ...session, artist }
}
