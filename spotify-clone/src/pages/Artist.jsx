import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { catalogApi } from '../api/catalog.js'
import { apiMessage } from '../api/errors.js'
import AlbumItem from '../components/AlbumItem'
import Navbar from '../components/Navbar'
import StatusMessage from '../components/StatusMessage'
import TrackRow from '../components/TrackRow'
import { useAuth } from '../context/AuthContext.jsx'
import { useLibrary } from '../context/LibraryContext.jsx'
import { usePlayer } from '../hooks/usePlayer.js'

const Artist = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const { playTracks } = usePlayer()
  const { primeLikes } = useLibrary()
  const [artist, setArtist] = useState(null)
  const [albums, setAlbums] = useState([])
  const [tracks, setTracks] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setArtist(null)
    setError('')
    Promise.all([catalogApi.getArtist(id), catalogApi.artistAlbums(id), catalogApi.artistTopTracks(id)])
      .then(([next, nextAlbums, nextTracks]) => {
        if (cancelled) return
        setArtist(next)
        setAlbums(nextAlbums)
        setTracks(nextTracks)
        primeLikes(nextTracks.map((item) => item.id)).catch(() => {})
      })
      .catch((err) => {
        if (!cancelled) setError(apiMessage(err, 'Artist not found'))
      })
    return () => {
      cancelled = true
    }
  }, [id, user?.id, primeLikes])

  if (error) {
    return (
      <>
        <Navbar />
        <StatusMessage title="Artist not found" body={error} />
      </>
    )
  }

  if (!artist) {
    return (
      <>
        <Navbar />
        <StatusMessage body="Loading artist…" />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="mt-10 flex gap-8 flex-col md:flex-row md:items-end">
        <img
          src={artist.imageUrl}
          alt=""
          className="w-48 h-48 rounded-full object-cover bg-[#282828]"
        />
        <div>
          <p>Artist</p>
          <h1 className="text-5xl font-bold mb-4 md:text-7xl">{artist.name}</h1>
          {artist.bio ? <p className="text-[#a7a7a7] max-w-2xl">{artist.bio}</p> : null}
        </div>
      </div>

      {tracks.length ? (
        <section className="mt-10">
          <h2 className="text-2xl font-bold mb-3">Popular</h2>
          {tracks.map((item, index) => (
            <TrackRow key={item.id} track={item} index={index} onPlay={() => playTracks(tracks, index)} />
          ))}
        </section>
      ) : (
        <StatusMessage body="No popular tracks yet." />
      )}

      <section className="mt-10 pb-8">
        <h2 className="text-2xl font-bold mb-3">Albums</h2>
        {albums.length === 0 ? (
          <p className="text-[#a7a7a7]">No albums yet.</p>
        ) : (
          <div className="flex overflow-auto">
            {albums.map((item) => (
              <AlbumItem
                key={item.id}
                id={item.id}
                name={item.title}
                desc={item.description}
                image={item.coverUrl}
              />
            ))}
          </div>
        )}
      </section>
    </>
  )
}

export default Artist
