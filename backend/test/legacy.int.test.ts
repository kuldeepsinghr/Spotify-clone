import request from 'supertest'
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
      ? { url: 'https://cdn.test/song.mp3', durationMs: 185_400 }
      : { url: 'https://cdn.test/cover.jpg' },
  ),
}))

const { createApp } = await import('../src/app.js')
const app = createApp()

const png = Buffer.from('89504e470d0a1a0a', 'hex')
const mp3 = Buffer.from('494433', 'hex')

let admin: string

beforeEach(async () => {
  await resetDatabase()
  admin = (await signedIn('admin')).auth
})
afterAll(() => prisma.$disconnect())

describe('legacy /api contract', () => {
  it('lists songs and albums in the shapes the current apps read, without signing in', async () => {
    const artist = await createArtist()
    const album = await createAlbum(artist.id, 'Top 50')
    const track = await createTrack(album, 1, 'Song 2', 185_000)

    const songs = await request(app).get('/api/song/list').expect(200)
    expect(songs.body).toEqual({
      success: true,
      songs: [
        {
          _id: track.id,
          name: 'Song 2',
          desc: '',
          album: 'Top 50',
          image: track.imageUrl,
          file: track.audioUrl,
          duration: '3:05',
        },
      ],
    })

    const albums = await request(app).get('/api/album/list').expect(200)
    expect(albums.body).toEqual({
      success: true,
      album: [
        { _id: album.id, name: 'Top 50', desc: '', bgColor: '#123456', image: album.coverUrl },
      ],
    })
  })

  it('adds an album under the placeholder artist and a song by album name', async () => {
    const addedAlbum = await request(app)
      .post('/api/album/add')
      .set('authorization', admin)
      .field('name', 'Fresh')
      .field('desc', 'New album')
      .field('bgColor', '#1db954')
      .attach('image', png, { filename: 'cover.png', contentType: 'image/png' })
      .expect(201)
    expect(addedAlbum.body).toMatchObject({
      success: true,
      album: { name: 'Fresh', image: 'https://cdn.test/cover.jpg' },
    })

    const stored = await prisma.album.findFirstOrThrow({
      where: { title: 'Fresh' },
      include: { artist: true },
    })
    expect(stored.artist.name).toBe('Unknown Artist')

    const addedSong = await request(app)
      .post('/api/song/add')
      .set('authorization', admin)
      .field('name', 'Opener')
      .field('desc', 'First song')
      .field('album', 'Fresh')
      .attach('image', png, { filename: 'art.png', contentType: 'image/png' })
      .attach('audio', mp3, { filename: 'song.mp3', contentType: 'audio/mpeg' })
      .expect(201)
    expect(addedSong.body.song).toMatchObject({ name: 'Opener', album: 'Fresh', duration: '3:05' })

    const track = await prisma.track.findFirstOrThrow({ where: { title: 'Opener' } })
    expect(track).toMatchObject({
      albumId: stored.id,
      artistId: stored.artistId,
      trackNumber: 1,
      durationMs: 185_400,
    })
  })

  it('requires an admin for every write', async () => {
    const artist = await createArtist()
    const album = await createAlbum(artist.id)
    const user = (await signedIn('user')).auth
    const owner = (await signedInArtist()).auth

    const writes = [
      () => request(app).post('/api/album/add').field('name', 'X'),
      () => request(app).post('/api/song/add').field('name', 'X'),
      () => request(app).post('/api/song/remove').send({ id: album.id }),
      () => request(app).post('/api/album/remove').send({ id: album.id }),
    ]
    for (const write of writes) {
      expect((await write()).status).toBe(401)
      expect((await write().set('authorization', user)).status).toBe(403)
      expect((await write().set('authorization', owner)).status).toBe(403)
    }
    expect(await prisma.album.count()).toBe(1)
  })

  it('rejects uploads of the wrong type and unknown albums', async () => {
    const wrongType = await request(app)
      .post('/api/album/add')
      .set('authorization', admin)
      .field('name', 'Bad')
      .attach('image', mp3, { filename: 'x.mp3', contentType: 'audio/mpeg' })
      .expect(415)
    expect(wrongType.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE')

    await request(app)
      .post('/api/song/add')
      .set('authorization', admin)
      .field('name', 'Orphan')
      .field('album', 'none')
      .attach('image', png, { filename: 'art.png', contentType: 'image/png' })
      .attach('audio', mp3, { filename: 'song.mp3', contentType: 'audio/mpeg' })
      .expect(404)
  })

  it('blocks deleting an album that still has tracks', async () => {
    const artist = await createArtist()
    const album = await createAlbum(artist.id)
    const track = await createTrack(album, 1)

    const blocked = await request(app)
      .post('/api/album/remove')
      .set('authorization', admin)
      .send({ id: album.id })
      .expect(409)
    expect(blocked.body.error.code).toBe('ALBUM_HAS_TRACKS')

    await request(app)
      .post('/api/song/remove')
      .set('authorization', admin)
      .send({ id: track.id })
      .expect(200, { success: true, message: 'song removed' })
    await request(app)
      .post('/api/album/remove')
      .set('authorization', admin)
      .send({ id: album.id })
      .expect(200)
    expect(await prisma.album.count()).toBe(0)
  })

  it('returns 400 for malformed JSON and IDs', async () => {
    const malformed = await request(app)
      .post('/api/song/remove')
      .set('authorization', admin)
      .set('content-type', 'application/json')
      .send('{"id":')
      .expect(400)
    expect(malformed.body.error.code).toBe('MALFORMED_JSON')
    await request(app)
      .post('/api/song/remove')
      .set('authorization', admin)
      .send({ id: '42' })
      .expect(400)
  })
})
