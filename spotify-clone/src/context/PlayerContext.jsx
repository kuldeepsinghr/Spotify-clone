import { createContext, useEffect, useRef, useState } from 'react'
import { catalogApi } from '../api/catalog.js'
import { useAuth } from './AuthContext.jsx'

export const PlayerContext = createContext()

// eslint-disable-next-line react/prop-types -- provider children
const PlayerContextProvider = (props) => {
  const { ready, user } = useAuth()
  const audioRef = useRef(null)
  const seekBg = useRef(null)
  const seekBar = useRef(null)

  const [songsData, setSongData] = useState([])
  const [albumData, setAlbumData] = useState([])
  const [track, setTrack] = useState(null)
  const [playStatus, setPlayStatus] = useState(false)
  const [catalogReady, setCatalogReady] = useState(false)
  const [time, setTime] = useState({
    currentTime: { second: 0, minute: 0 },
    totalTime: { second: 0, minute: 0 },
  })

  const play = () => {
    if (!audioRef.current || !track?.audioUrl) return
    audioRef.current.play()
    setPlayStatus(true)
  }

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setPlayStatus(false)
    }
  }

  const playTrack = (selected) => {
    if (selected) setTrack(selected)
  }

  const playWithId = (id) => {
    playTrack(songsData.find((item) => item.id === id))
  }

  const previous = () => {
    if (!track) return
    const index = songsData.findIndex((item) => item.id === track.id)
    if (index > 0) setTrack(songsData[index - 1])
  }

  const next = () => {
    if (!track) return
    const index = songsData.findIndex((item) => item.id === track.id)
    if (index < songsData.length - 1) setTrack(songsData[index + 1])
  }

  const seekSong = (e) => {
    if (!audioRef.current || !seekBg.current || !audioRef.current.duration) return
    const percent = e.nativeEvent.offsetX / seekBg.current.offsetWidth
    audioRef.current.currentTime = percent * audioRef.current.duration
    setPlayStatus(true)
  }

  useEffect(() => {
    if (!ready) return
    Promise.all([catalogApi.listTracks(), catalogApi.listAlbums()])
      .then(([tracks, albums]) => {
        setSongData(tracks)
        setAlbumData(albums)
        setTrack((current) => {
          if (!current) return tracks[0] ?? null
          return tracks.find((item) => item.id === current.id) ?? current
        })
      })
      .catch((error) => {
        console.log('Catalog fetch error:', error)
      })
      .finally(() => setCatalogReady(true))
  }, [ready, user?.id])

  useEffect(() => {
    if (!track || !audioRef.current) return
    if (!track.audioUrl) {
      audioRef.current.removeAttribute('src')
      audioRef.current.load()
      setPlayStatus(false)
      return
    }
    audioRef.current.src = track.audioUrl
    audioRef.current
      .play()
      .then(() => setPlayStatus(true))
      .catch(() => setPlayStatus(false))
  }, [track])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => {
      if (!seekBar.current || !Number.isFinite(audio.duration) || audio.duration <= 0) return
      seekBar.current.style.width = `${Math.floor((audio.currentTime / audio.duration) * 100)}%`
      setTime({
        currentTime: {
          second: Math.floor(audio.currentTime % 60),
          minute: Math.floor(audio.currentTime / 60),
        },
        totalTime: {
          second: Math.floor(audio.duration % 60),
          minute: Math.floor(audio.duration / 60),
        },
      })
    }

    audio.addEventListener('timeupdate', updateTime)
    return () => audio.removeEventListener('timeupdate', updateTime)
  }, [])

  const contextValue = {
    audioRef,
    seekBar,
    seekBg,
    track,
    setTrack,
    playStatus,
    setPlayStatus,
    time,
    play,
    pause,
    playWithId,
    playTrack,
    previous,
    next,
    seekSong,
    songsData,
    albumData,
    catalogReady,
  }

  return <PlayerContext.Provider value={contextValue}>{props.children}</PlayerContext.Provider>
}

export default PlayerContextProvider
