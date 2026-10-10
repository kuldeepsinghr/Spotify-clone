import { readFile } from 'node:fs/promises'
import type { LegacyAlbum, LegacyExport, LegacySong } from './types.js'

export interface LegacyData {
  description: string
  albums: LegacyAlbum[]
  songs: LegacySong[]
}

export async function loadFromFile(file: string): Promise<LegacyData> {
  const data = JSON.parse(await readFile(file, 'utf8')) as LegacyExport
  if (!Array.isArray(data.albums) || !Array.isArray(data.songs)) {
    throw new Error(`${file} must contain "albums" and "songs" arrays`)
  }
  return { description: `file ${file}`, albums: data.albums, songs: data.songs }
}

/** Reads the `albums` and `songs` collections that the old Mongoose models wrote. */
export async function loadFromMongo(uri: string, database: string): Promise<LegacyData> {
  // Dev-only dependency; the API itself no longer talks to MongoDB.
  const { MongoClient } = await import('mongodb')
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 })
  try {
    await client.connect()
    const db = client.db(database)
    const toLegacy = <T>(doc: Record<string, unknown>) => ({ ...doc, _id: String(doc._id) }) as T
    const albums = (await db.collection('albums').find({}).toArray()).map((d) =>
      toLegacy<LegacyAlbum>(d),
    )
    const songs = (await db.collection('songs').find({}).toArray()).map((d) =>
      toLegacy<LegacySong>(d),
    )
    return { description: `mongo database "${database}"`, albums, songs }
  } finally {
    await client.close()
  }
}
