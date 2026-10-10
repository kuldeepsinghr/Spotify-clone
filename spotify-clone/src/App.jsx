import { useContext } from 'react'
import { Route, Routes } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Player from './components/Player'
import Display from './components/Display'
import { PlayerContext } from './context/PlayerContext'
import Login from './pages/Login'
import Signup from './pages/Signup'

const Shell = () => {
  const { audioRef, track, catalogReady } = useContext(PlayerContext)

  return (
    <div className="bg-black h-screen">
      {!catalogReady ? (
        <div className="text-white flex items-center justify-center h-full">Loading songs...</div>
      ) : (
        <>
          <div className="h-[95%] flex">
            <Sidebar />
            <Display />
          </div>
          <Player />
        </>
      )}
      <audio ref={audioRef} preload="auto" src={track?.audioUrl || ''} />
    </div>
  )
}

const App = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<Signup />} />
    <Route path="/*" element={<Shell />} />
  </Routes>
)

export default App
