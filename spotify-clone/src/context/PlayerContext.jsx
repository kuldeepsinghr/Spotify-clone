import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { libraryApi } from '../api/library.js'
import { useAuth } from './AuthContext.jsx'

export const PlayerContext = createContext()

const REPEAT_MODES = ['off', 'all', 'one']

function shuffleOrder(length, currentIndex) {
  const rest = Array.from({ length }, (_, i) => i).filter((i) => i !== currentIndex)
  for (let i = rest.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[rest[i], rest[j]] = [rest[j], rest[i]]
  }
  return currentIndex >= 0 ? [currentIndex, ...rest] : rest
}

function clock(seconds) {
  const safe = Number.isFinite(seconds) && seconds >= 0 ? seconds : 0
  return { minute: Math.floor(safe / 60), second: Math.floor(safe % 60) }
}

const PlayerContextProvider = (props) => {
  const { ready, signedIn } = useAuth()
  const audioRef = useRef(null)
  const seekBg = useRef(null)
  const seekBar = useRef(null)
  const shouldAutoplay = useRef(false)
  const pendingSeekMs = useRef(null)
  const userStarted = useRef(false)
  const historySent = useRef(false)
  const trackRef = useRef(null)
  const queueRef = useRef([])
  const orderRef = useRef([0])
  const indexRef = useRef(0)
  const shuffleRef = useRef(false)
  const repeatRef = useRef('off')

  const [track, setTrack] = useState(null)
  const [queue, setQueue] = useState([])
  const [playOrder, setPlayOrder] = useState([0])
  const [queueIndex, setQueueIndex] = useState(0)
  const [playStatus, setPlayStatus] = useState(false)
  const [volume, setVolume] = useState(80)
  const [muted, setMuted] = useState(false)
  const [lastVolume, setLastVolume] = useState(80)
  const [shuffle, setShuffle] = useState(false)
  const [repeatMode, setRepeatMode] = useState('off')
  const [showQueue, setShowQueue] = useState(false)
  const [time, setTime] = useState({
    currentTime: { second: 0, minute: 0 },
    totalTime: { second: 0, minute: 0 },
  })

  trackRef.current = track
  queueRef.current = queue
  orderRef.current = playOrder
  indexRef.current = queueIndex
  shuffleRef.current = shuffle
  repeatRef.current = repeatMode

  const applyTrack = useCallback((nextTrack, nextQueue, nextIndex, nextOrder, autoplay) => {
    shouldAutoplay.current = autoplay
    historySent.current = false
    setQueue(nextQueue)
    setQueueIndex(nextIndex)
    setPlayOrder(nextOrder)
    setTrack(nextTrack)
  }, [])

  const playTracks = useCallback(
    (list, startIndex = 0) => {
      const tracks = (list ?? []).filter(Boolean)
      if (!tracks.length) return
      const index = Math.min(Math.max(startIndex, 0), tracks.length - 1)
      userStarted.current = true
      const order = shuffleRef.current ? shuffleOrder(tracks.length, index) : tracks.map((_, i) => i)
      applyTrack(tracks[index], tracks, index, order, true)
    },
    [applyTrack],
  )

  const playTrack = useCallback(
    (selected) => {
      if (!selected) return
      const current = queueRef.current
      const existing = current.findIndex((item) => item.id === selected.id)
      if (existing >= 0) {
        userStarted.current = true
        const order = shuffleRef.current ? shuffleOrder(current.length, existing) : current.map((_, i) => i)
        applyTrack(current[existing], current, existing, order, true)
        return
      }
      playTracks([selected], 0)
    },
    [applyTrack, playTracks],
  )

  const play = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !trackRef.current?.audioUrl) return
    audio.play().then(() => setPlayStatus(true)).catch(() => setPlayStatus(false))
  }, [])

  const pause = useCallback(() => {
    audioRef.current?.pause()
    setPlayStatus(false)
  }, [])

  const togglePlay = useCallback(() => {
    if (playStatus) pause()
    else play()
  }, [play, pause, playStatus])

  const jumpTo = useCallback(
    (queuePos) => {
      const next = queueRef.current[queuePos]
      if (!next) return
      userStarted.current = true
      applyTrack(next, queueRef.current, queuePos, orderRef.current, true)
    },
    [applyTrack],
  )

  const step = useCallback(
    (direction) => {
      const list = queueRef.current
      if (!list.length) return
      if (repeatRef.current === 'one' && direction === 1 && trackRef.current) {
        const audio = audioRef.current
        if (audio) {
          audio.currentTime = 0
          play()
        }
        return
      }
      const order = orderRef.current
      const pos = order.indexOf(indexRef.current)
      let nextPos = pos + direction
      if (nextPos < 0) {
        if (repeatRef.current === 'all') nextPos = order.length - 1
        else {
          const audio = audioRef.current
          if (audio) audio.currentTime = 0
          return
        }
      }
      if (nextPos >= order.length) {
        if (repeatRef.current === 'all') nextPos = 0
        else {
          pause()
          return
        }
      }
      jumpTo(order[nextPos])
    },
    [jumpTo, pause, play],
  )

  const next = useCallback(() => step(1), [step])
  const previous = useCallback(() => {
    const audio = audioRef.current
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }
    step(-1)
  }, [step])

  const seekSong = useCallback((e) => {
    const audio = audioRef.current
    if (!audio || !seekBg.current || !Number.isFinite(audio.duration) || audio.duration <= 0) return
    const percent = e.nativeEvent.offsetX / seekBg.current.offsetWidth
    audio.currentTime = percent * audio.duration
    if (shouldAutoplay.current || playStatus) {
      audio.play().then(() => setPlayStatus(true)).catch(() => setPlayStatus(false))
    }
  }, [playStatus])

  const setVolumeLevel = useCallback((value) => {
    const next = Math.min(100, Math.max(0, Math.round(value)))
    setVolume(next)
    setMuted(next === 0)
    if (next > 0) setLastVolume(next)
  }, [])

  const toggleMute = useCallback(() => {
    if (muted || volume === 0) {
      const restored = lastVolume || 80
      setVolume(restored)
      setMuted(false)
    } else {
      setLastVolume(volume)
      setVolume(0)
      setMuted(true)
    }
  }, [muted, volume, lastVolume])

  const toggleShuffle = useCallback(() => {
    setShuffle((on) => {
      const next = !on
      const length = queueRef.current.length
      setPlayOrder(next ? shuffleOrder(length, indexRef.current) : queueRef.current.map((_, i) => i))
      return next
    })
  }, [])

  const cycleRepeat = useCallback(() => {
    setRepeatMode((mode) => REPEAT_MODES[(REPEAT_MODES.indexOf(mode) + 1) % REPEAT_MODES.length])
  }, [])

  const addToQueue = useCallback((item) => {
    if (!item) return
    setQueue((current) => {
      if (current.some((row) => row.id === item.id)) return current
      const next = current.length ? [...current, item] : [item]
      setPlayOrder((order) => (current.length ? [...order, next.length - 1] : [0]))
      if (!current.length) {
        shouldAutoplay.current = false
        setTrack(item)
        setQueueIndex(0)
      }
      return next
    })
  }, [])

  const playNext = useCallback((item) => {
    if (!item) return
    setQueue((current) => {
      const without = current.filter((row) => row.id !== item.id)
      if (!without.length) {
        setPlayOrder([0])
        setQueueIndex(0)
        shouldAutoplay.current = true
        userStarted.current = true
        setTrack(item)
        return [item]
      }
      const insertAt = indexRef.current + 1
      const next = [...without.slice(0, insertAt), item, ...without.slice(insertAt)]
      const currentId = trackRef.current?.id
      const newIndex = currentId ? next.findIndex((row) => row.id === currentId) : 0
      setQueueIndex(Math.max(0, newIndex))
      setPlayOrder(shuffleRef.current ? shuffleOrder(next.length, Math.max(0, newIndex)) : next.map((_, i) => i))
      return next
    })
  }, [])

  const removeFromQueue = useCallback((id) => {
    setQueue((current) => {
      const next = current.filter((row) => row.id !== id)
      if (!next.length) {
        setTrack(null)
        setQueueIndex(0)
        setPlayOrder([0])
        pause()
        return []
      }
      const currentId = trackRef.current?.id
      let newIndex = next.findIndex((row) => row.id === currentId)
      if (newIndex < 0) {
        newIndex = Math.min(indexRef.current, next.length - 1)
        shouldAutoplay.current = playStatus
        setTrack(next[newIndex])
      }
      setQueueIndex(newIndex)
      setPlayOrder(shuffleRef.current ? shuffleOrder(next.length, newIndex) : next.map((_, i) => i))
      return next
    })
  }, [pause, playStatus])

  const moveInQueue = useCallback((from, to) => {
    setQueue((current) => {
      if (from === to || from < 0 || to < 0 || from >= current.length || to >= current.length) return current
      const next = [...current]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      const currentId = trackRef.current?.id
      const newIndex = currentId ? next.findIndex((row) => row.id === currentId) : 0
      setQueueIndex(Math.max(0, newIndex))
      setPlayOrder(shuffleRef.current ? shuffleOrder(next.length, Math.max(0, newIndex)) : next.map((_, i) => i))
      return next
    })
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) audio.volume = volume / 100
  }, [volume])

  useEffect(() => {
    if (!ready || !signedIn) return
    let cancelled = false
    libraryApi
      .getPlayer()
      .then((state) => {
        if (cancelled) return
        setVolume(state.volume ?? 80)
        setMuted((state.volume ?? 80) === 0)
        if ((state.volume ?? 80) > 0) setLastVolume(state.volume)
        setShuffle(Boolean(state.shuffle))
        setRepeatMode(state.repeatMode ?? 'off')
        if (state.lastTrack && !userStarted.current) {
          pendingSeekMs.current = state.positionMs ?? 0
          shouldAutoplay.current = false
          setTrack(state.lastTrack)
          setQueue([state.lastTrack])
          setQueueIndex(0)
          setPlayOrder([0])
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [ready, signedIn])

  useEffect(() => {
    if (!signedIn) return
    const handle = setTimeout(() => {
      libraryApi
        .patchPlayer({
          lastTrackId: track?.id ?? null,
          positionMs: Math.round((audioRef.current?.currentTime ?? 0) * 1000),
          volume,
          repeatMode,
          shuffle,
        })
        .catch(() => {})
    }, 800)
    return () => clearTimeout(handle)
  }, [signedIn, track?.id, volume, repeatMode, shuffle])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (!track?.audioUrl) {
      audio.removeAttribute('src')
      audio.load()
      setPlayStatus(false)
      return
    }
    audio.src = track.audioUrl
    const seek = pendingSeekMs.current
    pendingSeekMs.current = null
    const start = () => {
      if (Number.isFinite(seek) && seek > 0) audio.currentTime = seek / 1000
      if (shouldAutoplay.current) {
        audio.play().then(() => setPlayStatus(true)).catch(() => setPlayStatus(false))
      } else {
        setPlayStatus(false)
      }
    }
    if (audio.readyState >= 1) start()
    else audio.addEventListener('loadedmetadata', start, { once: true })
  }, [track])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const maybeRecord = () => {
      const current = trackRef.current
      if (!signedIn || !current || historySent.current) return
      const playedMs = Math.round(audio.currentTime * 1000)
      if (playedMs < 15_000) return
      historySent.current = true
      libraryApi.recordPlay({ trackId: current.id, playedMs }).catch(() => {
        historySent.current = false
      })
    }

    const updateTime = () => {
      if (seekBar.current && Number.isFinite(audio.duration) && audio.duration > 0) {
        seekBar.current.style.width = `${Math.floor((audio.currentTime / audio.duration) * 100)}%`
      }
      setTime({
        currentTime: clock(audio.currentTime),
        totalTime: clock(audio.duration),
      })
      maybeRecord()
    }

    const onEnded = () => {
      maybeRecord()
      if (repeatRef.current === 'one') {
        audio.currentTime = 0
        play()
        return
      }
      step(1)
    }

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('ended', onEnded)
    }
  }, [signedIn, play, step])

  useEffect(() => {
    const onKey = (event) => {
      const tag = event.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target?.isContentEditable) return
      if (event.code === 'Space') {
        event.preventDefault()
        if (playStatus) pause()
        else play()
      } else if (event.code === 'ArrowRight') {
        event.preventDefault()
        next()
      } else if (event.code === 'ArrowLeft') {
        event.preventDefault()
        previous()
      } else if (event.key === 'm' || event.key === 'M') {
        toggleMute()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [play, pause, next, previous, toggleMute, playStatus])

  const contextValue = useMemo(
    () => ({
      audioRef,
      seekBar,
      seekBg,
      track,
      queue,
      queueIndex,
      playStatus,
      time,
      volume,
      muted,
      shuffle,
      repeatMode,
      showQueue,
      setShowQueue,
      play,
      pause,
      togglePlay,
      playTrack,
      playTracks,
      previous,
      next,
      seekSong,
      setVolumeLevel,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      addToQueue,
      playNext,
      removeFromQueue,
      moveInQueue,
    }),
    [
      track,
      queue,
      queueIndex,
      playStatus,
      time,
      volume,
      muted,
      shuffle,
      repeatMode,
      showQueue,
      play,
      pause,
      togglePlay,
      playTrack,
      playTracks,
      previous,
      next,
      seekSong,
      setVolumeLevel,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      addToQueue,
      playNext,
      removeFromQueue,
      moveInQueue,
    ],
  )

  return (
    // eslint-disable-next-line react/prop-types -- provider children
    <PlayerContext.Provider value={contextValue}>{props.children}</PlayerContext.Provider>
  )
}

export default PlayerContextProvider
