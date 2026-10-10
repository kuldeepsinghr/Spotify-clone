import { useAuth } from '../context/AuthContext.jsx'

const Navbar = () => {
  const { user, logout } = useAuth()
  return (
    <div className="navbar w-full border-b-2 border-gray-800 px-5 sm:px-12 py-4 text-lg fixed z-10 bg-[#F3FFF7] flex justify-between items-center">
      <p>Admin Panel</p>
      <div className="flex items-center gap-4 text-sm">
        <span>
          {user?.displayName} ({user?.role})
        </span>
        <button type="button" onClick={() => logout()} className="underline">
          Log out
        </button>
      </div>
    </div>
  )
}

export default Navbar
