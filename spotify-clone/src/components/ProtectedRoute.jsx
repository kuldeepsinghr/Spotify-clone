import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// eslint-disable-next-line react/prop-types -- wrapper
const ProtectedRoute = ({ children }) => {
  const { ready, signedIn } = useAuth()
  const location = useLocation()
  if (!ready) return <p className="mt-10 text-[#a7a7a7]">Loading…</p>
  if (!signedIn) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

export default ProtectedRoute
