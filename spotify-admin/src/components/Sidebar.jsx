import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const linkClass = ({ isActive }) =>
  `block rounded px-3 py-2 text-sm ${isActive ? 'bg-white text-[#003a10] font-semibold' : 'text-white/90 hover:bg-white/10'}`

const Sidebar = () => {
  const { isAdmin, isArtist } = useAuth()

  return (
    <aside className="bg-[#003a10] text-white min-h-screen w-56 shrink-0 p-4 flex flex-col gap-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-white/60">Studio</p>
        <p className="text-lg font-semibold">Artist portal</p>
      </div>
      {isArtist && (
        <nav className="flex flex-col gap-1">
          <p className="text-xs uppercase text-white/50 px-3 mb-1">Artist</p>
          <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
          <NavLink to="/onboarding" className={linkClass}>Onboarding</NavLink>
          <NavLink to="/profile" className={linkClass}>Profile</NavLink>
          <NavLink to="/releases" className={linkClass}>Releases</NavLink>
          <NavLink to="/stats" className={linkClass}>Statistics</NavLink>
          <NavLink to="/notifications" className={linkClass}>Notifications</NavLink>
          <NavLink to="/account" className={linkClass}>Account</NavLink>
        </nav>
      )}
      {isAdmin && (
        <nav className="flex flex-col gap-1">
          <p className="text-xs uppercase text-white/50 px-3 mb-1">Admin</p>
          <NavLink to="/admin" end className={linkClass}>Overview</NavLink>
          <NavLink to="/admin/profiles" className={linkClass}>Profile review</NavLink>
          <NavLink to="/admin/releases" className={linkClass}>Release review</NavLink>
          <NavLink to="/admin/artists" className={linkClass}>Artists</NavLink>
          <NavLink to="/admin/content" className={linkClass}>Content</NavLink>
          <NavLink to="/users" className={linkClass}>Users</NavLink>
          <NavLink to="/admin/genres" className={linkClass}>Genres</NavLink>
          <NavLink to="/admin/reports" className={linkClass}>Reports</NavLink>
          <NavLink to="/admin/audit" className={linkClass}>Audit log</NavLink>
        </nav>
      )}
    </aside>
  )
}

export default Sidebar
