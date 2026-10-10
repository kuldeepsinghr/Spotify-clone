import { useContext, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Navbar from './Navbar'
import { assets } from '../assets/assets'
import { catalogApi } from '../api/catalog.js'
import { formatDuration } from '../api/errors.js'
import { useAuth } from '../context/AuthContext.jsx'
import { PlayerContext } from '../context/PlayerContext'

const DisplayAlbum = () => {
  const { id } = useParams()
  const { playTrack } = useContext(PlayerContext)
  const { user } = useAuth()
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
      })
      .catch(() => {
        if (!cancelled) setError('Album not found')
      })
    return () => {
      cancelled = true
    }
  }, [id, user?.id])

  if (error) {
    return (
      <>
        <Navbar />
        <p className="mt-10 text-[#a7a7a7]">{error}</p>
      </>
    )
  }

  if (!album) {
    return (
      <>
        <Navbar />
        <p className="mt-10 text-[#a7a7a7]">Loading album…</p>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="mt-10 flex gap-8 flex-col md:flex-row md:items-end">
        <img src={album.coverUrl} alt="" className="w-48 rounded" />
        <div className="flex flex-col">
          <p>Album</p>
          <h2 className="text-5xl font-bold mb-4 md:text-7xl">{album.title}</h2>
          <h4>{album.description}</h4>
          <p className="mt-1">
            <img src={assets.spotify_logo} alt="" className="inline-block w-5" />
            <b className="ml-1">{album.artist?.name}</b>
            {' · '}
            <b>{album.trackCount} songs</b>
            {album.totalDurationMs ? `, ${formatDuration(album.totalDurationMs)}` : null}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 mt-10 mb-4 pl-2 text-[#a7a7a7]">
        <p>
          <b className="mr-4">#</b>Title
        </p>
        <p>Album</p>
        <p className="hidden sm:block">Artist</p>
        <img src={assets.clock_icon} alt="" className="m-auto w-4" />
      </div>
      <hr />

      {tracks.map((item, index) => (
        <div
          key={item.id}
          onClick={() => playTrack(item)}
          className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-2 text-[#a7a7a7] items-center hover:bg-[#ffffff2b] cursor-pointer"
        >
          <p className="text-white">
            <b className="mr-4 text-[#a7a7a7]">{index + 1}</b>
            <img src={item.imageUrl} alt="" className="inline w-10 mr-5" />
            {item.title}
          </p>
          <p className="text-[15px]">{album.title}</p>
          <p className="text-[15px] hidden sm:block">{item.artist?.name}</p>
          <p className="text-[15px] text-center">{formatDuration(item.durationMs)}</p>
        </div>
      ))}
    </>
  )
}

export default DisplayAlbum
