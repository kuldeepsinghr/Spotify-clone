import { NavLink } from 'react-router-dom'
import { assets } from '../assets/assets'
import { useAuth } from '../context/AuthContext.jsx'

const linkClass =
  'flex items-center gap-2.5 text-gray-800 bg-white border border-black p-2 pr-[max(8vw,10px)] text-sm font-medium'

const Sidebar = () => {
  const { isAdmin } = useAuth()

  return (
    <div className="bg-[#003a10] min-h-screen pl-[4vw]">
      <img src={assets.logo} alt="logo" className="mt-5 w-48 hidden sm:block" />
      <img src={assets.logo_small} alt="logo" className="mt-5 w-10 mr-5 block sm:hidden" />

      <div className="flex flex-col gap-5 mt-10">
        <NavLink to="/add-song" className={linkClass}>
          <img src={assets.add_song} alt="" className="w-5" />
          <p className="hidden sm:block">Add song</p>
        </NavLink>
        <NavLink to="/list-song" className={linkClass}>
          <img src={assets.song_icon} alt="" className="w-5" />
          <p className="hidden sm:block">List song</p>
        </NavLink>
        <NavLink to="/add-album" className={linkClass}>
          <img src={assets.add_album} alt="" className="w-5" />
          <p className="hidden sm:block">Add album</p>
        </NavLink>
        <NavLink to="/list-album" className={linkClass}>
          <img src={assets.album_icon} alt="" className="w-5" />
          <p className="hidden sm:block">List album</p>
        </NavLink>
        {isAdmin ? (
          <>
            <NavLink to="/add-artist" className={linkClass}>
              <img src={assets.add_album} alt="" className="w-5" />
              <p className="hidden sm:block">Add artist</p>
            </NavLink>
            <NavLink to="/list-artist" className={linkClass}>
              <img src={assets.album_icon} alt="" className="w-5" />
              <p className="hidden sm:block">List artist</p>
            </NavLink>
            <NavLink to="/users" className={linkClass}>
              <img src={assets.song_icon} alt="" className="w-5" />
              <p className="hidden sm:block">Users</p>
            </NavLink>
          </>
        ) : null}
      </div>
    </div>
  )
}

export default Sidebar
