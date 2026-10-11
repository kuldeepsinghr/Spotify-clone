import { useEffect, useState } from 'react'
import { libraryApi } from '../api/library.js'
import { apiMessage, formatDuration } from '../api/errors.js'
import Navbar from '../components/Navbar'
import StatusMessage from '../components/StatusMessage'
import TrackRow from '../components/TrackRow'
import { useLibrary } from '../context/LibraryContext.jsx'
import { pushToast } from '../context/toast.js'
import { usePlayer } from '../hooks/usePlayer.js'

const LikedSongs = () => {
  const { playTracks } = usePlayer()
  const { likeEvent, toggleLike } = useLibrary()
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

  useEffect(() => {
    if (!likeEvent?.trackId) return
    if (likeEvent.type === 'remove') {
      setRows((current) => current.filter((row) => row.track.id !== likeEvent.trackId))
      return
    }
    if (!likeEvent.track) return
    setRows((current) => {
      if (current.some((row) => row.track.id === likeEvent.track.id)) return current
      return [{ track: likeEvent.track, likedAt: new Date().toISOString() }, ...current]
    })
  }, [likeEvent])

  const tracks = rows.map((row) => row.track)
  const totalMs = tracks.reduce((sum, item) => sum + (item.durationMs || 0), 0)

  const unlike = (track) => {
    pushToast('Removed from Liked Songs', track)
    toggleLike(track.id, track).catch(() => pushToast("Couldn't update Liked Songs", track))
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
        <StatusMessage title="Songs you like live here" body="Tap + on a song to save it here." />
      ) : (
        <div className="mt-8 pb-8">
          {rows.map((row, index) => (
            <TrackRow
              key={`${row.track.id}-${row.likedAt}`}
              track={row.track}
              index={index}
              onPlay={() => playTracks(tracks, index, { type: 'liked' })}
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
