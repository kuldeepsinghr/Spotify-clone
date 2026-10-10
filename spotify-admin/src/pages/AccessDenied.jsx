import { useAuth } from '../context/AuthContext.jsx'

const AccessDenied = () => {
  const { user, logout } = useAuth()
  return (
    <div className="min-h-screen bg-[#F3FFF7] flex items-center justify-center px-4">
      <div className="max-w-md bg-white border border-gray-200 rounded p-8">
        <h1 className="text-2xl font-semibold text-[#003a10]">No access</h1>
        <p className="mt-3 text-gray-700">
          {user?.email} is a listener account. Ask an admin to grant the artist or admin role.
        </p>
        <button type="button" onClick={() => logout()} className="mt-6 bg-black text-white py-2 px-6">
          Log out
        </button>
      </div>
    </div>
  )
}

export default AccessDenied
