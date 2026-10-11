import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { catalogApi } from '../api/catalog.js'
import { apiMessage, formatDuration } from '../api/errors.js'
import { assets } from '../assets/assets'
import LikeButton from '../components/LikeButton.jsx'
import Navbar from '../components/Navbar'
import PlayingBars from '../components/PlayingBars.jsx'
import StatusMessage from '../components/StatusMessage'
import { useAuth } from '../context/AuthContext.jsx'
import { pushToast } from '../context/toast.js'
import { useLibrary } from '../context/LibraryContext.jsx'
import { usePlayer } from '../hooks/usePlayer.js'

const DISCOGRAPHY = [
  ['popular', 'Popular releases'],
  ['album', 'Albums'],
  ['single', 'Singles and EPs'],
  ['compilation', 'Compilations'],
]

const typeLabel = (type) => {
  if (type === 'ep') return 'EP'
  if (type === 'single') return 'Single'
  if (type === 'compilation') return 'Compilation'
  return 'Album'
}

const formatCount = (value) => {
  const count = Number(value) || 0
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return count.toLocaleString()
  return String(count)
}

const Artist = () => {
  const { id } = useParams()
  const { user, signedIn } = useAuth()
  const { playTracks, track: current, playStatus } = usePlayer()
  const { primeLikes } = useLibrary()
  const [artist, setArtist] = useState(null)
  const [albums, setAlbums] = useState([])
  const [tracks, setTracks] = useState([])
  const [error, setError] = useState('')
  const [showAllTracks, setShowAllTracks] = useState(false)
  const [discography, setDiscography] = useState('popular')

  useEffect(() => {
    let cancelled = false
    setArtist(null)
    setError('')
    setShowAllTracks(false)
    Promise.all([catalogApi.getArtist(id), catalogApi.artistAlbums(id), catalogApi.artistTopTracks(id, 10)])
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
        <div className="sticky top-0 z-20 pb-3">
          <Navbar />
        </div>
        <StatusMessage title="Artist not found" body={error} />
      </>
    )
  }

  if (!artist) {
    return (
      <>
        <div className="sticky top-0 z-20 pb-3">
          <Navbar />
        </div>
        <StatusMessage body="Loading artist…" />
      </>
    )
  }

  const hero = artist.bannerImageUrl || artist.imageUrl
  const visibleTracks = showAllTracks ? tracks : tracks.slice(0, 5)
  const releases = [...albums].sort((a, b) => String(b.releasedAt || '').localeCompare(String(a.releasedAt || '')))
  const discographyItems = releases.filter((item) => {
    const type = item.type || 'album'
    if (discography === 'album') return type === 'album'
    if (discography === 'single') return type === 'single' || type === 'ep'
    if (discography === 'compilation') return type === 'compilation'
    return true
  })
  const bleed = signedIn ? '-mx-4' : '-mx-6'

  return (
    <>
      <div className="sticky top-0 z-20 mb-3">
        <Navbar />
      </div>
      <header
        className={`relative h-[300px] overflow-hidden rounded-t bg-[#282828] bg-cover bg-center ${bleed}`}
        style={{ backgroundImage: hero ? `url(${hero})` : undefined }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-[#121212]" />
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
          {artist.verified ? (
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#3d91f4] text-sm">✓</span>
              Verified Artist
            </p>
          ) : (
            <p className="mb-2 text-sm font-semibold">Artist</p>
          )}
          <h1 className="text-5xl font-black tracking-tight md:text-7xl">{artist.name}</h1>
          <p className="mt-3 text-sm font-semibold">{formatCount(artist.monthlyListeners)} monthly listeners</p>
        </div>
      </header>

      <div className="mt-6 flex items-center gap-6">
        <button
          type="button"
          title="Play"
          disabled={!tracks.length}
          onClick={() => playTracks(tracks, 0, { type: 'artist', id: artist?.id })}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1ed760] disabled:opacity-40"
        >
          <img src={assets.play_icon} alt="" className="w-5 brightness-0" />
        </button>
      </div>

      <section className="mt-8">
        <h2 className="mb-4 text-2xl font-bold">Popular</h2>
        {visibleTracks.length === 0 ? (
          <p className="text-sm text-[#b3b3b3]">No popular tracks yet.</p>
        ) : (
          visibleTracks.map((item, index) => {
            const playing = current?.id === item.id && playStatus
            return (
              <div
                key={item.id}
                onClick={() =>
                  playTracks(tracks, tracks.findIndex((track) => track.id === item.id), {
                    type: 'artist',
                    id: artist?.id,
                  })
                }
                className="grid cursor-pointer grid-cols-[24px_1fr_auto] items-center gap-4 rounded px-2 py-2 text-sm hover:bg-white/10 md:grid-cols-[24px_4fr_3fr_auto_auto]"
              >
                <span className={`flex justify-end ${playing ? 'text-[#1ed760]' : 'text-[#b3b3b3]'}`}>
                  {playing ? <PlayingBars /> : index + 1}
                </span>
                <div className="flex min-w-0 items-center gap-3">
                  <img src={item.imageUrl || item.album?.coverUrl} alt="" className="h-10 w-10 object-cover" />
                  <div className="min-w-0">
                    <p className={`truncate font-medium ${playing ? 'text-[#1ed760]' : 'text-white'}`}>
                      {item.title}
                      {item.isExplicit ? <span className="ml-2 rounded-sm bg-[#6a6a6a] px-1 text-[10px] text-black">E</span> : null}
                    </p>
                  </div>
                </div>
                <p className="hidden truncate text-[#b3b3b3] md:block">{item.album?.title}</p>
                <span className="hidden text-[#b3b3b3] md:block">{formatCount(item.playCount)}</span>
                <div className="flex items-center gap-3 text-[#b3b3b3]">
                  <LikeButton trackId={item.id} track={item} />
                  <span>{formatDuration(item.durationMs)}</span>
                </div>
              </div>
            )
          })
        )}
        {tracks.length > 5 ? (
          <button type="button" className="mt-3 text-sm font-bold text-[#b3b3b3] hover:text-white" onClick={() => setShowAllTracks((open) => !open)}>
            {showAllTracks ? 'Show less' : 'See more'}
          </button>
        ) : null}
      </section>

      {releases.length ? (
        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-2xl font-bold">Discography</h2>
          </div>
          <div className="mb-4 flex gap-2 overflow-x-auto">
            {DISCOGRAPHY.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setDiscography(key)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm ${discography === key ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                {label}
              </button>
            ))}
          </div>
          {discographyItems.length === 0 ? (
            <p className="text-sm text-[#b3b3b3]">Nothing in this group yet.</p>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {discographyItems.map((item) => {
                const year = item.releasedAt ? String(item.releasedAt).slice(0, 4) : ''
                return (
                  <Link key={item.id} to={`/album/${item.id}`} className="w-[180px] shrink-0 rounded p-3 hover:bg-white/10">
                    <img src={item.coverUrl} alt="" className="aspect-square w-full rounded object-cover shadow-lg" />
                    <p className="mt-3 truncate font-bold">{item.title}</p>
                    <p className="truncate text-sm text-[#b3b3b3]">{[year, typeLabel(item.type)].filter(Boolean).join(' · ')}</p>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      ) : null}

      <section className="mt-10 flex max-w-3xl gap-6 pb-10">
        <img src={artist.imageUrl} alt="" className="hidden h-40 w-40 rounded-full object-cover sm:block" />
        <div>
          <h2 className="mb-3 text-2xl font-bold">About</h2>
          {artist.genres?.length ? <p className="mb-2 text-sm text-[#b3b3b3]">{artist.genres.map((genre) => genre.name).join(' · ')}</p> : null}
          {artist.longBio || artist.bio ? <p className="whitespace-pre-wrap text-[#b3b3b3]">{artist.longBio || artist.bio}</p> : null}
          {artist.links?.length ? (
            <ul className="mt-3 text-sm">
              {artist.links.map((link) => (
                <li key={link.platform}><a className="capitalize underline" href={link.url}>{link.platform}</a></li>
              ))}
            </ul>
          ) : null}
          <div className="mt-4">
            <ReportButton subjectType="artist" subjectId={artist.id} />
          </div>
        </div>
      </section>
    </>
  )
}

const ReportButton = ({ subjectType, subjectId }) => {
  const { signedIn } = useAuth()
  if (!signedIn) return null
  return (
    <button
      type="button"
      className="text-sm text-[#a7a7a7] underline"
      onClick={async () => {
        const reason = window.prompt('Why are you reporting this?')
        if (!reason || reason.trim().length < 3) return
        try {
          await catalogApi.report({ subjectType, subjectId, reason: reason.trim() })
          pushToast('Report sent')
        } catch {
          pushToast('Could not send the report')
        }
      }}
    >
      Report
    </button>
  )
}
ReportButton.propTypes = { subjectType: () => null, subjectId: () => null }

export default Artist
