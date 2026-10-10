import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useLibrary } from '../context/LibraryContext.jsx'

// eslint-disable-next-line react/prop-types
const AddToPlaylist = ({ trackId }) => {
  const { signedIn } = useAuth()
  const { playlists, addToPlaylist, createAndAdd } = useLibrary()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')

  const onToggle = (event) => {
    event.stopPropagation()
    if (!signedIn) {
      navigate('/login')
      return
    }
    setOpen((value) => !value)
    setMessage('')
  }

  const choose = async (event, playlistId) => {
    event.stopPropagation()
    try {
      await addToPlaylist(playlistId, trackId)
      setMessage('Added')
      setTimeout(() => setOpen(false), 500)
    } catch (error) {
      setMessage(error?.response?.status === 409 ? 'Already in playlist' : 'Could not add')
    }
  }

  const create = async (event) => {
    event.stopPropagation()
    try {
      await createAndAdd(trackId)
      setMessage('Added to new playlist')
      setTimeout(() => setOpen(false), 600)
    } catch {
      setMessage('Could not create playlist')
    }
  }

  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <button type="button" onClick={onToggle} className="text-[#a7a7a7] hover:text-white text-lg px-1" title="Add to playlist">
        +
      </button>
      {open ? (
        <div className="absolute right-0 bottom-7 z-20 w-56 max-h-64 overflow-auto bg-[#282828] rounded shadow-lg p-2 text-sm">
          <button type="button" onClick={create} className="w-full text-left px-2 py-1.5 hover:bg-[#ffffff20] rounded">
            New playlist
          </button>
          {playlists.map((playlist) => (
            <button
              key={playlist.id}
              type="button"
              onClick={(event) => choose(event, playlist.id)}
              className="w-full text-left px-2 py-1.5 hover:bg-[#ffffff20] rounded truncate"
            >
              {playlist.name}
            </button>
          ))}
          {message ? <p className="px-2 pt-1 text-[#1db954]">{message}</p> : null}
        </div>
      ) : null}
    </div>
  )
}

export default AddToPlaylist
