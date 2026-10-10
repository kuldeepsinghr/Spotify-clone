import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { assets } from '../assets/assets'
import { useAuth } from '../context/AuthContext.jsx'

const Navbar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const { user, signedIn, logout } = useAuth()
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
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="rounded-full flex items-center justify-center w-8 h-8 bg-purple-500"
                title={user.displayName}
              >
                {initial}
              </button>
              <button
                type="button"
                onClick={() => logout()}
                className="rounded-2xl text-[15px] bg-black px-3 py-1"
              >
                Log out
              </button>
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
