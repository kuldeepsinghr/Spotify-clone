import { useEffect, useState } from 'react'
import { catalogApi } from '../api/catalog.js'
import { libraryApi } from '../api/library.js'

const asList = (value) => (Array.isArray(value) ? value : value?.items ?? [])

/* eslint-disable react/prop-types */
const AddButton = ({ added, busy, onClick }) => (
  <button
    type="button"
    disabled={added || busy}
    onClick={onClick}
    className={`rounded-full border px-4 py-1 text-sm font-bold ${
      added ? 'border-[#1db954] text-[#1db954]' : 'border-[#727272] hover:border-white hover:scale-105'
    }`}
  >
    {added ? 'Added' : 'Add'}
  </button>
)

const Art = ({ src, round = false }) =>
  src ? (
    <img src={src} alt="" className={`w-10 h-10 object-cover bg-[#282828] ${round ? 'rounded-full' : ''}`} />
  ) : (
    <div className={`w-10 h-10 bg-[#282828] ${round ? 'rounded-full' : ''}`} />
  )

const SongRow = ({ track, added, busy, onAdd }) => (
  <div className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto] gap-3 items-center p-2 rounded hover:bg-[#ffffff14]">
    <Art src={track.imageUrl} />
    <div className="min-w-0">
      <p className="truncate">{track.title}</p>
      <p className="text-sm text-[#b3b3b3] truncate">{track.artist?.name}</p>
    </div>
    <p className="hidden sm:block text-sm text-[#b3b3b3] truncate">{track.album?.title}</p>
    <AddButton added={added} busy={busy} onClick={() => onAdd(track)} />
  </div>
)

const PlaylistAdd = ({ playlistId, memberIds, onAdded }) => {
  const [query, setQuery] = useState('')
  const [artists, setArtists] = useState([])
  const [albums, setAlbums] = useState([])
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(false)
  const [focus, setFocus] = useState(null)
  const [focusTracks, setFocusTracks] = useState([])
  const [focusLoading, setFocusLoading] = useState(false)
  const [added, setAdded] = useState(() => new Set(memberIds))
  const [busyId, setBusyId] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    setAdded(new Set(memberIds))
  }, [memberIds])

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setArtists([])
      setAlbums([])
      setTracks([])
      setLoading(false)
      return undefined
    }
    let cancelled = false
    setLoading(true)
    const timer = setTimeout(() => {
      catalogApi
        .search({ q, type: 'all', limit: 8 })
        .then((data) => {
          if (cancelled) return
          setArtists(data.artists?.items ?? [])
          setAlbums(data.albums?.items ?? [])
          setTracks(data.tracks?.items ?? [])
        })
        .catch(() => {
          if (cancelled) return
          setArtists([])
          setAlbums([])
          setTracks([])
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  const openArtist = async (artist) => {
    setFocus({ kind: 'artist', name: artist.name })
    setFocusTracks([])
    setFocusLoading(true)
    setNote('')
    try {
      let songs = asList(await catalogApi.artistTopTracks(artist.id, 10))
      if (songs.length === 0) {
        const albums = asList(await catalogApi.artistAlbums(artist.id)).slice(0, 6)
        const pages = await Promise.all(albums.map((album) => catalogApi.albumTracks(album.id)))
        const seen = new Set()
        songs = pages.flatMap(asList).filter((track) => {
          if (!track?.id || seen.has(track.id)) return false
          seen.add(track.id)
          return true
        })
      }
      setFocusTracks(songs)
    } catch {
      setNote('Could not load this artist')
    } finally {
      setFocusLoading(false)
    }
  }

  const openAlbum = async (album) => {
    setFocus({ kind: 'album', name: album.title })
    setFocusTracks([])
    setFocusLoading(true)
    setNote('')
    try {
      setFocusTracks(asList(await catalogApi.albumTracks(album.id)))
    } catch {
      setNote('Could not load this album')
    } finally {
      setFocusLoading(false)
    }
  }

  const add = async (track) => {
    if (added.has(track.id) || busyId) return
    setBusyId(track.id)
    setNote('')
    try {
      await libraryApi.addPlaylistTrack(playlistId, track.id)
      setAdded((current) => new Set(current).add(track.id))
      onAdded()
    } catch (error) {
      if (error?.response?.status === 409) {
        setAdded((current) => new Set(current).add(track.id))
        setNote(error?.response?.data?.error?.message || 'Already in this playlist')
      } else {
        setNote('Could not add that song')
      }
    } finally {
      setBusyId('')
    }
  }

  const q = query.trim()
  const nothing = !loading && q && !focus && artists.length + albums.length + tracks.length === 0

  return (
    <section className="mt-10 pb-8">
      <h2 className="text-2xl font-bold">Let&apos;s find something for your playlist</h2>
      <div className="relative mt-4 w-full max-w-md">
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setFocus(null)
          }}
          placeholder="Search for songs or artists"
          autoFocus
          className="w-full bg-[#282828] rounded px-3 py-2 pr-8 text-sm outline-none focus:ring-2 focus:ring-white"
        />
        {q ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery('')
              setFocus(null)
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#b3b3b3] hover:text-white"
          >
            ×
          </button>
        ) : null}
      </div>
      {note ? <p className="mt-3 text-sm text-[#b3b3b3]">{note}</p> : null}

      {focus ? (
        <div className="mt-4">
          <button type="button" onClick={() => setFocus(null)} className="flex items-center gap-2 font-bold hover:underline">
            <span aria-hidden="true">‹</span>
            {focus.name}
          </button>
          <p className="mt-4 mb-2 text-sm font-bold">{focus.kind === 'artist' ? 'Popular songs' : 'Songs'}</p>
          {focusLoading ? <p className="text-sm text-[#b3b3b3]">Loading songs…</p> : null}
          {!focusLoading && focusTracks.length === 0 ? (
            <p className="text-sm text-[#b3b3b3]">No songs to add.</p>
          ) : null}
          {focusTracks.map((track) => (
            <SongRow key={track.id} track={track} added={added.has(track.id)} busy={busyId === track.id} onAdd={add} />
          ))}
        </div>
      ) : (
        <>
          {loading ? <p className="mt-4 text-sm text-[#b3b3b3]">Searching…</p> : null}
          {nothing ? <p className="mt-4 text-sm text-[#b3b3b3]">No results for “{q}”.</p> : null}
          <div className="mt-2">
            {artists.map((artist) => (
              <button
                key={artist.id}
                type="button"
                onClick={() => openArtist(artist)}
                className="w-full grid grid-cols-[auto_1fr_auto] gap-3 items-center p-2 rounded hover:bg-[#ffffff14] text-left"
              >
                <Art src={artist.imageUrl} round />
                <div className="min-w-0">
                  <p className="truncate">{artist.name}</p>
                  <p className="text-sm text-[#b3b3b3]">Artist</p>
                </div>
                <span className="text-[#b3b3b3]" aria-hidden="true">
                  ›
                </span>
              </button>
            ))}
            {albums.map((album) => (
              <button
                key={album.id}
                type="button"
                onClick={() => openAlbum(album)}
                className="w-full grid grid-cols-[auto_1fr_auto] gap-3 items-center p-2 rounded hover:bg-[#ffffff14] text-left"
              >
                <Art src={album.coverUrl} />
                <div className="min-w-0">
                  <p className="truncate">{album.title}</p>
                  <p className="text-sm text-[#b3b3b3] truncate">Album{album.artist?.name ? ` · ${album.artist.name}` : ''}</p>
                </div>
                <span className="text-[#b3b3b3]" aria-hidden="true">
                  ›
                </span>
              </button>
            ))}
            {tracks.map((track) => (
              <SongRow key={track.id} track={track} added={added.has(track.id)} busy={busyId === track.id} onAdd={add} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

export default PlaylistAdd
