import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import PlayerContextProvider from './context/PlayerContext.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PlayerContextProvider>
          <App />
        </PlayerContextProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
