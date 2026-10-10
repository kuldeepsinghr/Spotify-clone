import { Link } from 'react-router-dom'
import { formatDuration } from '../api/errors.js'
import { usePlayer } from '../hooks/usePlayer.js'
import AddToPlaylist from './AddToPlaylist.jsx'
import LikeButton from './LikeButton.jsx'

/* eslint-disable react/prop-types */
const TrackRow = ({ track, index, albumTitle, onPlay, onRemove, removeLabel = 'Remove' }) => {
  const { playNext, addToQueue, track: current, playStatus } = usePlayer()
  const album = albumTitle ?? track.album?.title ?? track.album?.name ?? ''
  const isCurrent = current?.id === track.id

  return (
    <div
      onClick={() => onPlay?.(track, index)}
      className="grid grid-cols-[16px_1fr_auto] sm:grid-cols-[16px_4fr_3fr_2fr_auto] gap-3 p-2 text-[#a7a7a7] items-center hover:bg-[#ffffff2b] cursor-pointer rounded"
    >
      <p className={`text-sm ${isCurrent ? 'text-green-500' : ''}`}>
        {isCurrent && playStatus ? '▶' : index + 1}
      </p>
      <div className="flex items-center gap-3 min-w-0">
        <img src={track.imageUrl} alt="" className="w-10 h-10 object-cover" />
        <div className="min-w-0">
          <p className={`truncate ${isCurrent ? 'text-green-500' : 'text-white'}`}>{track.title}</p>
          {track.artist?.id ? (
            <Link
              to={`/artist/${track.artist.id}`}
              onClick={(event) => event.stopPropagation()}
              className="text-sm truncate hover:underline"
            >
              {track.artist.name}
            </Link>
          ) : (
            <p className="text-sm truncate">{track.artist?.name}</p>
          )}
        </div>
      </div>
      <p className="hidden sm:block text-[15px] truncate">{album}</p>
      <p className="hidden sm:block text-[15px] text-center">{formatDuration(track.durationMs)}</p>
      <div className="relative z-10 flex items-center gap-1 justify-end" onClick={(event) => event.stopPropagation()}>
        <LikeButton trackId={track.id} track={track} />
        <button
          type="button"
          title="Play next"
          className="text-xs px-1 hover:text-white"
          onClick={() => playNext(track)}
        >
          Next
        </button>
        <button
          type="button"
          title="Add to queue"
          className="text-xs px-1 hover:text-white"
          onClick={() => addToQueue(track)}
        >
          Queue
        </button>
        <AddToPlaylist trackId={track.id} />
        {onRemove ? (
          <button
            type="button"
            title={removeLabel}
            className="text-xs px-1 hover:text-white"
            onClick={() => onRemove(track)}
          >
            ×
          </button>
        ) : null}
      </div>
    </div>
  )
}

export default TrackRow
