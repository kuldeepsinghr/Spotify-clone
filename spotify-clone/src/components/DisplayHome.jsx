import { useEffect, useState } from 'react'
import { catalogApi } from '../api/catalog.js'
import { libraryApi } from '../api/library.js'
import { apiMessage } from '../api/errors.js'
import AlbumItem from './AlbumItem'
import Navbar from './Navbar'
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

  return (
    <>
      <Navbar />
      {loading ? <StatusMessage body="Loading your home feed…" /> : null}
      {error ? <StatusMessage title="Home is unavailable" body={error} /> : null}

      {!loading && !error && signedIn ? (
        <div className="mb-4">
          <h1 className="my-5 text-2xl font-bold">Recently played</h1>
          {recent.length === 0 ? (
            <p className="text-[#a7a7a7]">Play a song for 30 seconds and it will show up here.</p>
          ) : (
            <div className="flex overflow-auto">
              {recent.map((item, index) => (
                <SongItem key={item.id} track={item} tracks={recent} index={index} />
              ))}
            </div>
          )}
        </div>
      ) : null}

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
