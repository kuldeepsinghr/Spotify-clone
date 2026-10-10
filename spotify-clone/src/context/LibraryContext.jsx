import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { libraryApi } from '../api/library.js'
import { useAuth } from './AuthContext.jsx'

const LibraryContext = createContext(null)

// eslint-disable-next-line react/prop-types -- context wrapper
export function LibraryProvider({ children }) {
  const { ready, signedIn } = useAuth()
  const [playlists, setPlaylists] = useState([])
  const [likedIds, setLikedIds] = useState(() => new Set())
  const [likeCount, setLikeCount] = useState(0)
  const [likeEvent, setLikeEvent] = useState(null)
  const [libraryReady, setLibraryReady] = useState(false)
  const likedIdsRef = useRef(likedIds)
  likedIdsRef.current = likedIds

  const refreshPlaylists = useCallback(async () => {
    if (!signedIn) {
      setPlaylists([])
      return
    }
    setPlaylists(await libraryApi.listMyPlaylists())
  }, [signedIn])

  const refreshLikes = useCallback(async () => {
    if (!signedIn) {
      setLikedIds(new Set())
      setLikeCount(0)
      return
    }
    const items = await libraryApi.listLikes({ max: 500 })
    setLikedIds(new Set(items.map((row) => row.track.id)))
    setLikeCount(items.length)
  }, [signedIn])

  useEffect(() => {
    if (!ready) return
    let cancelled = false
    setLibraryReady(false)
    Promise.all([refreshPlaylists(), refreshLikes()])
      .catch(() => {
        if (!cancelled) {
          setPlaylists([])
          setLikedIds(new Set())
          setLikeCount(0)
        }
      })
      .finally(() => {
        if (!cancelled) setLibraryReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [ready, signedIn, refreshPlaylists, refreshLikes])

  const primeLikes = useCallback(
    async (ids) => {
      if (!signedIn || !ids?.length) return
      const map = await libraryApi.contains(ids)
      setLikedIds((prev) => {
        const next = new Set(prev)
        for (const [id, liked] of Object.entries(map)) {
          if (liked) next.add(id)
          else next.delete(id)
        }
        return next
      })
    },
    [signedIn],
  )

  const toggleLike = useCallback(
    async (trackId, track) => {
      if (!signedIn) return { needsAuth: true, liked: false }
      const wasLiked = likedIdsRef.current.has(trackId)
      const nextLiked = !wasLiked
      const apply = (liked) => {
        const next = new Set(likedIdsRef.current)
        if (liked) next.add(trackId)
        else next.delete(trackId)
        likedIdsRef.current = next
        setLikedIds(next)
        setLikeCount((count) => Math.max(0, count + (liked ? 1 : -1)))
        setLikeEvent({
          seq: Date.now(),
          type: liked ? 'add' : 'remove',
          trackId,
          track: track ?? null,
        })
      }
      apply(nextLiked)
      try {
        if (wasLiked) await libraryApi.unlike(trackId)
        else await libraryApi.like(trackId)
        return { liked: nextLiked }
      } catch (error) {
        apply(wasLiked)
        throw error
      }
    },
    [signedIn],
  )

  const createPlaylist = useCallback(async (body = {}) => {
    const playlist = await libraryApi.createPlaylist(body)
    setPlaylists((current) => [playlist, ...current])
    return playlist
  }, [])

  const addToPlaylist = useCallback(async (playlistId, trackId) => {
    const result = await libraryApi.addPlaylistTrack(playlistId, trackId)
    setPlaylists((current) =>
      current.map((item) =>
        item.id === playlistId ? { ...item, trackCount: (item.trackCount ?? 0) + 1 } : item,
      ),
    )
    return result
  }, [])

  const createAndAdd = useCallback(async (trackId) => {
    const playlist = await libraryApi.createPlaylist({})
    await libraryApi.addPlaylistTrack(playlist.id, trackId)
    setPlaylists((current) => [{ ...playlist, trackCount: 1 }, ...current])
    return playlist
  }, [])

  const removePlaylist = useCallback(async (playlistId) => {
    await libraryApi.deletePlaylist(playlistId)
    setPlaylists((current) => current.filter((item) => item.id !== playlistId))
  }, [])

  const isLiked = useCallback((trackId) => likedIds.has(trackId), [likedIds])

  const value = useMemo(
    () => ({
      playlists,
      likeCount,
      likeEvent,
      libraryReady,
      isLiked,
      refreshPlaylists,
      refreshLikes,
      primeLikes,
      toggleLike,
      createPlaylist,
      addToPlaylist,
      createAndAdd,
      removePlaylist,
    }),
    [
      playlists,
      likeCount,
      likeEvent,
      libraryReady,
      isLiked,
      refreshPlaylists,
      refreshLikes,
      primeLikes,
      toggleLike,
      createPlaylist,
      addToPlaylist,
      createAndAdd,
      removePlaylist,
    ],
  )

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook lives next to the provider
export function useLibrary() {
  const value = useContext(LibraryContext)
  if (!value) throw new Error('useLibrary must be used inside LibraryProvider')
  return value
}
