import { useContext } from 'react'
import { Link } from 'react-router-dom'
import { assets } from '../assets/assets'
import { PlayerContext } from '../context/PlayerContext'
import { useAuth } from '../context/AuthContext.jsx'

const Player = () => {
  const { seekBar, seekBg, play, pause, playStatus, track, time, previous, next, seekSong } =
    useContext(PlayerContext)
  const { signedIn } = useAuth()

  if (!track) return null

  return (
    <div className="h-[10%] bg-black flex justify-between items-center text-white px-4 fixed z-10 bottom-1 w-full">
      <div className="hidden lg:flex items-center gap-4 min-w-[220px]">
        <img src={track.imageUrl} alt="" className="w-12" />
        <div>
          <p>{track.title}</p>
          <p className="text-sm text-[#a7a7a7]">{(track.description || track.artist?.name || '').slice(0, 24)}</p>
          {track.isPreview ? (
            <p className="text-xs text-green-500">
              {track.audioUrl
                ? 'Preview'
                : signedIn
                  ? 'Audio unavailable'
                  : (
                    <Link to="/login" className="underline">
                      Sign in to play
                    </Link>
                    )}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 m-auto">
        <div className="flex gap-4">
          <img src={assets.shuffle_icon} alt="" className="w-4" />
          <img onClick={previous} src={assets.prev_icon} alt="" className="w-4 cursor-pointer" />
          {playStatus ? (
            <img onClick={pause} src={assets.pause_icon} alt="" className="w-4 cursor-pointer" />
          ) : (
            <img onClick={play} src={assets.play_icon} alt="" className="w-4 cursor-pointer" />
          )}
          <img onClick={next} src={assets.next_icon} alt="" className="w-4 cursor-pointer" />
          <img src={assets.loop_icon} alt="" className="w-4" />
        </div>
        <div className="flex items-center gap-5">
          <p>
            {Number.isFinite(time.currentTime.minute) ? time.currentTime.minute : 0}:
            {String(Number.isFinite(time.currentTime.second) ? time.currentTime.second : 0).padStart(2, '0')}
          </p>
          <div
            ref={seekBg}
            onClick={seekSong}
            className="w-[60vw] max-w-[500px] bg-gray-300 rounded-full cursor-pointer"
          >
            <hr ref={seekBar} className="h-1 border-none w-0 bg-green-800 rounded-full" />
          </div>
          <p>
            {Number.isFinite(time.totalTime.minute) ? time.totalTime.minute : 0}:
            {String(Number.isFinite(time.totalTime.second) ? time.totalTime.second : 0).padStart(2, '0')}
          </p>
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-2 opacity-75 min-w-[220px] justify-end">
        <img src={assets.volume_icon} alt="" className="w-4" />
        <div className="w-20 bg-slate-50 h-1 rounded" />
      </div>
    </div>
  )
}

export default Player
