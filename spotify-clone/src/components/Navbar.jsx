import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { assets } from '../assets/assets'
import { useAuth } from '../context/AuthContext.jsx'
import { usePanels } from '../context/PanelsContext.jsx'
import NowPlayingToggle from './NowPlayingToggle.jsx'

const Navbar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const { user, signedIn, logout } = useAuth()
  const { nowPlayingOpen, toggleNowPlaying } = usePanels()
  const initial = (user?.displayName ?? '?').trim().charAt(0).toUpperCase()
  const urlQuery = location.pathname === '/search' ? (params.get('q') ?? '') : ''
  const [query, setQuery] = useState(urlQuery)

  useEffect(() => {
    setQuery(urlQuery)
  }, [urlQuery])

  const onSearch = (event) => {
    event.preventDefault()
    const q = query.trim()
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
  }

  return (
    <>
      <div className="w-full flex justify-between items-center font-semibold gap-4">
        <div className="flex items-center gap-2">
          {signedIn ? (
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-10 h-10 rounded-full bg-black flex items-center justify-center"
              title="Home"
            >
              <img src={assets.home_icon} alt="" className="w-5" />
            </button>
          ) : (
            <>
              <img
                onClick={() => navigate(-1)}
                src={assets.arrow_left}
                alt=""
                className="w-8 bg-black p-2 rounded-full cursor-pointer"
              />
              <img
                onClick={() => navigate(1)}
                src={assets.arrow_right}
                alt=""
                className="w-8 bg-black p-2 rounded-full cursor-pointer"
              />
            </>
          )}
        </div>

        <form onSubmit={onSearch} className="flex-1 max-w-md">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="What do you want to play?"
            className="w-full bg-[#242424] rounded-full px-4 py-2 text-sm font-normal outline-none focus:ring-2 focus:ring-white"
          />
        </form>

        <div className="flex items-center gap-3">
          {signedIn ? (
            <>
            <NowPlayingToggle open={nowPlayingOpen} onClick={toggleNowPlaying} />
            <details className="relative">
              <summary className="list-none rounded-full flex items-center justify-center w-8 h-8 bg-[#e91429] cursor-pointer font-bold">
                {initial}
              </summary>
              <div className="absolute right-0 mt-2 w-40 bg-[#282828] rounded shadow-lg p-1 z-30">
                <button type="button" onClick={() => navigate('/profile')} className="w-full text-left px-3 py-2 text-sm hover:bg-[#ffffff14] rounded">
                  {user.displayName}
                </button>
                <button type="button" onClick={() => logout()} className="w-full text-left px-3 py-2 text-sm hover:bg-[#ffffff14] rounded">
                  Log out
                </button>
              </div>
            </details>
            </>
          ) : (
            <>
              <Link to="/signup" className="rounded-2xl text-[15px] bg-black px-3 py-1">
                Sign up
              </Link>
              <Link to="/login" className="bg-white text-black text-[15px] px-4 py-1 rounded-2xl">
                Log in
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default Navbar
