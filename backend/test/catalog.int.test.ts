import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/shared/db.js'
import { createAlbum, createArtist, createTrack, createUser, resetDatabase } from './fixtures.js'

const app = createApp()
const missingId = '00000000-0000-7000-8000-000000000000'

beforeEach(resetDatabase)
afterAll(() => prisma.$disconnect())

describe('health', () => {
  it('reports liveness and readiness', async () => {
    await request(app)
      .get('/v1/health')
      .expect(200, /"status":"ok"/)
    const ready = await request(app).get('/v1/ready').expect(200)
    expect(ready.body).toEqual({ success: true, data: { status: 'ready' } })
  })
})

describe('GET /v1/albums', () => {
  it('pages newest first with an opaque cursor', async () => {
    const artist = await createArtist()
    const oldest = await createAlbum(artist.id, 'Oldest', new Date('2024-01-01'))
    const middle = await createAlbum(artist.id, 'Middle', new Date('2024-02-01'))
    const newest = await createAlbum(artist.id, 'Newest', new Date('2024-03-01'))

    const first = await request(app).get('/v1/albums?limit=2').expect(200)
    expect(first.body.data.map((a: { id: string }) => a.id)).toEqual([newest.id, middle.id])
    expect(first.body.meta).toMatchObject({ limit: 2, nextCursor: expect.any(String) })
    expect(first.body.data[0]).toMatchObject({
      title: 'Newest',
      artist: { id: artist.id, name: artist.name },
    })
    expect(first.body.data[0]).not.toHaveProperty('legacyMongoId')

    const second = await request(app)
      .get('/v1/albums')
      .query({ limit: 2, cursor: first.body.meta.nextCursor })
      .expect(200)
    expect(second.body.data.map((a: { id: string }) => a.id)).toEqual([oldest.id])
    expect(second.body.meta.nextCursor).toBeNull()
  })

  it('rejects bad paging input with the error envelope', async () => {
    const tooBig = await request(app).get('/v1/albums?limit=500').expect(400)
    expect(tooBig.body).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } })

    const badCursor = await request(app).get('/v1/albums?cursor=garbage').expect(400)
    expect(badCursor.body.error.code).toBe('INVALID_CURSOR')
  })
})

describe('GET /v1/albums/:id', () => {
  it('includes track count and total duration', async () => {
    const artist = await createArtist()
    const album = await createAlbum(artist.id)
    await createTrack(album, 1, 'One', 100_000)
    await createTrack(album, 2, 'Two', 50_000)

    const res = await request(app).get(`/v1/albums/${album.id}`).expect(200)
    expect(res.body.data).toMatchObject({ id: album.id, trackCount: 2, totalDurationMs: 150_000 })
  })

  it('returns 404 for unknown albums and 400 for malformed IDs', async () => {
    const missing = await request(app).get(`/v1/albums/${missingId}`).expect(404)
    expect(missing.body).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Album not found' },
    })
    await request(app).get('/v1/albums/not-a-uuid').expect(400)
  })

  it('lists tracks in track-number order', async () => {
    const artist = await createArtist()
    const album = await createAlbum(artist.id)
    await createTrack(album, 2, 'Second')
    await createTrack(album, 1, 'First')
    await createTrack(album, 3, 'Third')

    const res = await request(app).get(`/v1/albums/${album.id}/tracks?limit=2`).expect(200)
    expect(res.body.data.map((t: { title: string }) => t.title)).toEqual(['First', 'Second'])
    const rest = await request(app)
      .get(`/v1/albums/${album.id}/tracks`)
      .query({ limit: 2, cursor: res.body.meta.nextCursor })
      .expect(200)
    expect(rest.body.data.map((t: { title: string }) => t.title)).toEqual(['Third'])
  })
})

describe('artists', () => {
  it('lists an artist’s albums and ranks top tracks by plays', async () => {
    const artist = await createArtist('Daft Punk')
    const album = await createAlbum(artist.id, 'Discovery')
    const quiet = await createTrack(album, 1, 'Quiet')
    const hit = await createTrack(album, 2, 'Hit')
    const user = await createUser()
    await prisma.playHistory.createMany({
      data: [
        { userId: user.id, trackId: hit.id },
        { userId: user.id, trackId: hit.id },
        { userId: user.id, trackId: quiet.id },
      ],
    })

    const albums = await request(app).get(`/v1/artists/${artist.id}/albums`).expect(200)
    expect(albums.body.data.map((a: { title: string }) => a.title)).toEqual(['Discovery'])

    const top = await request(app).get(`/v1/artists/${artist.id}/top-tracks`).expect(200)
    expect(top.body.data.map((t: { title: string }) => t.title)).toEqual(['Hit', 'Quiet'])

    await request(app).get(`/v1/artists/${missingId}/top-tracks`).expect(404)
  })
})

describe('GET /v1/tracks/:id', () => {
  it('returns the track with its album and artist', async () => {
    const artist = await createArtist()
    const album = await createAlbum(artist.id)
    const track = await createTrack(album, 1, 'Solo', 61_000)

    const res = await request(app).get(`/v1/tracks/${track.id}`).expect(200)
    expect(res.body.data).toMatchObject({
      id: track.id,
      title: 'Solo',
      durationMs: 61_000,
      album: { id: album.id, title: album.title },
      artist: { id: artist.id },
    })
  })

  it('filters the track list by artist', async () => {
    const mine = await createArtist('Mine')
    const other = await createArtist('Other')
    await createTrack(await createAlbum(mine.id), 1, 'Kept')
    await createTrack(await createAlbum(other.id), 1, 'Hidden')

    const res = await request(app).get('/v1/tracks').query({ artistId: mine.id }).expect(200)
    expect(res.body.data.map((t: { title: string }) => t.title)).toEqual(['Kept'])
    await request(app).get('/v1/tracks?artistId=nope').expect(400)
  })
})

describe('GET /v1/search', () => {
  it('finds tracks, albums and artists by substring and by typo', async () => {
    const artist = await createArtist('Midnight Echoes')
    const album = await createAlbum(artist.id, 'Midnight City')
    await createTrack(album, 1, 'Midnight Drive')
    await createTrack(album, 1 + 1, 'Sunrise')

    const all = await request(app).get('/v1/search?q=midnight').expect(200)
    expect(all.body.data.tracks.items.map((t: { title: string }) => t.title)).toEqual([
      'Midnight Drive',
    ])
    expect(all.body.data.albums.items[0].title).toBe('Midnight City')
    expect(all.body.data.artists.items[0].name).toBe('Midnight Echoes')

    const typo = await request(app).get('/v1/search?q=midnite&type=track').expect(200)
    expect(typo.body.data).not.toHaveProperty('albums')
    expect(typo.body.data.tracks.items.map((t: { title: string }) => t.title)).toContain(
      'Midnight Drive',
    )
  })

  it('treats LIKE wildcards literally', async () => {
    const artist = await createArtist()
    const album = await createAlbum(artist.id)
    await createTrack(album, 1, 'Plain title')

    const res = await request(app).get('/v1/search?q=%25&type=track').expect(200)
    expect(res.body.data.tracks.items).toEqual([])
  })

  it('pages a single type', async () => {
    const artist = await createArtist()
    const album = await createAlbum(artist.id)
    for (let n = 1; n <= 3; n++) await createTrack(album, n, `Echo ${n}`)

    const first = await request(app).get('/v1/search?q=echo&type=track&limit=2').expect(200)
    expect(first.body.data.tracks.items).toHaveLength(2)
    const second = await request(app)
      .get('/v1/search')
      .query({ q: 'echo', type: 'track', limit: 2, cursor: first.body.data.tracks.nextCursor })
      .expect(200)
    expect(second.body.data.tracks.items).toHaveLength(1)
    expect(second.body.data.tracks.nextCursor).toBeNull()
  })

  it('requires a query', async () => {
    const res = await request(app).get('/v1/search?q=%20').expect(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('unknown routes', () => {
  it('use the error envelope', async () => {
    const res = await request(app).get('/v1/nope').expect(404)
    expect(res.body).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: 'No route for GET /v1/nope' },
    })
  })
})
