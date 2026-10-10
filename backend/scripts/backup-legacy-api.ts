/**
 * Exports the catalog from the running legacy API into backups/legacy-<timestamp>.json.
 * Use it when you cannot reach MongoDB directly; the output feeds `migrate:mongo -- --source file`.
 *
 *   npm run backup:legacy -- [--url https://spotify-clone-backend-rctz.onrender.com]
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import type { LegacyAlbum, LegacyExport, LegacySong } from './legacy/types.js'

const { values } = parseArgs({
  options: {
    url: { type: 'string', default: 'https://spotify-clone-backend-rctz.onrender.com' },
    out: { type: 'string', default: path.resolve(import.meta.dirname, '../../backups') },
  },
})

async function getJson<T>(url: string): Promise<T> {
  // The free Render instance can take close to a minute to wake up.
  const response = await fetch(url, { signal: AbortSignal.timeout(90_000) })
  if (!response.ok) throw new Error(`${url} responded ${response.status}`)
  return (await response.json()) as T
}

const baseUrl = values.url!.replace(/\/$/, '')
const albums = await getJson<{ album?: LegacyAlbum[] }>(`${baseUrl}/api/album/list`)
const songs = await getJson<{ songs?: LegacySong[] }>(`${baseUrl}/api/song/list`)

if (!Array.isArray(albums.album) || !Array.isArray(songs.songs)) {
  throw new Error('Legacy API did not return album and song lists')
}

const backup: LegacyExport = {
  exportedAt: new Date().toISOString(),
  source: baseUrl,
  albums: albums.album,
  songs: songs.songs,
}

await mkdir(values.out!, { recursive: true })
const file = path.join(values.out!, `legacy-${backup.exportedAt.replace(/[:.]/g, '-')}.json`)
await writeFile(file, JSON.stringify(backup, null, 2))
console.log(`Saved ${backup.albums.length} albums and ${backup.songs.length} songs to ${file}`)
