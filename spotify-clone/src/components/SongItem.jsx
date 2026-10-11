import { usePlayer } from '../hooks/usePlayer.js'

/* eslint-disable react/prop-types */
const SongItem = ({ track, tracks, index }) => {
  const { playTracks } = usePlayer()
  if (!track) return null

  return (
    <div
      onClick={() =>
        playTracks(
          tracks?.length ? tracks : [track],
          index ?? 0,
          track.album?.id ? { type: 'album', id: track.album.id } : null,
        )
      }
      className="w-[160px] shrink-0 p-3 rounded cursor-pointer hover:bg-[#ffffff26]"
    >
      <img
        src={track.imageUrl || track.album?.coverUrl || ''}
        alt=""
        className="aspect-square w-full rounded object-cover bg-[#282828]"
      />
      <p className="font-bold mt-2 mb-1 truncate">{track.title}</p>
      <p className="text-[#b3b3b3] text-sm truncate">{track.artist?.name || track.description}</p>
    </div>
  )
}

export default SongItem
