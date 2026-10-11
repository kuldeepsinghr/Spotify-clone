import { Link } from 'react-router-dom'
import { assets } from '../assets/assets'
import { useAuth } from '../context/AuthContext.jsx'
import { usePanels } from '../context/PanelsContext.jsx'
import LikeButton from './LikeButton.jsx'
import NowPlayingToggle from './NowPlayingToggle.jsx'
import QueuePanel from './QueuePanel.jsx'
import { usePlayer } from '../hooks/usePlayer.js'

const clock = (part) =>
  `${Number.isFinite(part.minute) ? part.minute : 0}:${String(
    Number.isFinite(part.second) ? part.second : 0,
  ).padStart(2, '0')}`

const Player = () => {
  const {
    seekBar,
    seekBg,
    play,
    pause,
    playStatus,
    track,
    time,
    previous,
    next,
    seekSong,
    volume,
    muted,
    setVolumeLevel,
    toggleMute,
    shuffle,
    toggleShuffle,
    repeatMode,
    cycleRepeat,
    showQueue,
    setShowQueue,
  } = usePlayer()
  const { signedIn } = useAuth()
  const { nowPlayingOpen, toggleNowPlaying } = usePanels()

  return (
    <>
      <QueuePanel />
      <div className="bg-black fixed z-10 bottom-0 inset-x-0 h-24 grid grid-cols-[1fr_minmax(0,2fr)_1fr] items-center text-white px-4 gap-4">
        <div className="hidden lg:flex items-center gap-4 min-w-0">
          {track ? (
            <>
              <button
                type="button"
                onClick={toggleNowPlaying}
                title={nowPlayingOpen ? 'Hide now playing' : 'Now playing view'}
                className="shrink-0"
              >
                <img src={track.imageUrl || track.album?.coverUrl || ''} alt="" className="w-12 h-12 object-cover" />
              </button>
              <div className="min-w-0">
                <button type="button" onClick={toggleNowPlaying} className="block max-w-full truncate text-left">
                  {track.title}
                </button>
                {track.artist?.id ? (
                  <Link to={`/artist/${track.artist.id}`} className="text-sm text-[#a7a7a7] hover:underline truncate">
                    {track.artist.name}
                  </Link>
                ) : (
                  <p className="text-sm text-[#a7a7a7] truncate">{(track.description || '').slice(0, 24)}</p>
                )}
                {track.isPreview ? (
                  <p className="text-xs text-green-500">
                    {track.audioUrl ? (
                      'Preview'
                    ) : signedIn ? (
                      'Audio unavailable'
                    ) : (
                      <Link to="/login" className="underline">
                        Sign in to play
                      </Link>
                    )}
                  </p>
                ) : null}
              </div>
              <LikeButton trackId={track.id} track={track} />
            </>
          ) : (
            <p className="text-sm text-[#a7a7a7]">Select a song to play</p>
          )}
        </div>

        <div className="flex flex-col items-center justify-center gap-1 min-w-0">
          <div className="flex gap-4 items-center">
            <button type="button" onClick={toggleShuffle} title="Shuffle" className={shuffle ? 'opacity-100' : 'opacity-50'}>
              <img src={assets.shuffle_icon} alt="Shuffle" className="w-4" />
            </button>
            <img onClick={previous} src={assets.prev_icon} alt="Previous" className="w-4 cursor-pointer" />
            {playStatus ? (
              <img onClick={pause} src={assets.pause_icon} alt="Pause" className="w-4 cursor-pointer" />
            ) : (
              <img onClick={play} src={assets.play_icon} alt="Play" className="w-4 cursor-pointer" />
            )}
            <img onClick={next} src={assets.next_icon} alt="Next" className="w-4 cursor-pointer" />
            <button
              type="button"
              onClick={cycleRepeat}
              title={`Repeat: ${repeatMode}`}
              aria-label={`Repeat: ${repeatMode}`}
              className={`relative ${repeatMode === 'off' ? 'opacity-50' : 'opacity-100'}`}
            >
              <img src={assets.loop_icon} alt="Repeat" className="w-4" />
              {repeatMode === 'one' ? (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-green-500">1</span>
              ) : null}
            </button>
          </div>
          <div className="flex items-center gap-3 w-full max-w-[500px]">
            <p className="text-xs text-[#a7a7a7] w-10 text-right shrink-0">{clock(time.currentTime)}</p>
            <div
              ref={seekBg}
              onClick={seekSong}
              className="flex-1 bg-[#4d4d4d] rounded-full cursor-pointer"
            >
              <hr ref={seekBar} className="h-1 border-none w-0 bg-white rounded-full" />
            </div>
            <p className="text-xs text-[#a7a7a7] w-10 shrink-0">{clock(time.totalTime)}</p>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-3 justify-end min-w-0">
          {signedIn ? <NowPlayingToggle open={nowPlayingOpen} onClick={toggleNowPlaying} /> : null}
          <button
            type="button"
            onClick={() => setShowQueue((open) => !open)}
            title="Queue"
            className={showQueue ? 'opacity-100' : 'opacity-70'}
          >
            <img src={assets.queue_icon} alt="Queue" className="w-4" />
          </button>
          <button type="button" onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}>
            <img src={assets.volume_icon} alt="Volume" className={`w-4 ${muted || volume === 0 ? 'opacity-40' : ''}`} />
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={muted ? 0 : volume}
            onChange={(event) => setVolumeLevel(Number(event.target.value))}
            className="w-24 accent-green-600"
            aria-label="Volume"
          />
        </div>
      </div>
    </>
  )
}

export default Player
