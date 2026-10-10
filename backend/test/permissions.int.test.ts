import request, { type Test } from 'supertest'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '../src/shared/db.js'
import {
  createAlbum,
  createArtist,
  createTrack,
  resetDatabase,
  signedIn,
  signedInArtist,
} from './fixtures.js'

vi.mock('../src/config/cloudinary.js', () => ({
  uploadMedia: vi.fn(async (_path: string, kind: 'image' | 'audio') =>
    kind === 'audio'
      ? { url: 'https://res.cloudinary.com/demo/video/upload/v1/new.mp3', durationMs: 200_000 }
      : { url: 'https://cdn.test/cover.jpg' },
  ),
}))

const { createApp } = await import('../src/app.js')
const app = createApp()

const png = Buffer.from('89504e470d0a1a0a', 'hex')
const mp3 = Buffer.from('494433', 'hex')

type Caller = 'guest' | 'user' | 'owner' | 'otherArtist' | 'admin'
const CALLERS: Caller[] = ['guest', 'user', 'owner', 'otherArtist', 'admin']

/** Fresh catalog for every test: the owner's artist has an album with one track and an empty album. */
async function buildWorld() {
  const owner = await signedInArtist()
  const otherArtist = await signedInArtist()
  const user = await signedIn('user')
  const admin = await signedIn('admin')
  const album = await createAlbum(owner.artist.id, 'Owned album')
  const emptyAlbum = await createAlbum(owner.artist.id, 'Empty album')
  const track = await createTrack(album, 1, 'Owned track')
  const unownedArtist = await createArtist('Nobody owns me')
  return {
    owner,
    otherArtist,
    user,
    admin,
    album,
    emptyAlbum,
    track,
    unownedArtist,
    auth: {
      guest: undefined,
      user: user.auth,
      owner: owner.auth,
      otherArtist: otherArtist.auth,
      admin: admin.auth,
    } satisfies Record<Caller, string | undefined>,
  }
}

type World = Awaited<ReturnType<typeof buildWorld>>
let world: World

beforeEach(async () => {
  await resetDatabase()
  world = await buildWorld()
})
afterAll(() => prisma.$disconnect())

interface MatrixRow {
  name: string
  send: (w: World) => Test
  expect: Record<Caller, number>
}

const matrix: MatrixRow[] = [
  {
    name: 'GET /v1/albums (public read)',
    send: () => request(app).get('/v1/albums'),
    expect: { guest: 200, user: 200, owner: 200, otherArtist: 200, admin: 200 },
  },
  {
    name: 'GET /v1/me',
    send: () => request(app).get('/v1/me'),
    expect: { guest: 401, user: 200, owner: 200, otherArtist: 200, admin: 200 },
  },
  {
    name: 'POST /v1/albums for the owner’s artist',
    send: (w) =>
      request(app)
        .post('/v1/albums')
        .field('title', 'New release')
        .field('artistId', w.owner.artist.id)
        .attach('cover', png, { filename: 'c.png', contentType: 'image/png' }),
    expect: { guest: 401, user: 403, owner: 201, otherArtist: 403, admin: 201 },
  },
  {
    name: 'PATCH /v1/albums/:id',
    send: (w) => request(app).patch(`/v1/albums/${w.album.id}`).send({ title: 'Renamed' }),
    expect: { guest: 401, user: 403, owner: 200, otherArtist: 403, admin: 200 },
  },
  {
    name: 'DELETE /v1/albums/:id (empty album)',
    send: (w) => request(app).delete(`/v1/albums/${w.emptyAlbum.id}`),
    expect: { guest: 401, user: 403, owner: 204, otherArtist: 403, admin: 204 },
  },
  {
    name: 'POST /v1/albums/:id/tracks',
    send: (w) =>
      request(app)
        .post(`/v1/albums/${w.album.id}/tracks`)
        .field('title', 'Second track')
        .attach('audio', mp3, { filename: 's.mp3', contentType: 'audio/mpeg' }),
    expect: { guest: 401, user: 403, owner: 201, otherArtist: 403, admin: 201 },
  },
  {
    name: 'PATCH /v1/tracks/:id',
    send: (w) => request(app).patch(`/v1/tracks/${w.track.id}`).send({ title: 'Remix' }),
    expect: { guest: 401, user: 403, owner: 200, otherArtist: 403, admin: 200 },
  },
  {
    name: 'DELETE /v1/tracks/:id',
    send: (w) => request(app).delete(`/v1/tracks/${w.track.id}`),
    expect: { guest: 401, user: 403, owner: 204, otherArtist: 403, admin: 204 },
  },
  {
    name: 'POST /v1/artists',
    send: () => request(app).post('/v1/artists').send({ name: 'Fresh face' }),
    expect: { guest: 401, user: 403, owner: 403, otherArtist: 403, admin: 201 },
  },
  {
    name: 'PATCH /v1/artists/:id',
    send: (w) => request(app).patch(`/v1/artists/${w.owner.artist.id}`).send({ bio: 'Updated' }),
    expect: { guest: 401, user: 403, owner: 200, otherArtist: 403, admin: 200 },
  },
  {
    name: 'DELETE /v1/artists/:id (no albums)',
    send: (w) => request(app).delete(`/v1/artists/${w.unownedArtist.id}`),
    expect: { guest: 401, user: 403, owner: 403, otherArtist: 403, admin: 204 },
  },
  {
    name: 'GET /v1/admin/users',
    send: () => request(app).get('/v1/admin/users'),
    expect: { guest: 401, user: 403, owner: 403, otherArtist: 403, admin: 200 },
  },
  {
    name: 'PATCH /v1/admin/users/:id/role',
    send: (w) =>
      request(app).patch(`/v1/admin/users/${w.user.user.id}/role`).send({ role: 'artist' }),
    expect: { guest: 401, user: 403, owner: 403, otherArtist: 403, admin: 200 },
  },
  {
    name: 'PATCH /v1/admin/users/:id/status',
    send: (w) =>
      request(app).patch(`/v1/admin/users/${w.user.user.id}/status`).send({ disabled: true }),
    expect: { guest: 401, user: 403, owner: 403, otherArtist: 403, admin: 200 },
  },
]

describe.each(matrix)('permission matrix: $name', (row) => {
  it.each(CALLERS)('%s', async (caller) => {
    const req = row.send(world)
    const auth = world.auth[caller]
    const res = await (auth ? req.set('authorization', auth) : req)
    expect(res.status, JSON.stringify(res.body)).toBe(row.expect[caller])
    if (res.status === 401) expect(res.body.error.code).toBe('UNAUTHENTICATED')
    if (res.status === 403) expect(res.body.error.code).toBe('FORBIDDEN')
  })
})

describe('ownership', () => {
  it('artists publish under their own profile when no artistId is given', async () => {
    const res = await request(app)
      .post('/v1/albums')
      .set('authorization', world.otherArtist.auth)
      .field('title', 'Mine')
      .attach('cover', png, { filename: 'c.png', contentType: 'image/png' })
      .expect(201)
    expect(res.body.data.artist.id).toBe(world.otherArtist.artist.id)
  })

  it('admins must say which artist an album belongs to', async () => {
    const res = await request(app)
      .post('/v1/albums')
      .set('authorization', world.admin.auth)
      .field('title', 'Whose?')
      .attach('cover', png, { filename: 'c.png', contentType: 'image/png' })
      .expect(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('an artist account without a linked profile cannot publish', async () => {
    const { auth } = await signedIn('artist')
    const res = await request(app)
      .post('/v1/albums')
      .set('authorization', auth)
      .field('title', 'Orphan')
      .attach('cover', png, { filename: 'c.png', contentType: 'image/png' })
      .expect(403)
    expect(res.body.error.code).toBe('ARTIST_PROFILE_REQUIRED')
  })

  it('only admins move albums between artists, and the tracks move too', async () => {
    const target = world.otherArtist.artist.id
    await request(app)
      .patch(`/v1/albums/${world.album.id}`)
      .set('authorization', world.owner.auth)
      .send({ artistId: target })
      .expect(403)

    const res = await request(app)
      .patch(`/v1/albums/${world.album.id}`)
      .set('authorization', world.admin.auth)
      .send({ artistId: target })
      .expect(200)
    expect(res.body.data.artist.id).toBe(target)
    const track = await prisma.track.findUniqueOrThrow({ where: { id: world.track.id } })
    expect(track.artistId).toBe(target)
  })

  it('new tracks use the album cover unless they bring their own image', async () => {
    const res = await request(app)
      .post(`/v1/albums/${world.album.id}/tracks`)
      .set('authorization', world.owner.auth)
      .field('title', 'Track two')
      .attach('audio', mp3, { filename: 's.mp3', contentType: 'audio/mpeg' })
      .expect(201)
    expect(res.body.data).toMatchObject({
      trackNumber: 2,
      durationMs: 200_000,
      imageUrl: world.album.coverUrl,
      artist: { id: world.owner.artist.id },
    })
  })

  it('artists with albums cannot be deleted', async () => {
    const res = await request(app)
      .delete(`/v1/artists/${world.owner.artist.id}`)
      .set('authorization', world.admin.auth)
      .expect(409)
    expect(res.body.error.code).toBe('ARTIST_HAS_ALBUMS')
  })

  it('role changes apply on the very next request', async () => {
    await request(app)
      .post('/v1/artists')
      .set('authorization', world.user.auth)
      .send({ name: 'X' })
      .expect(403)
    await prisma.user.update({ where: { id: world.user.user.id }, data: { role: 'admin' } })
    await request(app)
      .post('/v1/artists')
      .set('authorization', world.user.auth)
      .send({ name: 'X' })
      .expect(201)
  })
})

describe('guest preview', () => {
  const cloudinaryUrl = 'https://res.cloudinary.com/demo/video/upload/v1/full-song.mp3'
  const previewUrl = 'https://res.cloudinary.com/demo/video/upload/du_30/v1/full-song.mp3'

  beforeEach(async () => {
    await prisma.track.update({ where: { id: world.track.id }, data: { audioUrl: cloudinaryUrl } })
  })

  it('guests get a 30-second preview URL; signed-in listeners get the full track', async () => {
    const guest = await request(app).get(`/v1/tracks/${world.track.id}`).expect(200)
    expect(guest.body.data).toMatchObject({
      audioUrl: previewUrl,
      isPreview: true,
      previewMs: 30_000,
    })

    const listener = await request(app)
      .get(`/v1/tracks/${world.track.id}`)
      .set('authorization', world.user.auth)
      .expect(200)
    expect(listener.body.data).toMatchObject({
      audioUrl: cloudinaryUrl,
      isPreview: false,
      previewMs: null,
    })
  })

  it('applies to every endpoint that returns tracks', async () => {
    const responses = await Promise.all([
      request(app).get('/v1/tracks'),
      request(app).get(`/v1/albums/${world.album.id}/tracks`),
      request(app).get(`/v1/artists/${world.owner.artist.id}/top-tracks`),
    ])
    for (const res of responses) {
      expect(res.status).toBe(200)
      expect(res.body.data[0]).toMatchObject({ audioUrl: previewUrl, isPreview: true })
    }
    const search = await request(app).get('/v1/search?q=owned&type=track').expect(200)
    expect(search.body.data.tracks.items[0]).toMatchObject({
      audioUrl: previewUrl,
      isPreview: true,
    })
  })

  it('hides audio that cannot be trimmed', async () => {
    await prisma.track.update({
      where: { id: world.track.id },
      data: { audioUrl: 'https://elsewhere.test/song.mp3', durationMs: 12_000 },
    })
    const res = await request(app).get(`/v1/tracks/${world.track.id}`).expect(200)
    expect(res.body.data).toMatchObject({ audioUrl: null, isPreview: true, previewMs: null })
  })

  it('caps the preview at the track length', async () => {
    await prisma.track.update({ where: { id: world.track.id }, data: { durationMs: 12_000 } })
    const res = await request(app).get(`/v1/tracks/${world.track.id}`).expect(200)
    expect(res.body.data.previewMs).toBe(12_000)
  })

  it('a bad token is rejected instead of silently falling back to a preview', async () => {
    await request(app)
      .get(`/v1/tracks/${world.track.id}`)
      .set('authorization', 'Bearer not-a-token')
      .expect(401)
  })
})

describe('admin user management', () => {
  const admin = () => world.admin.auth

  it('promoting a listener to artist creates a profile named after them; demoting releases it', async () => {
    const id = world.user.user.id
    const promoted = await request(app)
      .patch(`/v1/admin/users/${id}/role`)
      .set('authorization', admin())
      .send({ role: 'artist' })
      .expect(200)
    expect(promoted.body.data).toMatchObject({
      role: 'artist',
      artist: { name: world.user.user.displayName },
    })

    const demoted = await request(app)
      .patch(`/v1/admin/users/${id}/role`)
      .set('authorization', admin())
      .send({ role: 'user' })
      .expect(200)
    expect(demoted.body.data).toMatchObject({ role: 'user', artist: null })
    expect(await prisma.artist.count({ where: { name: world.user.user.displayName } })).toBe(1)
  })

  it('links an existing unowned profile, but never one owned by someone else', async () => {
    const id = world.user.user.id
    const taken = await request(app)
      .patch(`/v1/admin/users/${id}/role`)
      .set('authorization', admin())
      .send({ role: 'artist', artistId: world.owner.artist.id })
      .expect(409)
    expect(taken.body.error.code).toBe('ARTIST_ALREADY_OWNED')
    expect((await prisma.user.findUniqueOrThrow({ where: { id } })).role).toBe('user')

    const linked = await request(app)
      .patch(`/v1/admin/users/${id}/role`)
      .set('authorization', admin())
      .send({ role: 'artist', artistId: world.unownedArtist.id })
      .expect(200)
    expect(linked.body.data.artist).toEqual({ id: world.unownedArtist.id, name: 'Nobody owns me' })
  })

  it('keeps at least one active admin', async () => {
    const self = world.admin.user.id
    const demote = await request(app)
      .patch(`/v1/admin/users/${self}/role`)
      .set('authorization', admin())
      .send({ role: 'user' })
      .expect(409)
    expect(demote.body.error.code).toBe('LAST_ADMIN')

    await request(app)
      .patch(`/v1/admin/users/${self}/status`)
      .set('authorization', admin())
      .send({ disabled: true })
      .expect(409)
  })

  it('disabling a user revokes their sessions and blocks their access token', async () => {
    const target = world.user.user.id
    await prisma.refreshToken.create({
      data: {
        userId: target,
        tokenHash: 'x'.repeat(64),
        familyId: '00000000-0000-4000-8000-000000000001',
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    })
    await request(app)
      .patch(`/v1/admin/users/${target}/status`)
      .set('authorization', admin())
      .send({ disabled: true })
      .expect(200)
    expect(await prisma.refreshToken.count({ where: { userId: target, revokedAt: null } })).toBe(0)
    await request(app).get('/v1/me').set('authorization', world.user.auth).expect(403)
  })

  it('lists and filters users without exposing password hashes', async () => {
    const res = await request(app)
      .get('/v1/admin/users?role=artist&limit=10')
      .set('authorization', admin())
      .expect(200)
    expect(res.body.data).toHaveLength(2)
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|not-a-real-hash/)
  })
})
