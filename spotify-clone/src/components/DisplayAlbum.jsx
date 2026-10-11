import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Navbar from './Navbar'
import StatusMessage from './StatusMessage'
import TrackRow from './TrackRow'
import { assets } from '../assets/assets'
import { catalogApi } from '../api/catalog.js'
import { apiMessage, formatDuration } from '../api/errors.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useLibrary } from '../context/LibraryContext.jsx'
import { usePlayer } from '../hooks/usePlayer.js'

const DisplayAlbum = () => {
  const { id } = useParams()
  const { playTracks } = usePlayer()
  const { user } = useAuth()
  const { primeLikes } = useLibrary()
  const [album, setAlbum] = useState(null)
  const [tracks, setTracks] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setAlbum(null)
    setError('')
    Promise.all([catalogApi.getAlbum(id), catalogApi.albumTracks(id)])
      .then(([nextAlbum, nextTracks]) => {
        if (cancelled) return
        setAlbum(nextAlbum)
        setTracks(nextTracks)
        primeLikes(nextTracks.map((item) => item.id)).catch(() => {})
      })
      .catch((err) => {
        if (!cancelled) setError(apiMessage(err, 'Album not found'))
      })
    return () => {
      cancelled = true
    }
  }, [id, user?.id, primeLikes])

  if (error) {
    return (
      <>
        <Navbar />
        <StatusMessage title="Album not found" body={error} />
      </>
    )
  }

  if (!album) {
    return (
      <>
        <Navbar />
        <StatusMessage body="Loading album…" />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div
        className="mt-6 -mx-6 px-6 pt-10 pb-6"
        style={{ background: `linear-gradient(${album.bgColor || '#535353'}, #121212)` }}
      >
        <div className="flex gap-8 flex-col md:flex-row md:items-end">
          <img src={album.coverUrl} alt="" className="w-48 rounded" />
          <div className="flex flex-col">
            <p className="capitalize">{album.type || 'Album'}{album.explicit ? ' · Explicit' : ''}</p>
            <h2 className="text-5xl font-bold mb-4 md:text-7xl">{album.title}</h2>
            <h4>{album.description}</h4>
            <p className="mt-1">
              <img src={assets.spotify_logo} alt="" className="inline-block w-5" />
              {album.artist?.id ? (
                <Link to={`/artist/${album.artist.id}`} className="ml-1 font-bold hover:underline">
                  {album.artist.name}
                </Link>
              ) : (
                <b className="ml-1">{album.artist?.name}</b>
              )}
              {' · '}
              <b>{album.trackCount} songs</b>
              {album.totalDurationMs ? `, ${formatDuration(album.totalDurationMs)}` : null}
              {album.releasedAt ? ` · ${String(album.releasedAt).slice(0, 4)}` : null}
            </p>
            {album.copyrightC || album.copyrightP ? (
              <p className="text-xs text-[#a7a7a7] mt-2">
                {album.copyrightC ? `© ${album.copyrightC}` : null}
                {album.copyrightC && album.copyrightP ? ' · ' : null}
                {album.copyrightP ? `℗ ${album.copyrightP}` : null}
              </p>
            ) : null}
            {tracks.length ? (
              <button
                type="button"
                onClick={() => playTracks(tracks, 0, { type: 'album', id })}
                className="mt-4 w-fit bg-green-500 text-black font-bold rounded-full px-6 py-2"
              >
                Play
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {tracks.length === 0 ? (
        <StatusMessage body="This album has no tracks yet." />
      ) : (
        <div className="mt-4 pb-8">
          {tracks.map((item, index) => (
            <TrackRow
              key={item.id}
              track={item}
              index={index}
              albumTitle={album.title}
              onPlay={() => playTracks(tracks, index, { type: 'album', id })}
            />
          ))}
        </div>
      )}
    </>
  )
}

export default DisplayAlbum
