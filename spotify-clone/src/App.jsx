import { useContext } from 'react'
import { Route, Routes } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Player from './components/Player'
import Display from './components/Display'
import NowPlaying from './components/NowPlaying'
import { PlayerContext } from './context/PlayerContext'
import { PanelsProvider, usePanels } from './context/PanelsContext.jsx'
import { useAuth } from './context/AuthContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import Login from './pages/Login'
import Signup from './pages/Signup'

const ShellLayout = () => {
  const { audioRef, track } = useContext(PlayerContext)
  const { signedIn } = useAuth()
  const { libraryOpen, nowPlayingOpen, toggleLibrary, toggleNowPlaying } = usePanels()

  return (
    <div className="bg-black h-screen">
      <div className={`${signedIn ? 'h-[88%]' : 'h-[95%]'} flex`}>
        <Sidebar libraryOpen={libraryOpen} onToggleLibrary={toggleLibrary} />
        <Display />
        {signedIn && nowPlayingOpen ? <NowPlaying onClose={toggleNowPlaying} /> : null}
      </div>
      <Player />
      <audio ref={audioRef} preload="auto" src={track?.audioUrl || ''} />
    </div>
  )
}

const Shell = () => (
  <PanelsProvider>
    <ShellLayout />
  </PanelsProvider>
)

const App = () => (
  <ToastProvider>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/*" element={<Shell />} />
    </Routes>
  </ToastProvider>
)

export default App
