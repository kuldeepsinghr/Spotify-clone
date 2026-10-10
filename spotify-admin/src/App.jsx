import { Navigate, Route, Routes } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'
import Loading from './components/Loading'
import { useAuth } from './context/AuthContext.jsx'
import Login from './pages/Login'
import AccessDenied from './pages/AccessDenied'
import AddSong from './pages/AddSong'
import AddAlbum from './pages/AddAlbum'
import ListSong from './pages/ListSong'
import ListAlbum from './pages/ListAlbum'
import AddArtist from './pages/AddArtist'
import ListArtist from './pages/ListArtist'
import Users from './pages/Users'

// eslint-disable-next-line react/prop-types -- route wrapper
const AdminOnly = ({ children }) => {
  const { isAdmin } = useAuth()
  return isAdmin ? children : <Navigate to="/list-album" replace />
}

const Shell = () => (
  <div className="flex items-start min-h-screen">
    <Sidebar />
    <div className="flex-1 h-screen overflow-y-scroll bg-[#F3FFF7]">
      <Navbar />
      <div className="pt-8 pl-5 sm:pt-12 sm:pl-12 mt-5">
        <Routes>
          <Route path="/" element={<Navigate to="/list-album" replace />} />
          <Route path="/add-song" element={<AddSong />} />
          <Route path="/list-song" element={<ListSong />} />
          <Route path="/add-album" element={<AddAlbum />} />
          <Route path="/list-album" element={<ListAlbum />} />
          <Route
            path="/add-artist"
            element={
              <AdminOnly>
                <AddArtist />
              </AdminOnly>
            }
          />
          <Route
            path="/list-artist"
            element={
              <AdminOnly>
                <ListArtist />
              </AdminOnly>
            }
          />
          <Route
            path="/users"
            element={
              <AdminOnly>
                <Users />
              </AdminOnly>
            }
          />
          <Route path="*" element={<Navigate to="/list-album" replace />} />
        </Routes>
      </div>
    </div>
  </div>
)

const App = () => {
  const { ready, signedIn, canPublish } = useAuth()

  return (
    <>
      {!ready ? <Loading /> : !signedIn ? <Login /> : !canPublish ? <AccessDenied /> : <Shell />}
      <ToastContainer />
    </>
  )
}

export default App
