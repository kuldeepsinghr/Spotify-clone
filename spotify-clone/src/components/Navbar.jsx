import { Link, useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'
import { useAuth } from '../context/AuthContext.jsx'

const Navbar = () => {
  const navigate = useNavigate()
  const { user, signedIn, logout } = useAuth()
  const initial = (user?.displayName ?? '?').trim().charAt(0).toUpperCase()

  return (
    <>
      <div className="w-full flex justify-between items-center font-semibold">
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

      <div className="flex items-center gap-2 mt-4">
        <p className="bg-white text-black rounded-2xl px-4 py-1">All</p>
        <p className="bg-black px-4 py-1 rounded-2xl">Music</p>
      </div>
    </>
  )
}

export default Navbar
