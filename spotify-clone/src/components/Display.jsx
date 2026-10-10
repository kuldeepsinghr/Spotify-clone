import { Route, Routes } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import DisplayHome from './DisplayHome'
import DisplayAlbum from './DisplayAlbum'
import ProtectedRoute from './ProtectedRoute'
import Profile from '../pages/Profile'
import Search from '../pages/Search'
import LikedSongs from '../pages/LikedSongs'
import Playlist from '../pages/Playlist'
import Artist from '../pages/Artist'
import NotFound from '../pages/NotFound'

const Display = () => {
  const { signedIn } = useAuth()
  return (
  <div
    className={
      signedIn
        ? 'flex-1 min-w-0 m-2 px-4 pt-3 rounded bg-gradient-to-b from-[#2a2a2a] to-[#121212] text-white overflow-auto'
        : 'w-[100%] m-2 px-6 pt-4 rounded bg-[#121212] text-white overflow-auto lg:w-[75%] lg:ml-0'
    }
  >
    <Routes>
      <Route path="/" element={<DisplayHome />} />
      <Route path="/search" element={<Search />} />
      <Route path="/album/:id" element={<DisplayAlbum />} />
      <Route path="/artist/:id" element={<Artist />} />
      <Route path="/playlist/:id" element={<Playlist />} />
      <Route
        path="/liked"
        element={
          <ProtectedRoute>
            <LikedSongs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </div>
  )
}

export default Display
