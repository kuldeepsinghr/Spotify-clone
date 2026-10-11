import { Link } from 'react-router-dom'
import { formatDuration } from '../api/errors.js'
import { usePlayer } from '../hooks/usePlayer.js'
import AddToPlaylist from './AddToPlaylist.jsx'
import LikeButton from './LikeButton.jsx'
import PlayingBars from './PlayingBars.jsx'
import { TRACK_GRID } from './trackGrid.js'

const formatAdded = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/* eslint-disable react/prop-types */
const TrackRow = ({
  track,
  index,
  albumTitle,
  onPlay,
  onRemove,
  removeLabel = 'Remove',
  density = 'list',
  addedAt,
  showAdded = false,
}) => {
  const { playNext, addToQueue, track: current, playStatus } = usePlayer()
  const album = albumTitle ?? track.album?.title ?? track.album?.name ?? ''
  const isCurrent = current?.id === track.id
  const compact = density === 'compact'
  const art = track.imageUrl || track.album?.coverUrl || ''
  const grid = compact ? TRACK_GRID.compact : showAdded ? TRACK_GRID.list : TRACK_GRID.listPlain

  return (
    <div
      onClick={() => onPlay?.(track, index)}
      className={`group relative grid ${grid} items-center gap-4 px-4 text-sm text-[#b3b3b3] hover:bg-[#ffffff1a] cursor-pointer rounded ${
        compact ? 'h-8' : 'h-14'
      }`}
    >
      <span className={`flex w-4 justify-end tabular-nums ${isCurrent ? 'text-[#1ed760]' : ''}`}>
        {isCurrent && playStatus ? <PlayingBars /> : index + 1}
      </span>

      {compact ? (
        <p className={`min-w-0 truncate ${isCurrent ? 'text-[#1ed760]' : 'text-white'}`}>{track.title}</p>
      ) : (
        <div className="flex min-w-0 items-center gap-3">
          {art ? <img src={art} alt="" className="h-10 w-10 shrink-0 object-cover" /> : <div className="h-10 w-10 shrink-0 bg-[#282828]" />}
          <div className="min-w-0">
            <p className={`truncate ${isCurrent ? 'text-[#1ed760]' : 'text-white'}`}>{track.title}</p>
            {track.artist?.id ? (
              <Link
                to={`/artist/${track.artist.id}`}
                onClick={(event) => event.stopPropagation()}
                className="block truncate text-[#b3b3b3] hover:underline hover:text-white"
              >
                {track.artist.name}
              </Link>
            ) : (
              <p className="truncate">{track.artist?.name}</p>
            )}
          </div>
        </div>
      )}

      {compact ? (
        track.artist?.id ? (
          <Link
            to={`/artist/${track.artist.id}`}
            onClick={(event) => event.stopPropagation()}
            className="min-w-0 truncate hover:underline hover:text-white"
          >
            {track.artist.name}
          </Link>
        ) : (
          <p className="min-w-0 truncate">{track.artist?.name}</p>
        )
      ) : null}

      {track.album?.id ? (
        <Link
          to={`/album/${track.album.id}`}
          onClick={(event) => event.stopPropagation()}
          className="min-w-0 truncate hover:underline hover:text-white"
        >
          {album}
        </Link>
      ) : (
        <p className="min-w-0 truncate">{album}</p>
      )}

      {showAdded || compact ? (
        <p className="min-w-0 truncate">{showAdded ? formatAdded(addedAt) : ''}</p>
      ) : null}

      <div className="relative flex items-center justify-end">
        <span className="pointer-events-none absolute right-14 opacity-0 group-hover:pointer-events-auto group-hover:opacity-100">
          <span onClick={(event) => event.stopPropagation()}>
            <LikeButton trackId={track.id} track={track} />
          </span>
        </span>
        <p className="w-[4.5rem] text-right tabular-nums">{formatDuration(track.durationMs)}</p>
        <div
          className="absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 items-center gap-1 bg-gradient-to-l from-[#2a2a2a] via-[#2a2a2a] to-transparent pl-8 opacity-0 group-hover:flex group-hover:opacity-100"
          onClick={(event) => event.stopPropagation()}
        >
          <button type="button" title="Play next" className="px-1 hover:text-white" onClick={() => playNext(track)}>
            Next
          </button>
          <button type="button" title="Add to queue" className="px-1 hover:text-white" onClick={() => addToQueue(track)}>
            Queue
          </button>
          <AddToPlaylist trackId={track.id} />
          {onRemove ? (
            <button type="button" title={removeLabel} className="px-1 hover:text-white" onClick={() => onRemove(track)}>
              ×
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default TrackRow
