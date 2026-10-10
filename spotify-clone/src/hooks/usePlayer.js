import { useContext } from 'react'
import { PlayerContext } from '../context/PlayerContext.jsx'

export function usePlayer() {
  const value = useContext(PlayerContext)
  if (!value) throw new Error('usePlayer must be used inside PlayerContextProvider')
  return value
}
