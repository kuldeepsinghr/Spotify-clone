import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { catalogApi } from '../api/catalog.js'
import { apiMessage } from '../api/errors.js'
import AlbumItem from '../components/AlbumItem'
import ArtistItem from '../components/ArtistItem'
import Navbar from '../components/Navbar'
import StatusMessage from '../components/StatusMessage'
import TrackRow from '../components/TrackRow'
import { useLibrary } from '../context/LibraryContext.jsx'
import { usePlayer } from '../hooks/usePlayer.js'

const emptySection = { items: [], nextCursor: null }

const Search = () => {
  const [params] = useSearchParams()
  const q = (params.get('q') ?? '').trim()
  const { playTracks } = usePlayer()
  const { primeLikes } = useLibrary()
  const [tracks, setTracks] = useState(emptySection)
  const [albums, setAlbums] = useState(emptySection)
  const [artists, setArtists] = useState(emptySection)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!q) {
      setTracks(emptySection)
      setAlbums(emptySection)
      setArtists(emptySection)
      setError('')
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    catalogApi
      .search({ q, type: 'all', limit: 8 })
      .then((data) => {
        if (cancelled) return
        setTracks(data.tracks ?? emptySection)
        setAlbums(data.albums ?? emptySection)
        setArtists(data.artists ?? emptySection)
        primeLikes((data.tracks?.items ?? []).map((item) => item.id)).catch(() => {})
      })
      .catch((err) => {
        if (!cancelled) setError(apiMessage(err, 'Search failed'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [q, primeLikes])

  const loadMore = async (type, cursor, setter) => {
    const data = await catalogApi.search({ q, type, limit: 8, cursor })
    const page = data[type === 'track' ? 'tracks' : type === 'album' ? 'albums' : 'artists']
    if (!page) return
    setter((current) => ({ items: [...current.items, ...page.items], nextCursor: page.nextCursor }))
    if (type === 'track') primeLikes(page.items.map((item) => item.id)).catch(() => {})
  }

  return (
    <>
      <Navbar />
      {!q ? (
        <StatusMessage title="Search" body="Find songs, albums, and artists." />
      ) : loading ? (
        <StatusMessage body="Searching…" />
      ) : error ? (
        <StatusMessage title="Could not search" body={error} />
      ) : !tracks.items.length && !albums.items.length && !artists.items.length ? (
        <StatusMessage title={`No results for “${q}”`} body="Try another spelling or a shorter query." />
      ) : (
        <div className="pb-8">
          {tracks.items.length ? (
            <section className="mt-8">
              <h2 className="text-2xl font-bold mb-3">Songs</h2>
              {tracks.items.map((item, index) => (
                <TrackRow
                  key={item.id}
                  track={item}
                  index={index}
                  onPlay={() => playTracks(tracks.items, index)}
                />
              ))}
              {tracks.nextCursor ? (
                <button
                  type="button"
                  className="mt-3 text-sm underline"
                  onClick={() => loadMore('track', tracks.nextCursor, setTracks)}
                >
                  Load more songs
                </button>
              ) : null}
            </section>
          ) : null}

          {albums.items.length ? (
            <section className="mt-8">
              <h2 className="text-2xl font-bold mb-3">Albums</h2>
              <div className="flex overflow-auto">
                {albums.items.map((item) => (
                  <AlbumItem
                    key={item.id}
                    id={item.id}
                    name={item.title}
                    desc={item.description}
                    image={item.coverUrl}
                  />
                ))}
              </div>
              {albums.nextCursor ? (
                <button
                  type="button"
                  className="mt-3 text-sm underline"
                  onClick={() => loadMore('album', albums.nextCursor, setAlbums)}
                >
                  Load more albums
                </button>
              ) : null}
            </section>
          ) : null}

          {artists.items.length ? (
            <section className="mt-8">
              <h2 className="text-2xl font-bold mb-3">Artists</h2>
              <div className="flex overflow-auto">
                {artists.items.map((item) => (
                  <ArtistItem key={item.id} id={item.id} name={item.name} image={item.imageUrl} bio={item.bio} />
                ))}
              </div>
              {artists.nextCursor ? (
                <button
                  type="button"
                  className="mt-3 text-sm underline"
                  onClick={() => loadMore('artist', artists.nextCursor, setArtists)}
                >
                  Load more artists
                </button>
              ) : null}
            </section>
          ) : null}
        </div>
      )}
    </>
  )
}

export default Search
