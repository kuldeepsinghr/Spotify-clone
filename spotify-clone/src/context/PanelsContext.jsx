/* eslint-disable react/prop-types */
import { createContext, useContext, useMemo, useState } from 'react'

const PanelsContext = createContext(null)

export const PanelsProvider = ({ children }) => {
  const [libraryOpen, setLibraryOpen] = useState(true)
  const [nowPlayingOpen, setNowPlayingOpen] = useState(true)

  const value = useMemo(
    () => ({
      libraryOpen,
      nowPlayingOpen,
      toggleLibrary: () => setLibraryOpen((open) => !open),
      toggleNowPlaying: () => setNowPlayingOpen((open) => !open),
    }),
    [libraryOpen, nowPlayingOpen],
  )

  return <PanelsContext.Provider value={value}>{children}</PanelsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook lives next to the provider
export const usePanels = () => {
  const context = useContext(PanelsContext)
  if (!context) {
    return {
      libraryOpen: true,
      nowPlayingOpen: true,
      toggleLibrary: () => {},
      toggleNowPlaying: () => {},
    }
  }
  return context
}
