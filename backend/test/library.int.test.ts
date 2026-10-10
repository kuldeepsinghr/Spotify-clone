import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '../src/shared/db.js'
import { createAlbum, createArtist, createTrack, resetDatabase, signedIn } from './fixtures.js'

vi.mock('../src/config/cloudinary.js', () => ({
  uploadMedia: vi.fn(async () => ({ url: 'https://cdn.test/playlist-cover.jpg' })),
}))

const { createApp } = await import('../src/app.js')
let app: ReturnType<typeof createApp>

const missingId = '00000000-0000-7000-8000-000000000000'
const png = Buffer.from('89504e470d0a1a0a', 'hex')

async function buildWorld() {
  const alice = await signedIn('user')
  const bob = await signedIn('user')
  const admin = await signedIn('admin')
  const artist = await createArtist('Band')
  const album = await createAlbum(artist.id, 'Record')
  const tracks = [
    await createTrack(album, 1, 'One', 200_000),
    await createTrack(album, 2, 'Two', 40_000),
    await createTrack(album, 3, 'Three', 180_000),
    await createTrack(album, 4, 'Four', 120_000),
  ] as const
  return { alice, bob, admin, artist, tracks }
}

let w: Awaited<ReturnType<typeof buildWorld>>

beforeEach(async () => {
  await resetDatabase()
  app = createApp()
  w = await buildWorld()
})
afterAll(() => prisma.$disconnect())

const titles = (items: { track: { title: string } }[]) => items.map((item) => item.track.title)

describe('likes', () => {
  it('liking and unliking are idempotent, and the list is newest first', async () => {
    const [one, two, three] = w.tracks
    for (const track of [one, two, three, one]) {
      await request(app)
        .put(`/v1/me/likes/${track.id}`)
        .set('authorization', w.alice.auth)
        .expect(204)
    }
    // Spread the like times so the order does not depend on how fast the requests ran.
    for (const [index, track] of [one, two, three].entries()) {
      await prisma.likedTrack.update({
        where: { userId_trackId: { userId: w.alice.user.id, trackId: track.id } },
        data: { likedAt: new Date(Date.UTC(2026, 0, 1 + index)) },
      })
    }

    const first = await request(app)
      .get('/v1/me/likes?limit=2')
      .set('authorization', w.alice.auth)
      .expect(200)
    expect(titles(first.body.data)).toEqual(['Three', 'Two'])
    expect(first.body.data[0]).toMatchObject({
      likedAt: '2026-01-03T00:00:00.000Z',
      track: { id: three.id, isPreview: false, audioUrl: three.audioUrl },
    })
    const second = await request(app)
      .get('/v1/me/likes')
      .query({ limit: 2, cursor: first.body.meta.nextCursor })
      .set('authorization', w.alice.auth)
      .expect(200)
    expect(titles(second.body.data)).toEqual(['One'])
    expect(second.body.meta.nextCursor).toBeNull()

    await request(app)
      .delete(`/v1/me/likes/${two.id}`)
      .set('authorization', w.alice.auth)
      .expect(204)
    await request(app)
      .delete(`/v1/me/likes/${two.id}`)
      .set('authorization', w.alice.auth)
      .expect(204)
    const after = await request(app)
      .get('/v1/me/likes')
      .set('authorization', w.alice.auth)
      .expect(200)
    expect(titles(after.body.data)).toEqual(['Three', 'One'])
  })

  it('keeps each listener’s likes separate and answers "which of these do I like?"', async () => {
    const [one, two] = w.tracks
    await request(app).put(`/v1/me/likes/${one.id}`).set('authorization', w.alice.auth).expect(204)

    const mine = await request(app)
      .get('/v1/me/likes/contains')
      .query({ ids: `${one.id},${two.id},${one.id}` })
      .set('authorization', w.alice.auth)
      .expect(200)
    expect(mine.body.data).toEqual({ [one.id]: true, [two.id]: false })

    const bobs = await request(app).get('/v1/me/likes').set('authorization', w.bob.auth).expect(200)
    expect(bobs.body.data).toEqual([])

    await request(app)
      .get('/v1/me/likes/contains?ids=nope')
      .set('authorization', w.alice.auth)
      .expect(400)
  })

  it('rejects unknown and malformed track IDs', async () => {
    await request(app)
      .put(`/v1/me/likes/${missingId}`)
      .set('authorization', w.alice.auth)
      .expect(404)
    await request(app).put('/v1/me/likes/42').set('authorization', w.alice.auth).expect(400)
  })
})

describe('playlists', () => {
  const create = (auth: string, body: object = {}) =>
    request(app).post('/v1/playlists').set('authorization', auth).send(body).expect(201)

  const add = (auth: string, playlistId: string, trackId: string, position?: number) =>
    request(app)
      .post(`/v1/playlists/${playlistId}/tracks`)
      .set('authorization', auth)
      .send(position === undefined ? { trackId } : { trackId, position })

  async function order(playlistId: string, auth = w.alice.auth) {
    const res = await request(app)
      .get(`/v1/playlists/${playlistId}/tracks`)
      .set('authorization', auth)
      .expect(200)
    return res.body.data.map((item: { position: number; track: { title: string } }) => [
      item.position,
      item.track.title,
    ])
  }

  it('numbers unnamed playlists, defaults to private, and lists only your own', async () => {
    const first = await create(w.alice.auth)
    const second = await create(w.alice.auth, { name: 'Road trip', isPublic: true })
    await create(w.bob.auth)

    expect(first.body.data).toMatchObject({
      name: 'My Playlist #1',
      isPublic: false,
      trackCount: 0,
      owner: { id: w.alice.user.id },
    })
    expect(second.body.data).toMatchObject({ name: 'Road trip', isPublic: true })

    const mine = await request(app)
      .get('/v1/me/playlists')
      .set('authorization', w.alice.auth)
      .expect(200)
    expect(mine.body.data.map((p: { name: string }) => p.name)).toEqual([
      'Road trip',
      'My Playlist #1',
    ])
  })

  it('hides private playlists from everyone but the owner and admins', async () => {
    const { id } = (await create(w.alice.auth)).body.data

    await request(app).get(`/v1/playlists/${id}`).expect(404)
    await request(app).get(`/v1/playlists/${id}`).set('authorization', w.bob.auth).expect(404)
    await request(app)
      .get(`/v1/playlists/${id}/tracks`)
      .set('authorization', w.bob.auth)
      .expect(404)
    await request(app).get(`/v1/playlists/${id}`).set('authorization', w.alice.auth).expect(200)
    await request(app).get(`/v1/playlists/${id}`).set('authorization', w.admin.auth).expect(200)
  })

  it('lets anyone read a public playlist, with previews for guests', async () => {
    const { id } = (await create(w.alice.auth, { isPublic: true })).body.data
    await add(w.alice.auth, id, w.tracks[0].id).expect(201)
    await prisma.track.update({
      where: { id: w.tracks[0].id },
      data: { audioUrl: 'https://res.cloudinary.com/demo/video/upload/v1/one.mp3' },
    })

    const guest = await request(app).get(`/v1/playlists/${id}/tracks`).expect(200)
    expect(guest.body.data[0]).toMatchObject({
      position: 0,
      track: {
        audioUrl: 'https://res.cloudinary.com/demo/video/upload/du_30/v1/one.mp3',
        isPreview: true,
      },
    })
    const listener = await request(app)
      .get(`/v1/playlists/${id}/tracks`)
      .set('authorization', w.bob.auth)
      .expect(200)
    expect(listener.body.data[0].track.isPreview).toBe(false)
  })

  it('only the owner or an admin can change a playlist', async () => {
    const publicList = (await create(w.alice.auth, { isPublic: true })).body.data.id
    const privateList = (await create(w.alice.auth)).body.data.id
    const rename = (id: string) =>
      request(app).patch(`/v1/playlists/${id}`).send({ name: 'Mine now' })

    await rename(publicList).expect(401)
    const bobPublic = await rename(publicList).set('authorization', w.bob.auth).expect(403)
    expect(bobPublic.body.error.code).toBe('FORBIDDEN')
    await rename(privateList).set('authorization', w.bob.auth).expect(404)
    await add(w.bob.auth, publicList, w.tracks[0].id).expect(403)
    await request(app)
      .delete(`/v1/playlists/${publicList}`)
      .set('authorization', w.bob.auth)
      .expect(403)

    await rename(publicList).set('authorization', w.alice.auth).expect(200)
    await rename(privateList).set('authorization', w.admin.auth).expect(200)
    await request(app)
      .delete(`/v1/playlists/${privateList}`)
      .set('authorization', w.admin.auth)
      .expect(204)
    await request(app)
      .get(`/v1/playlists/${privateList}`)
      .set('authorization', w.alice.auth)
      .expect(404)
  })

  it('updates details and uploads a cover from multipart', async () => {
    const { id } = (await create(w.alice.auth)).body.data
    const res = await request(app)
      .patch(`/v1/playlists/${id}`)
      .set('authorization', w.alice.auth)
      .field('description', 'Late night')
      .field('isPublic', 'true')
      .attach('cover', png, { filename: 'c.png', contentType: 'image/png' })
      .expect(200)
    expect(res.body.data).toMatchObject({
      description: 'Late night',
      isPublic: true,
      coverUrl: 'https://cdn.test/playlist-cover.jpg',
    })
    await request(app)
      .patch(`/v1/playlists/${id}`)
      .set('authorization', w.alice.auth)
      .send({})
      .expect(400)
    await request(app)
      .patch(`/v1/playlists/${id}`)
      .set('authorization', w.alice.auth)
      .send({ ownerId: w.bob.user.id })
      .expect(400)
  })

  it('appends, inserts, moves and removes tracks with contiguous positions', async () => {
    const [one, two, three, four] = w.tracks
    const { id } = (await create(w.alice.auth)).body.data

    expect((await add(w.alice.auth, id, one.id).expect(201)).body.data).toEqual({
      trackId: one.id,
      position: 0,
    })
    await add(w.alice.auth, id, two.id).expect(201)
    await add(w.alice.auth, id, three.id, 0).expect(201)
    expect((await add(w.alice.auth, id, four.id, 99).expect(201)).body.data.position).toBe(3)
    expect(await order(id)).toEqual([
      [0, 'Three'],
      [1, 'One'],
      [2, 'Two'],
      [3, 'Four'],
    ])

    const dup = await add(w.alice.auth, id, one.id).expect(409)
    expect(dup.body.error.code).toBe('TRACK_ALREADY_IN_PLAYLIST')
    await add(w.alice.auth, id, missingId).expect(404)

    const move = (trackId: string, position: number) =>
      request(app)
        .patch(`/v1/playlists/${id}/tracks/${trackId}`)
        .set('authorization', w.alice.auth)
        .send({ position })
    expect((await move(four.id, 0).expect(200)).body.data).toEqual({
      trackId: four.id,
      position: 0,
    })
    expect(await order(id)).toEqual([
      [0, 'Four'],
      [1, 'Three'],
      [2, 'One'],
      [3, 'Two'],
    ])
    await move(four.id, 50).expect(200)
    expect(await order(id)).toEqual([
      [0, 'Three'],
      [1, 'One'],
      [2, 'Two'],
      [3, 'Four'],
    ])
    await move(missingId, 0).expect(404)

    await request(app)
      .delete(`/v1/playlists/${id}/tracks/${one.id}`)
      .set('authorization', w.alice.auth)
      .expect(204)
    await request(app)
      .delete(`/v1/playlists/${id}/tracks/${one.id}`)
      .set('authorization', w.alice.auth)
      .expect(404)
    expect(await order(id)).toEqual([
      [0, 'Three'],
      [1, 'Two'],
      [2, 'Four'],
    ])

    const details = await request(app)
      .get(`/v1/playlists/${id}`)
      .set('authorization', w.alice.auth)
      .expect(200)
    expect(details.body.data).toMatchObject({
      trackCount: 3,
      totalDurationMs: 180_000 + 40_000 + 120_000,
    })
  })

  it('pages tracks by position', async () => {
    const { id } = (await create(w.alice.auth)).body.data
    for (const track of w.tracks) await add(w.alice.auth, id, track.id).expect(201)

    const first = await request(app)
      .get(`/v1/playlists/${id}/tracks?limit=3`)
      .set('authorization', w.alice.auth)
      .expect(200)
    expect(titles(first.body.data)).toEqual(['One', 'Two', 'Three'])
    const rest = await request(app)
      .get(`/v1/playlists/${id}/tracks`)
      .query({ limit: 3, cursor: first.body.meta.nextCursor })
      .set('authorization', w.alice.auth)
      .expect(200)
    expect(titles(rest.body.data)).toEqual(['Four'])
  })

  it('closes the gap when a catalog track is deleted', async () => {
    const [one, two, three] = w.tracks
    const { id } = (await create(w.alice.auth)).body.data
    for (const track of [one, two, three]) await add(w.alice.auth, id, track.id).expect(201)

    await prisma.track.delete({ where: { id: two.id } })
    expect(await order(id)).toEqual([
      [0, 'One'],
      [2, 'Three'],
    ])
    await add(w.alice.auth, id, w.tracks[3].id).expect(201)
    expect(await order(id)).toEqual([
      [0, 'One'],
      [1, 'Three'],
      [2, 'Four'],
    ])
  })

  it('keeps positions unique when tracks are added concurrently', async () => {
    const { id } = (await create(w.alice.auth)).body.data
    const album = await createAlbum(w.artist.id, 'Bulk')
    const bulk = await Promise.all(Array.from({ length: 10 }, (_, n) => createTrack(album, n + 1)))

    const results = await Promise.all(bulk.map((track) => add(w.alice.auth, id, track.id)))
    expect(results.map((res) => res.status)).toEqual(Array(10).fill(201))
    const positions = (await order(id)).map(([position]: [number]) => position)
    expect(positions).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('caps how many playlists one account can have', async () => {
    await prisma.playlist.createMany({
      data: Array.from({ length: 500 }, (_, n) => ({ ownerId: w.alice.user.id, name: `P${n}` })),
    })
    const res = await request(app)
      .post('/v1/playlists')
      .set('authorization', w.alice.auth)
      .send({})
      .expect(409)
    expect(res.body.error.code).toBe('PLAYLIST_LIMIT_REACHED')
  })
})

describe('history', () => {
  const play = (trackId: string, playedMs: number, auth = w.alice.auth) =>
    request(app).post('/v1/me/history').set('authorization', auth).send({ trackId, playedMs })

  it('records a play only after 30 seconds, or half of a short track', async () => {
    const [long, short] = w.tracks
    expect((await play(long.id, 29_000).expect(200)).body.data).toEqual({
      recorded: false,
      reason: 'TOO_SHORT',
    })
    expect((await play(long.id, 30_000).expect(201)).body.data).toMatchObject({ recorded: true })
    expect((await play(short.id, 20_000).expect(201)).body.data.recorded).toBe(true)
    await play(missingId, 60_000).expect(404)
  })

  it('ignores a second report of the same track within 10 seconds', async () => {
    await play(w.tracks[0].id, 60_000).expect(201)
    expect((await play(w.tracks[0].id, 60_000).expect(200)).body.data.reason).toBe('DUPLICATE')

    await prisma.playHistory.updateMany({ data: { playedAt: new Date(Date.now() - 11_000) } })
    await play(w.tracks[0].id, 60_000).expect(201)
  })

  it('lists recent plays newest first, pages them, and can be cleared', async () => {
    const [one, , three, four] = w.tracks
    for (const [index, track] of [one, three, four].entries()) {
      const { id } = (await play(track.id, 60_000).expect(201)).body.data
      await prisma.playHistory.update({
        where: { id },
        data: { playedAt: new Date(Date.UTC(2026, 0, 1 + index)) },
      })
    }

    const first = await request(app)
      .get('/v1/me/history?limit=2')
      .set('authorization', w.alice.auth)
      .expect(200)
    expect(titles(first.body.data)).toEqual(['Four', 'Three'])
    expect(first.body.data[0]).toMatchObject({
      id: expect.any(String),
      playedAt: expect.any(String),
    })
    const rest = await request(app)
      .get('/v1/me/history')
      .query({ limit: 2, cursor: first.body.meta.nextCursor })
      .set('authorization', w.alice.auth)
      .expect(200)
    expect(titles(rest.body.data)).toEqual(['One'])

    const bobs = await request(app)
      .get('/v1/me/history')
      .set('authorization', w.bob.auth)
      .expect(200)
    expect(bobs.body.data).toEqual([])

    await request(app).delete('/v1/me/history').set('authorization', w.alice.auth).expect(204)
    const cleared = await request(app)
      .get('/v1/me/history')
      .set('authorization', w.alice.auth)
      .expect(200)
    expect(cleared.body.data).toEqual([])
  })

  it('limits each account to 60 play reports a minute', async () => {
    for (let i = 0; i < 60; i++) await play(w.tracks[0].id, 60_000)
    const limited = await play(w.tracks[0].id, 60_000).expect(429)
    expect(limited.body.error.code).toBe('RATE_LIMITED')
    await play(w.tracks[1].id, 60_000, w.bob.auth).expect(201)
  })
})

describe('player state', () => {
  const update = (body: object) =>
    request(app).patch('/v1/me/player').set('authorization', w.alice.auth).send(body)

  it('starts from defaults', async () => {
    const res = await request(app)
      .get('/v1/me/player')
      .set('authorization', w.alice.auth)
      .expect(200)
    expect(res.body.data).toEqual({
      lastTrack: null,
      positionMs: 0,
      volume: 100,
      repeatMode: 'off',
      shuffle: false,
      updatedAt: null,
    })
  })

  it('saves partial updates, resets the position on a new track, and clamps it to the track', async () => {
    const [one, two] = w.tracks
    const saved = await update({ lastTrackId: one.id, positionMs: 61_000, volume: 40 }).expect(200)
    expect(saved.body.data).toMatchObject({
      lastTrack: { id: one.id, isPreview: false },
      positionMs: 61_000,
      volume: 40,
      updatedAt: expect.any(String),
    })

    expect(
      (await update({ shuffle: true, repeatMode: 'all' }).expect(200)).body.data,
    ).toMatchObject({
      positionMs: 61_000,
      shuffle: true,
      repeatMode: 'all',
    })
    expect((await update({ lastTrackId: two.id }).expect(200)).body.data).toMatchObject({
      lastTrack: { id: two.id },
      positionMs: 0,
      volume: 40,
    })
    expect((await update({ positionMs: 999_000 }).expect(200)).body.data.positionMs).toBe(40_000)
    expect((await update({ lastTrackId: null }).expect(200)).body.data).toMatchObject({
      lastTrack: null,
      positionMs: 0,
    })

    const bobs = await request(app)
      .get('/v1/me/player')
      .set('authorization', w.bob.auth)
      .expect(200)
    expect(bobs.body.data.volume).toBe(100)
  })

  it('rejects unknown tracks and invalid values', async () => {
    await update({ lastTrackId: missingId }).expect(404)
    await update({ volume: 101 }).expect(400)
    await update({ repeatMode: 'forever' }).expect(400)
    await update({}).expect(400)
  })
})
