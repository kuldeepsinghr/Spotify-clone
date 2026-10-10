import { usePlayer } from '../hooks/usePlayer.js'

/* eslint-disable react/prop-types */
const SongItem = ({ track, tracks, index }) => {
  const { playTracks } = usePlayer()
  if (!track) return null

  return (
    <div
      onClick={() => playTracks(tracks?.length ? tracks : [track], index ?? 0)}
      className="min-w-[180px] p-2 px-3 rounded cursor-pointer hover:bg-[#ffffff26]"
    >
      <img src={track.imageUrl} alt="" className="rounded" />
      <p className="font-bold mt-2 mb-1">{track.title}</p>
      <p className="text-slate-200 text-sm">{track.description || track.artist?.name}</p>
    </div>
  )
}

export default SongItem
