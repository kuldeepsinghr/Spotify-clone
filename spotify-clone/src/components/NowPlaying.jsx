import { Link } from 'react-router-dom'
import { usePlayer } from '../hooks/usePlayer.js'

/* eslint-disable react/prop-types */
const NowPlaying = ({ onClose }) => {
  const { track } = usePlayer()

  return (
    <aside className="hidden lg:flex w-[22rem] shrink-0 m-2 ml-0 rounded bg-[#121212] text-white overflow-auto p-4 flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold">Now playing</h2>
        <button type="button" onClick={onClose} title="Hide now playing" className="text-[#b3b3b3] hover:text-white text-xl leading-none">
          ×
        </button>
      </div>
      {track ? (
        <>
          <img src={track.imageUrl || track.album?.coverUrl || ''} alt="" className="w-full aspect-square object-cover rounded-md bg-[#282828]" />
          <p className="mt-4 text-2xl font-bold leading-tight">{track.title}</p>
          {track.artist?.id ? (
            <Link to={`/artist/${track.artist.id}`} className="mt-1 text-[#b3b3b3] hover:underline">
              {track.artist.name}
            </Link>
          ) : (
            <p className="mt-1 text-[#b3b3b3]">{track.description}</p>
          )}
          {track.album?.id ? (
            <Link to={`/album/${track.album.id}`} className="mt-4 text-sm text-[#b3b3b3] hover:underline">
              From {track.album.title}
            </Link>
          ) : null}
        </>
      ) : (
        <p className="text-[#b3b3b3]">Play a song and the cover shows up here.</p>
      )}
    </aside>
  )
}

export default NowPlaying
