import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { LibraryProvider } from './context/LibraryContext.jsx'
import PlayerContextProvider from './context/PlayerContext.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <LibraryProvider>
          <PlayerContextProvider>
            <App />
          </PlayerContextProvider>
        </LibraryProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
