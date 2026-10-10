import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiMessage, formatDuration } from '../api/errors.js'
import { libraryApi } from '../api/library.js'
import { assets } from '../assets/assets'
import Navbar from '../components/Navbar'
import PlaylistAdd from '../components/PlaylistAdd'
import PlaylistArt from '../components/PlaylistArt'
import PlaylistDetails from '../components/PlaylistDetails'
import { coverImages, usePlaylistColor } from '../components/playlistColor.js'
import StatusMessage from '../components/StatusMessage'
import TrackRow from '../components/TrackRow'
import { useAuth } from '../context/AuthContext.jsx'
import { useLibrary } from '../context/LibraryContext.jsx'
import { usePlayer } from '../hooks/usePlayer.js'

const Playlist = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, signedIn } = useAuth()
  const { playTracks } = usePlayer()
  const { removePlaylist, refreshPlaylists, primeLikes } = useLibrary()
  const [playlist, setPlaylist] = useState(null)
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const isOwner = user && playlist && (user.id === playlist.owner?.id || user.role === 'admin')

  useEffect(() => {
    let cancelled = false
    setPlaylist(null)
    setError('')
    Promise.all([libraryApi.getPlaylist(id), libraryApi.listPlaylistTracks(id)])
      .then(([next, tracks]) => {
        if (cancelled) return
        setPlaylist(next)
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
  const memberIds = useMemo(() => rows.map((row) => row.track.id), [rows])
  const images = useMemo(() => coverImages(rows.map((row) => row.track)), [rows])
  const headerColor = usePlaylistColor(playlist?.id, playlist?.coverUrl || images[0])

  const reload = async () => {
    const [next, nextRows] = await Promise.all([libraryApi.getPlaylist(id), libraryApi.listPlaylistTracks(id)])
    setPlaylist(next)
    setRows(nextRows)
    refreshPlaylists().catch(() => {})
  }

  const removeTrack = async (track) => {
    await libraryApi.removePlaylistTrack(id, track.id)
    setRows((current) => current.filter((row) => row.track.id !== track.id))
    libraryApi
      .getPlaylist(id)
      .then(setPlaylist)
      .catch(() => {})
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
      <div
        className={signedIn ? '-mx-4 -mt-3 px-4 pt-3 pb-6' : '-mx-6 -mt-4 px-6 pt-4 pb-6'}
        style={{ background: `linear-gradient(180deg, ${headerColor} 0%, transparent 100%)` }}
      >
      <Navbar />
      <div className="mt-6 flex gap-6 flex-col md:flex-row md:items-end">
        <PlaylistArt
          coverUrl={playlist.coverUrl}
          images={images}
          className="w-48 h-48 rounded shadow-2xl shrink-0"
          emptyClassName="text-6xl"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm">{playlist.isPublic ? 'Public playlist' : 'Private playlist'}</p>
          <h1 className="text-5xl font-black mt-2 mb-4 md:text-7xl break-words">{playlist.name}</h1>
          {playlist.description ? <p className="text-[#b3b3b3] mb-2">{playlist.description}</p> : null}
          <p className="text-sm">
            <span className="font-bold">{playlist.owner?.displayName}</span>
            <span className="text-[#a7a7a7]">
              {' · '}
              {playlist.trackCount} songs
              {playlist.totalDurationMs ? ` · ${formatDuration(playlist.totalDurationMs)}` : ''}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        {tracks.length > 0 ? (
          <button
            type="button"
            onClick={() => playTracks(tracks, 0)}
            title="Play"
            className="w-14 h-14 rounded-full bg-[#1db954] flex items-center justify-center"
          >
            <img src={assets.play_icon} alt="" className="w-5 brightness-0" />
          </button>
        ) : null}
        {isOwner ? (
          <>
            <button
              type="button"
              onClick={() => setAdding((open) => !open)}
              className={`rounded-full border px-4 py-1.5 text-sm font-bold ${
                adding ? 'border-white' : 'border-[#727272] hover:border-white'
              }`}
            >
              + Add
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-full border border-[#727272] px-4 py-1.5 text-sm font-bold hover:border-white"
            >
              Name and details
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="text-2xl leading-none px-2 text-[#b3b3b3] hover:text-white"
                aria-label="More options"
              >
                ···
              </button>
              {menuOpen ? (
                <div className="absolute left-0 top-8 z-20 w-44 bg-[#282828] rounded shadow-lg p-1">
                  <button
                    type="button"
                    onClick={destroy}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-[#ffffff14] rounded"
                  >
                    Delete playlist
                  </button>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
      </div>

      {tracks.length === 0 ? (
        <StatusMessage
          title="This playlist is empty"
          body={isOwner ? 'Find songs with Add, or change the name and description.' : 'No songs in this playlist yet.'}
        />
      ) : (
        <div className="mt-6">
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

      {isOwner && adding ? <PlaylistAdd playlistId={id} memberIds={memberIds} onAdded={reload} /> : null}
      {editing ? (
        <PlaylistDetails
          playlist={playlist}
          images={images}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            setPlaylist((current) => ({ ...current, ...updated }))
            setEditing(false)
            libraryApi
              .getPlaylist(id)
              .then(setPlaylist)
              .catch(() => {})
            refreshPlaylists().catch(() => {})
          }}
        />
      ) : null}
    </>
  )
}

export default Playlist
