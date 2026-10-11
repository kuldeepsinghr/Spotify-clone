import { useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'
import LibrarySortMenu from './LibrarySortMenu'
import PlaylistArt from './PlaylistArt'
import { catalogApi } from '../api/catalog.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useLibrary } from '../context/LibraryContext.jsx'

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 pl-8 cursor-pointer ${isActive ? 'text-white' : 'text-[#b3b3b3] hover:text-white'}`

const chips = [
  { id: 'playlists', label: 'Playlists' },
  { id: 'artists', label: 'Artists' },
  { id: 'albums', label: 'Albums' },
]

const SORT_KEY = 'librarySort'
const VIEW_KEY = 'libraryView'

const readPref = (key, fallback, allowed) => {
  try {
    const value = localStorage.getItem(key)
    return allowed.includes(value) ? value : fallback
  } catch {
    return fallback
  }
}

const stamp = (value) => {
  const time = value ? new Date(value).getTime() : 0
  return Number.isFinite(time) ? time : 0
}

const sortItems = (items, sort, getters) => {
  const copy = [...items]
  copy.sort((a, b) => {
    if (sort === 'alphabetical') {
      return getters.title(a).localeCompare(getters.title(b), undefined, { sensitivity: 'base' })
    }
    if (sort === 'creator') {
      const byCreator = getters.creator(a).localeCompare(getters.creator(b), undefined, { sensitivity: 'base' })
      if (byCreator !== 0) return byCreator
      return getters.title(a).localeCompare(getters.title(b), undefined, { sensitivity: 'base' })
    }
    if (sort === 'recentlyAdded') {
      return stamp(getters.added(b)) - stamp(getters.added(a))
    }
    return stamp(getters.recent(b)) - stamp(getters.recent(a))
  })
  return copy
}

const GuestSidebar = () => {
  const navigate = useNavigate()

  return (
    <div className="w-[25%] h-full p-2 flex-col gap-2 text-white hidden lg:flex">
      <div className="bg-[#121212] h-[15%] rounded flex flex-col justify-around">
        <NavLink to="/" end className={linkClass}>
          <img src={assets.home_icon} alt="" className="w-6" />
          <p className="font-bold">Home</p>
        </NavLink>
        <NavLink to="/search" className={linkClass}>
          <img src={assets.search_icon} alt="" className="w-6" />
          <p className="font-bold">Search</p>
        </NavLink>
      </div>

      <div className="bg-[#121212] h-[85%] rounded flex flex-col min-h-0">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <img src={assets.stack_icon} alt="" className="w-8" />
            <p className="font-semibold">Your Library</p>
          </div>
        </div>
        <div className="p-4 bg-[#242424] m-2 rounded font-semibold flex flex-col items-start gap-1 pl-4">
          <h1>Create your first playlist</h1>
          <p className="font-light">Sign in to save songs and playlists</p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="px-4 py-1 bg-white text-[15px] text-black rounded-full mt-4"
          >
            Create Playlist
          </button>
        </div>
      </div>
    </div>
  )
}

/* eslint-disable react/prop-types */
const LibraryItem = ({ view, round, title, kind, subtitle, pinned, art, onClick }) => {
  const grid = view === 'grid' || view === 'gridLarge'
  const compact = view === 'compact'

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-baseline gap-1.5 rounded px-2 py-1.5 text-left text-sm hover:bg-[#ffffff1a]"
      >
        {pinned ? <PinIcon /> : null}
        <span className="min-w-0 truncate">
          <span className="font-semibold text-white">{title}</span>
          <span className="text-[#b3b3b3]"> • {kind}</span>
        </span>
      </button>
    )
  }

  if (grid) {
    const large = view === 'gridLarge'
    return (
      <button type="button" onClick={onClick} className="group w-full rounded p-2 text-left hover:bg-[#ffffff1a]">
        <div className={`relative ${large ? 'mb-3' : 'mb-2'}`}>{art({ size: large ? 'xl' : 'lg', round })}</div>
        <p className={`truncate font-semibold ${large ? 'text-base' : 'text-sm'}`}>{title}</p>
        <p className="mt-0.5 truncate text-xs text-[#b3b3b3]">
          {pinned ? <PinIcon /> : null}
          {subtitle}
        </p>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded p-2 text-left hover:bg-[#ffffff1a]"
    >
      {art({ size: 'md', round })}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{title}</p>
        <p className="truncate text-sm text-[#b3b3b3]">
          {pinned ? <PinIcon /> : null}
          {subtitle}
        </p>
      </div>
    </button>
  )
}

const sizeClass = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'aspect-square w-full',
  xl: 'aspect-square w-full',
}

const PinIcon = () => (
  <svg className="mr-1 inline-block align-[-2px] text-[#1ed760]" width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
    <path d="M10.5 1.5a.75.75 0 0 0-1.1-.66L5.9 2.7a.75.75 0 0 0-.4.66v2.3L2.72 7.44a.75.75 0 0 0-.22.53v1.28c0 .2.08.39.22.53l2.72 2.72c.14.14.33.22.53.22h1.28a.75.75 0 0 0 .53-.22l1.78-1.78h2.3a.75.75 0 0 0 .66-.4l1.86-3.5a.75.75 0 0 0-.66-1.1H10.5V1.5zM7.03 12.03 4.97 9.97l-.72.72 1.34 1.34.72-.72zm2.12-1.41L7.38 8.85l3.1-3.1h1.77l-3.1 5.87z" />
  </svg>
)

const LibrarySidebar = ({ open, onToggle }) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { playlists, likeCount, createPlaylist } = useLibrary()
  const [chip, setChip] = useState('playlists')
  const [query, setQuery] = useState('')
  const [artists, setArtists] = useState([])
  const [albums, setAlbums] = useState([])
  const [sort, setSort] = useState(() =>
    readPref(SORT_KEY, 'recents', ['recents', 'recentlyAdded', 'alphabetical', 'creator']),
  )
  const [view, setView] = useState(() => readPref(VIEW_KEY, 'list', ['compact', 'list', 'grid', 'gridLarge']))

  useEffect(() => {
    let cancelled = false
    Promise.all([catalogApi.listArtists(), catalogApi.listAlbums()])
      .then(([nextArtists, nextAlbums]) => {
        if (cancelled) return
        setArtists(nextArtists)
        setAlbums(nextAlbums)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const onCreate = async () => {
    try {
      const playlist = await createPlaylist({})
      navigate(`/playlist/${playlist.id}`)
    } catch {
      /* stay on the current page */
    }
  }

  const changeSort = (next) => {
    setSort(next)
    localStorage.setItem(SORT_KEY, next)
  }

  const changeView = (next) => {
    setView(next)
    localStorage.setItem(VIEW_KEY, next)
  }

  const needle = query.trim().toLowerCase()
  const showLiked = 'liked songs'.includes(needle) || !needle

  const visiblePlaylists = useMemo(() => {
    const filtered = playlists.filter((item) => item.name.toLowerCase().includes(needle))
    return sortItems(filtered, sort, {
      title: (item) => item.name || '',
      creator: (item) => item.owner?.displayName || user?.displayName || '',
      added: (item) => item.createdAt,
      recent: (item) => item.updatedAt || item.createdAt,
    })
  }, [playlists, needle, sort, user?.displayName])

  const visibleArtists = useMemo(() => {
    const filtered = artists.filter((item) => item.name.toLowerCase().includes(needle))
    return sortItems(filtered, sort, {
      title: (item) => item.name || '',
      creator: (item) => item.name || '',
      added: (item) => item.createdAt || item.approvedAt,
      recent: (item) => item.updatedAt || item.createdAt || item.approvedAt,
    })
  }, [artists, needle, sort])

  const visibleAlbums = useMemo(() => {
    const filtered = albums.filter((item) => item.title.toLowerCase().includes(needle))
    return sortItems(filtered, sort, {
      title: (item) => item.title || '',
      creator: (item) => item.artist?.name || '',
      added: (item) => item.createdAt || item.releasedAt || item.publishedAt,
      recent: (item) => item.updatedAt || item.publishedAt || item.createdAt || item.releasedAt,
    })
  }, [albums, needle, sort])

  const listClass =
    view === 'grid'
      ? 'grid grid-cols-3 gap-1 px-1'
      : view === 'gridLarge'
        ? 'grid grid-cols-2 gap-1 px-1'
        : 'flex flex-col'

  if (!open) {
    return (
      <div className="w-[4.75rem] shrink-0 h-full p-2 text-white hidden lg:flex">
        <div className="bg-[#121212] rounded flex flex-col items-center w-full py-3 gap-3 overflow-auto">
          <button type="button" onClick={onToggle} title="Expand Your Library" className="p-2 rounded-full hover:bg-[#ffffff1a]">
            <img src={assets.stack_icon} alt="" className="w-6" />
          </button>
          <button type="button" onClick={onCreate} title="Create playlist" className="text-2xl leading-none text-[#b3b3b3] hover:text-white">
            +
          </button>
          <button
            type="button"
            onClick={() => navigate('/liked')}
            title="Liked Songs"
            className="w-12 h-12 rounded bg-gradient-to-br from-[#450af5] to-[#c4efd9] flex items-center justify-center text-xl"
          >
            ♥
          </button>
          {playlists.map((playlist) => (
            <button key={playlist.id} type="button" title={playlist.name} onClick={() => navigate(`/playlist/${playlist.id}`)}>
              <PlaylistArt
                coverUrl={playlist.coverUrl}
                images={playlist.previewImages}
                className="w-12 h-12 rounded"
                emptyClassName="text-lg"
              />
            </button>
          ))}
          {artists.slice(0, 8).map((artist) => (
            <button key={artist.id} type="button" title={artist.name} onClick={() => navigate(`/artist/${artist.id}`)}>
              <img src={artist.imageUrl} alt="" className="w-12 h-12 rounded-full object-cover bg-[#282828]" />
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-[22rem] shrink-0 h-full p-2 text-white hidden lg:flex">
      <div className="bg-[#121212] rounded flex flex-col min-h-0 w-full">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <button type="button" onClick={onToggle} title="Collapse Your Library" className="flex items-center gap-3 hover:text-white text-[#b3b3b3]">
            <img src={assets.stack_icon} alt="" className="w-6" />
            <p className="font-bold text-white">Your Library</p>
          </button>
          <button type="button" onClick={onCreate} title="Create playlist" className="text-2xl leading-none text-[#b3b3b3] hover:text-white">
            +
          </button>
        </div>

        <div className="flex gap-2 px-3 pb-3">
          {chips.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setChip(item.id)}
              className={`rounded-full px-3 py-1 text-sm ${
                chip === item.id ? 'bg-white text-black' : 'bg-[#232323] text-white hover:bg-[#2a2a2a]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="px-3 pb-2">
          <div className="flex items-center justify-between gap-2">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search in Your Library"
              className="min-w-0 flex-1 bg-[#232323] rounded px-3 py-1.5 text-sm outline-none"
            />
            <LibrarySortMenu sort={sort} view={view} onSortChange={changeSort} onViewChange={changeView} />
          </div>
        </div>

        <div className={`overflow-auto px-2 pb-4 ${listClass}`}>
          {chip === 'playlists' ? (
            <>
              {showLiked ? (
                <LibraryItem
                  view={view}
                  pinned
                  title="Liked Songs"
                  kind="Playlist"
                  subtitle={`Playlist · ${likeCount} songs`}
                  onClick={() => navigate('/liked')}
                  art={({ size, round }) => (
                    <div
                      className={`${sizeClass[size]} ${round ? 'rounded-full' : 'rounded'} bg-gradient-to-br from-[#450af5] to-[#c4efd9] flex items-center justify-center shrink-0 ${
                        size === 'sm' ? 'text-base' : size === 'md' ? 'text-xl' : 'text-4xl'
                      }`}
                    >
                      ♥
                    </div>
                  )}
                />
              ) : null}
              {visiblePlaylists.map((playlist) => (
                <LibraryItem
                  key={playlist.id}
                  view={view}
                  title={playlist.name}
                  kind="Playlist"
                  subtitle={`Playlist · ${playlist.owner?.displayName || user?.displayName || 'You'}`}
                  onClick={() => navigate(`/playlist/${playlist.id}`)}
                  art={({ size }) => (
                    <PlaylistArt
                      coverUrl={playlist.coverUrl}
                      images={playlist.previewImages}
                      className={`${sizeClass[size]} rounded shrink-0`}
                      emptyClassName={size === 'sm' ? 'text-sm' : size === 'md' ? 'text-lg' : 'text-3xl'}
                    />
                  )}
                />
              ))}
              {playlists.length === 0 ? (
                <div className="col-span-full p-4 bg-[#242424] m-2 rounded font-semibold">
                  <h1>Create your first playlist</h1>
                  <p className="font-light">It is easy, we will help you</p>
                  <button
                    type="button"
                    onClick={onCreate}
                    className="px-4 py-1 bg-white text-[15px] text-black rounded-full mt-4"
                  >
                    Create playlist
                  </button>
                </div>
              ) : null}
            </>
          ) : null}

          {chip === 'artists'
            ? visibleArtists.map((artist) => (
                <LibraryItem
                  key={artist.id}
                  view={view}
                  round
                  title={artist.name}
                  kind="Artist"
                  subtitle="Artist"
                  onClick={() => navigate(`/artist/${artist.id}`)}
                  art={({ size }) => (
                    <img
                      src={artist.imageUrl}
                      alt=""
                      className={`${sizeClass[size]} rounded-full object-cover bg-[#282828] shrink-0`}
                    />
                  )}
                />
              ))
            : null}

          {chip === 'albums'
            ? visibleAlbums.map((album) => {
                const kind =
                  album.type === 'single' ? 'Single' : album.type === 'ep' ? 'EP' : 'Album'
                return (
                  <LibraryItem
                    key={album.id}
                    view={view}
                    title={album.title}
                    kind={kind}
                    subtitle={`${kind} · ${album.artist?.name || 'Unknown'}`}
                    onClick={() => navigate(`/album/${album.id}`)}
                    art={({ size }) => (
                      <img
                        src={album.coverUrl}
                        alt=""
                        className={`${sizeClass[size]} rounded object-cover bg-[#282828] shrink-0`}
                      />
                    )}
                  />
                )
              })
            : null}
        </div>
      </div>
    </div>
  )
}

/* eslint-disable react/prop-types */
const Sidebar = ({ libraryOpen = true, onToggleLibrary }) => {
  const { signedIn } = useAuth()
  return signedIn ? <LibrarySidebar open={libraryOpen} onToggle={onToggleLibrary} /> : <GuestSidebar />
}

export default Sidebar
