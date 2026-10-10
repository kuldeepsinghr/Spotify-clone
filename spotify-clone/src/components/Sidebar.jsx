import { NavLink, useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'
import { useAuth } from '../context/AuthContext.jsx'
import { useLibrary } from '../context/LibraryContext.jsx'

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 pl-8 cursor-pointer ${isActive ? 'text-white' : 'text-[#b3b3b3] hover:text-white'}`

const Sidebar = () => {
  const navigate = useNavigate()
  const { signedIn } = useAuth()
  const { playlists, likeCount, createPlaylist } = useLibrary()

  const onCreate = async () => {
    if (!signedIn) {
      navigate('/login')
      return
    }
    try {
      const playlist = await createPlaylist({})
      navigate(`/playlist/${playlist.id}`)
    } catch {
      /* create is best-effort; stay on the current page */
    }
  }

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
          <button type="button" onClick={onCreate} title="Create playlist">
            <img src={assets.plus_icon} alt="Create playlist" className="w-5" />
          </button>
        </div>

        {signedIn ? (
          <div className="overflow-auto px-2 pb-4">
            <button
              type="button"
              onClick={() => navigate('/liked')}
              className="w-full flex items-center gap-3 p-2 rounded hover:bg-[#ffffff1a] text-left"
            >
              <div className="w-12 h-12 rounded bg-gradient-to-br from-indigo-700 to-white/20 flex items-center justify-center">
                ♥
              </div>
              <div>
                <p className="font-semibold">Liked Songs</p>
                <p className="text-sm text-[#a7a7a7]">{likeCount} songs</p>
              </div>
            </button>
            {playlists.map((playlist) => (
              <button
                key={playlist.id}
                type="button"
                onClick={() => navigate(`/playlist/${playlist.id}`)}
                className="w-full flex items-center gap-3 p-2 rounded hover:bg-[#ffffff1a] text-left"
              >
                {playlist.coverUrl ? (
                  <img src={playlist.coverUrl} alt="" className="w-12 h-12 rounded object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded bg-[#282828] flex items-center justify-center">♪</div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold truncate">{playlist.name}</p>
                  <p className="text-sm text-[#a7a7a7] truncate">
                    Playlist · {playlist.trackCount ?? 0} songs
                  </p>
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
                  Create Playlist
                </button>
              </div>
            ) : null}
          </div>
        ) : (
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
        )}
      </div>
    </div>
  )
}

export default Sidebar
