import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'
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
const LibrarySidebar = ({ open, onToggle }) => {
  const navigate = useNavigate()
  const { playlists, likeCount, createPlaylist } = useLibrary()
  const [chip, setChip] = useState('playlists')
  const [query, setQuery] = useState('')
  const [artists, setArtists] = useState([])
  const [albums, setAlbums] = useState([])

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

  const needle = query.trim().toLowerCase()
  const visiblePlaylists = playlists.filter((item) => item.name.toLowerCase().includes(needle))
  const visibleArtists = artists.filter((item) => item.name.toLowerCase().includes(needle))
  const visibleAlbums = albums.filter((item) => item.title.toLowerCase().includes(needle))
  const showLiked = 'liked songs'.includes(needle)

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
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search in Your Library"
            className="w-full bg-[#232323] rounded px-3 py-1.5 text-sm outline-none"
          />
          <p className="text-xs text-[#b3b3b3] mt-2 px-1">Recents</p>
        </div>

        <div className="overflow-auto px-2 pb-4">
          {chip === 'playlists' ? (
            <>
              {showLiked ? (
                <button
                  type="button"
                  onClick={() => navigate('/liked')}
                  className="w-full flex items-center gap-3 p-2 rounded hover:bg-[#ffffff1a] text-left"
                >
                  <div className="w-12 h-12 rounded bg-gradient-to-br from-[#450af5] to-[#c4efd9] flex items-center justify-center text-xl">
                    ♥
                  </div>
                  <div>
                    <p className="font-semibold">Liked Songs</p>
                    <p className="text-sm text-[#b3b3b3]">Playlist · {likeCount} songs</p>
                  </div>
                </button>
              ) : null}
              {visiblePlaylists.map((playlist) => (
                <button
                  key={playlist.id}
                  type="button"
                  onClick={() => navigate(`/playlist/${playlist.id}`)}
                  className="w-full flex items-center gap-3 p-2 rounded hover:bg-[#ffffff1a] text-left"
                >
                  <PlaylistArt
                    coverUrl={playlist.coverUrl}
                    images={playlist.previewImages}
                    className="w-12 h-12 rounded shrink-0"
                    emptyClassName="text-lg"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{playlist.name}</p>
                    <p className="text-sm text-[#b3b3b3] truncate">Playlist · {playlist.trackCount ?? 0} songs</p>
                  </div>
                </button>
              ))}
              {playlists.length === 0 ? (
                <div className="p-4 bg-[#242424] m-2 rounded font-semibold">
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
                <button
                  key={artist.id}
                  type="button"
                  onClick={() => navigate(`/artist/${artist.id}`)}
                  className="w-full flex items-center gap-3 p-2 rounded hover:bg-[#ffffff1a] text-left"
                >
                  <img src={artist.imageUrl} alt="" className="w-12 h-12 rounded-full object-cover bg-[#282828]" />
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{artist.name}</p>
                    <p className="text-sm text-[#b3b3b3]">Artist</p>
                  </div>
                </button>
              ))
            : null}

          {chip === 'albums'
            ? visibleAlbums.map((album) => (
                <button
                  key={album.id}
                  type="button"
                  onClick={() => navigate(`/album/${album.id}`)}
                  className="w-full flex items-center gap-3 p-2 rounded hover:bg-[#ffffff1a] text-left"
                >
                  <img src={album.coverUrl} alt="" className="w-12 h-12 rounded object-cover bg-[#282828]" />
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{album.title}</p>
                    <p className="text-sm text-[#b3b3b3] truncate">Album · {album.artist?.name}</p>
                  </div>
                </button>
              ))
            : null}
        </div>
      </div>
    </div>
  )
}

const Sidebar = ({ libraryOpen = true, onToggleLibrary }) => {
  const { signedIn } = useAuth()
  return signedIn ? <LibrarySidebar open={libraryOpen} onToggle={onToggleLibrary} /> : <GuestSidebar />
}

export default Sidebar
