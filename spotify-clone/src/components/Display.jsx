import { useContext, useEffect, useRef } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import DisplayHome from './DisplayHome'
import DisplayAlbum from './DisplayAlbum'
import ProtectedRoute from './ProtectedRoute'
import { PlayerContext } from '../context/PlayerContext'
import Profile from '../pages/Profile'

const Display = () => {
  const { albumData } = useContext(PlayerContext)
  const displayRef = useRef()
  const location = useLocation()
  const albumMatch = location.pathname.match(/^\/album\/([^/]+)$/)
  const albumId = albumMatch?.[1] ?? ''
  const album = albumData.find((item) => item.id === albumId)
  const bgcolor = album?.bgColor ?? '#121212'

  useEffect(() => {
    if (!displayRef.current) return
    displayRef.current.style.background = album
      ? `linear-gradient(${bgcolor}, #121212)`
      : '#121212'
  })

  return (
    <div
      ref={displayRef}
      className="w-[100%] m-2 px-6 pt-4 rounded bg-[#121212] text-white overflow-auto lg:w-[75%] lg:ml-0"
    >
      <Routes>
        <Route path="/" element={<DisplayHome />} />
        <Route path="/album/:id" element={<DisplayAlbum />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  )
}

export default Display
