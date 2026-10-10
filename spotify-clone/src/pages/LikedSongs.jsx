import { useEffect, useState } from 'react'
import { libraryApi } from '../api/library.js'
import { apiMessage, formatDuration } from '../api/errors.js'
import Navbar from '../components/Navbar'
import StatusMessage from '../components/StatusMessage'
import TrackRow from '../components/TrackRow'
import { useLibrary } from '../context/LibraryContext.jsx'
import { usePlayer } from '../hooks/usePlayer.js'

const LikedSongs = () => {
  const { playTracks } = usePlayer()
  const { refreshLikes } = useLibrary()
  const [rows, setRows] = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async (cursor) => {
    const page = await libraryApi.pageLikes({ params: { limit: 40 }, cursor })
    setRows((current) => (cursor ? [...current, ...page.items] : page.items))
    setNextCursor(page.nextCursor)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    load()
      .catch((err) => {
        if (!cancelled) setError(apiMessage(err, 'Could not load Liked Songs'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const tracks = rows.map((row) => row.track)
  const totalMs = tracks.reduce((sum, item) => sum + (item.durationMs || 0), 0)

  const unlike = async (track) => {
    await libraryApi.unlike(track.id)
    setRows((current) => current.filter((row) => row.track.id !== track.id))
    refreshLikes().catch(() => {})
  }

  return (
    <>
      <Navbar />
      <div className="mt-10 flex gap-8 flex-col md:flex-row md:items-end">
        <div className="w-48 h-48 rounded bg-gradient-to-br from-indigo-700 to-white/20 flex items-center justify-center text-6xl">
          ♥
        </div>
        <div>
          <p>Playlist</p>
          <h1 className="text-5xl font-bold mb-4 md:text-7xl">Liked Songs</h1>
          <p className="text-[#a7a7a7]">
            {tracks.length} songs{totalMs ? ` · ${formatDuration(totalMs)}` : ''}
          </p>
        </div>
      </div>

      {loading ? (
        <StatusMessage body="Loading liked songs…" />
      ) : error ? (
        <StatusMessage title="Could not load likes" body={error} />
      ) : tracks.length === 0 ? (
        <StatusMessage title="Songs you like live here" body="Tap the heart on any track to save it." />
      ) : (
        <div className="mt-8 pb-8">
          {rows.map((row, index) => (
            <TrackRow
              key={`${row.track.id}-${row.likedAt}`}
              track={row.track}
              index={index}
              onPlay={() => playTracks(tracks, index)}
              onRemove={unlike}
              removeLabel="Unlike"
            />
          ))}
          {nextCursor ? (
            <button type="button" className="mt-4 text-sm underline" onClick={() => load(nextCursor)}>
              Load more
            </button>
          ) : null}
        </div>
      )}
    </>
  )
}

export default LikedSongs
