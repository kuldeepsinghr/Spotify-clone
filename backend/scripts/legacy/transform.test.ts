import { describe, expect, it } from 'vitest'
import {
  hasBlockingIssues,
  objectIdTimestamp,
  planMigration,
  SINGLES_LEGACY_ID,
} from './transform.js'
import type { LegacyAlbum, LegacySong } from './types.js'

const album = (id: string, name: string): LegacyAlbum => ({
  _id: id,
  name,
  desc: `${name} desc`,
  bgColor: '#333333',
  image: `https://img/${id}.jpg`,
})

const song = (id: string, albumName: string, duration = '3:05'): LegacySong => ({
  _id: id,
  name: `Song ${id}`,
  desc: 'desc',
  album: albumName,
  image: `https://img/${id}.jpg`,
  file: `https://audio/${id}.mp3`,
  duration,
})

// ObjectIds whose first 8 hex digits encode increasing timestamps
const id = (seconds: number, suffix: string) =>
  seconds.toString(16).padStart(8, '0') + suffix.padStart(16, '0')

describe('objectIdTimestamp', () => {
  it('reads the creation time from an ObjectId', () => {
    expect(objectIdTimestamp('671663c76d1cad843338e82d', new Date(0)).toISOString()).toBe(
      '2024-10-21T14:23:03.000Z',
    )
  })

  it('falls back for other ID formats', () => {
    const fallback = new Date('2020-01-01T00:00:00Z')
    expect(objectIdTimestamp('not-an-object-id', fallback)).toBe(fallback)
  })
})

describe('planMigration', () => {
  it('links songs to albums by name and converts durations', () => {
    const plan = planMigration([album(id(1, 'a'), 'Top 50')], [song(id(2, 'b'), 'Top 50', '3:5')])

    expect(plan.issues).toEqual([])
    expect(plan.counts).toEqual({ albumsIn: 1, songsIn: 1, albumsOut: 1, tracksOut: 1 })
    expect(plan.tracks[0]).toMatchObject({
      albumLegacyId: id(1, 'a'),
      durationMs: 185_000,
      trackNumber: 1,
      audioUrl: `https://audio/${id(2, 'b')}.mp3`,
    })
  })

  it('numbers tracks per album in original insertion order', () => {
    const plan = planMigration(
      [album(id(1, 'a'), 'A'), album(id(1, 'b'), 'B')],
      [song(id(30, '3'), 'A'), song(id(10, '1'), 'A'), song(id(20, '2'), 'B')],
    )
    const numbers = Object.fromEntries(plan.tracks.map((t) => [t.legacyMongoId, t.trackNumber]))
    expect(numbers).toEqual({ [id(10, '1')]: 1, [id(30, '3')]: 2, [id(20, '2')]: 1 })
  })

  it('skips orphan songs and bad durations without guessing', () => {
    const plan = planMigration(
      [album(id(1, 'a'), 'A')],
      [song(id(2, 'b'), 'Missing'), song(id(3, 'c'), 'A', '3 minutes')],
    )
    expect(plan.tracks).toHaveLength(0)
    expect(plan.issues.map((i) => [i.kind, i.severity])).toEqual([
      ['orphan_song', 'skipped'],
      ['bad_duration', 'skipped'],
    ])
    expect(hasBlockingIssues(plan)).toBe(true)
  })

  it('moves orphans to a Singles album when asked', () => {
    const plan = planMigration([album(id(1, 'a'), 'A')], [song(id(2, 'b'), 'Missing')], {
      orphansToSingles: true,
    })
    expect(plan.albums.map((a) => a.legacyMongoId)).toEqual([id(1, 'a'), SINGLES_LEGACY_ID])
    expect(plan.tracks[0]?.albumLegacyId).toBe(SINGLES_LEGACY_ID)
    expect(hasBlockingIssues(plan)).toBe(false)
  })

  it('refuses to pick between albums with the same name', () => {
    const plan = planMigration(
      [album(id(1, 'a'), 'Dup'), album(id(1, 'b'), 'Dup')],
      [song(id(2, 'c'), 'Dup')],
    )
    expect(plan.albums).toHaveLength(2)
    expect(plan.tracks).toHaveLength(0)
    expect(plan.issues.map((i) => i.kind).sort()).toEqual([
      'ambiguous_album',
      'duplicate_album_name',
      'duplicate_album_name',
    ])
  })

  it('reports records missing required fields', () => {
    const plan = planMigration(
      [{ ...album(id(1, 'a'), 'A'), image: '' }],
      [{ ...song(id(2, 'b'), 'A'), file: '' }],
    )
    expect(plan.albums).toHaveLength(0)
    expect(plan.issues.map((i) => i.kind)).toEqual(['invalid_album', 'invalid_song'])
  })
})
