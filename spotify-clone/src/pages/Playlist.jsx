import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiMessage, formatDuration } from '../api/errors.js'
import { libraryApi } from '../api/library.js'
import Navbar from '../components/Navbar'
import StatusMessage from '../components/StatusMessage'
import TrackRow from '../components/TrackRow'
import { useAuth } from '../context/AuthContext.jsx'
import { useLibrary } from '../context/LibraryContext.jsx'
import { usePlayer } from '../hooks/usePlayer.js'

const Playlist = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { playTracks } = usePlayer()
  const { removePlaylist, refreshPlaylists, primeLikes } = useLibrary()
  const [playlist, setPlaylist] = useState(null)
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const isOwner = user && playlist && (user.id === playlist.owner?.id || user.role === 'admin')

  useEffect(() => {
    let cancelled = false
    setPlaylist(null)
    setError('')
    Promise.all([libraryApi.getPlaylist(id), libraryApi.listPlaylistTracks(id)])
      .then(([next, tracks]) => {
        if (cancelled) return
        setPlaylist(next)
        setName(next.name)
        setRows(tracks)
        primeLikes(tracks.map((row) => row.track.id)).catch(() => {})
      })
      .catch((err) => {
        if (!cancelled) setError(apiMessage(err, 'Playlist not found'))
      })
    return () => {
      cancelled = true
    }
  }, [id, user?.id, primeLikes])

  const tracks = rows.map((row) => row.track)

  const saveName = async (event) => {
    event.preventDefault()
    if (!name.trim() || name.trim() === playlist.name) return
    setSaving(true)
    try {
      const updated = await libraryApi.updatePlaylist(id, { name: name.trim() })
      setPlaylist(updated)
      refreshPlaylists().catch(() => {})
    } catch {
      setName(playlist.name)
    } finally {
      setSaving(false)
    }
  }

  const removeTrack = async (track) => {
    await libraryApi.removePlaylistTrack(id, track.id)
    setRows((current) => current.filter((row) => row.track.id !== track.id))
    refreshPlaylists().catch(() => {})
  }

  const destroy = async () => {
    if (!window.confirm('Delete this playlist?')) return
    await removePlaylist(id)
    navigate('/')
  }

  if (error) {
    return (
      <>
        <Navbar />
        <StatusMessage title="Playlist not found" body={error} />
      </>
    )
  }

  if (!playlist) {
    return (
      <>
        <Navbar />
        <StatusMessage body="Loading playlist…" />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="mt-10 flex gap-8 flex-col md:flex-row md:items-end">
        {playlist.coverUrl ? (
          <img src={playlist.coverUrl} alt="" className="w-48 h-48 rounded object-cover" />
        ) : (
          <div className="w-48 h-48 rounded bg-[#282828] flex items-center justify-center text-4xl">♪</div>
        )}
        <div className="flex-1">
          <p>{playlist.isPublic ? 'Public playlist' : 'Private playlist'}</p>
          {isOwner ? (
            <form onSubmit={saveName}>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="text-5xl font-bold mb-4 md:text-6xl bg-transparent outline-none w-full"
              />
              {name.trim() && name.trim() !== playlist.name ? (
                <button type="submit" disabled={saving} className="text-sm underline">
                  Save name
                </button>
              ) : null}
            </form>
          ) : (
            <h1 className="text-5xl font-bold mb-4 md:text-7xl">{playlist.name}</h1>
          )}
          <p className="text-[#a7a7a7]">
            {playlist.owner?.displayName}
            {' · '}
            {playlist.trackCount} songs
            {playlist.totalDurationMs ? ` · ${formatDuration(playlist.totalDurationMs)}` : ''}
          </p>
          {isOwner ? (
            <button type="button" onClick={destroy} className="mt-3 text-sm text-red-400">
              Delete playlist
            </button>
          ) : null}
        </div>
      </div>

      {tracks.length === 0 ? (
        <StatusMessage title="This playlist is empty" body="Add songs from search or an album with the + button." />
      ) : (
        <div className="mt-8 pb-8">
          {rows.map((row, index) => (
            <TrackRow
              key={`${row.track.id}-${row.position}`}
              track={row.track}
              index={index}
              onPlay={() => playTracks(tracks, index)}
              onRemove={isOwner ? removeTrack : undefined}
              removeLabel="Remove from playlist"
            />
          ))}
        </div>
      )}
    </>
  )
}

export default Playlist
