import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { catalogApi } from '../api/catalog.js'
import { libraryApi } from '../api/library.js'
import { apiMessage } from '../api/errors.js'
import AlbumItem from './AlbumItem'
import Navbar from './Navbar'
import PlaylistArt from './PlaylistArt'
import SongItem from './SongItem'
import StatusMessage from './StatusMessage'
import { useAuth } from '../context/AuthContext.jsx'
import { useLibrary } from '../context/LibraryContext.jsx'

const uniqueTracks = (rows) => {
  const seen = new Set()
  const tracks = []
  for (const row of rows) {
    const track = row.track
    if (!track || seen.has(track.id)) continue
    seen.add(track.id)
    tracks.push(track)
  }
  return tracks
}

/* eslint-disable react/prop-types */
const SignedInHome = ({ albums, recent, loading, error, name }) => {
  const navigate = useNavigate()
  const { playlists, likeCount } = useLibrary()
  const [section, setSection] = useState('all')
  const quick = [
    { key: 'liked', title: 'Liked Songs', subtitle: `${likeCount} songs`, image: null, images: [], liked: true, to: '/liked' },
    ...playlists.slice(0, 3).map((playlist) => ({
      key: playlist.id,
      title: playlist.name,
      subtitle: 'Playlist',
      image: playlist.coverUrl,
      images: playlist.previewImages ?? [],
      to: `/playlist/${playlist.id}`,
    })),
    ...albums.slice(0, 4).map((album) => ({
      key: album.id,
      title: album.title,
      subtitle: album.artist?.name || 'Album',
      image: album.coverUrl,
      images: [],
      to: `/album/${album.id}`,
    })),
  ].slice(0, 8)

  return (
    <>
      <Navbar />
      <div className="flex gap-2 mt-4">
        {[
          ['all', 'All'],
          ['music', 'Music'],
          ['podcasts', 'Podcasts'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={`rounded-full px-4 py-1 text-sm ${
              section === id ? 'bg-white text-black' : 'bg-[#232323] text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? <StatusMessage body="Loading your home feed…" /> : null}
      {error ? <StatusMessage title="Home is unavailable" body={error} /> : null}

      {!loading && !error && section === 'podcasts' ? (
        <StatusMessage title="No podcasts yet" body="This player has music only. Albums and playlists stay under Music." />
      ) : null}

      {!loading && !error && section !== 'podcasts' ? (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 mt-4">
            {quick.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => navigate(item.to)}
                className="flex items-center gap-3 bg-[#ffffff14] hover:bg-[#ffffff22] rounded overflow-hidden text-left"
              >
                {item.liked ? (
                  <div className="w-14 h-14 bg-gradient-to-br from-[#450af5] to-[#c4efd9] flex items-center justify-center text-xl">
                    ♥
                  </div>
                ) : (
                  <PlaylistArt coverUrl={item.image} images={item.images} className="w-14 h-14 shrink-0" emptyClassName="text-xl" />
                )}
                <div className="min-w-0 pr-2">
                  <p className="font-bold truncate">{item.title}</p>
                  <p className="text-xs text-[#b3b3b3] truncate">{item.subtitle}</p>
                </div>
              </button>
            ))}
          </div>

          {recent.length ? (
            <div className="mt-8">
              <h2 className="text-2xl font-bold">Jump back in</h2>
              <div className="flex overflow-auto mt-3">
                {recent.map((item, index) => (
                  <SongItem key={item.id} track={item} tracks={recent} index={index} />
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-8 mb-6">
            <h1 className="text-2xl font-bold">Made for {name}</h1>
            {albums.length === 0 ? (
              <p className="text-[#b3b3b3] mt-3">Albums you can play will show up here.</p>
            ) : (
              <div className="flex overflow-auto mt-4">
                {albums.slice(0, 10).map((item) => (
                  <AlbumItem
                    key={item.id}
                    id={item.id}
                    name={item.title}
                    desc={item.artist?.name || item.description}
                    image={item.coverUrl}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </>
  )
}

const DisplayHome = () => {
  const { signedIn, user } = useAuth()
  const { primeLikes } = useLibrary()
  const [albums, setAlbums] = useState([])
  const [tracks, setTracks] = useState([])
  const [recent, setRecent] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    Promise.all([
      catalogApi.listAlbums(),
      catalogApi.listTracks(),
      signedIn ? libraryApi.listHistory({ max: 40 }) : Promise.resolve([]),
    ])
      .then(([nextAlbums, nextTracks, history]) => {
        if (cancelled) return
        setAlbums(nextAlbums)
        setTracks(nextTracks)
        setRecent(uniqueTracks(history))
        primeLikes(nextTracks.map((item) => item.id)).catch(() => {})
      })
      .catch((err) => {
        if (!cancelled) setError(apiMessage(err, 'Could not load the catalog'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [signedIn, user?.id, primeLikes])

  if (signedIn) {
    return (
      <SignedInHome
        albums={albums}
        recent={recent}
        loading={loading}
        error={error}
        name={user?.displayName || 'you'}
      />
    )
  }

  return (
    <>
      <Navbar />
      {loading ? <StatusMessage body="Loading your home feed…" /> : null}
      {error ? <StatusMessage title="Home is unavailable" body={error} /> : null}

      {!loading && !error ? (
        <>
          <div className="mb-4">
            <h1 className="my-5 text-2xl font-bold">Featured Charts</h1>
            {albums.length === 0 ? (
              <p className="text-[#a7a7a7]">No albums yet.</p>
            ) : (
              <div className="flex overflow-auto">
                {albums.map((item) => (
                  <AlbumItem
                    key={item.id}
                    name={item.title}
                    desc={item.description}
                    id={item.id}
                    image={item.coverUrl}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="mb-4">
            <h1 className="my-5 text-2xl font-bold">Today&apos;s biggest hits</h1>
            {tracks.length === 0 ? (
              <p className="text-[#a7a7a7]">No songs yet.</p>
            ) : (
              <div className="flex overflow-auto">
                {tracks.map((item, index) => (
                  <SongItem key={item.id} track={item} tracks={tracks} index={index} />
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </>
  )
}

export default DisplayHome
