import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useLibrary } from '../context/LibraryContext.jsx'
import { pushToast } from '../context/toast.js'

// eslint-disable-next-line react/prop-types
const LikeButton = ({ trackId, track, className = '' }) => {
  const { signedIn } = useAuth()
  const { isLiked, toggleLike } = useLibrary()
  const navigate = useNavigate()
  const liked = Boolean(trackId && isLiked(trackId))

  const onClick = async (event) => {
    event.stopPropagation()
    if (!trackId) return
    if (!signedIn) {
      navigate('/login')
      return
    }
    const nextLiked = !liked
    pushToast(nextLiked ? 'Added to Liked Songs' : 'Removed from Liked Songs', track)
    try {
      await toggleLike(trackId, track)
    } catch {
      pushToast("Couldn't update Liked Songs", track)
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={liked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
      aria-pressed={liked}
      aria-label={liked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
      className={`p-1 ${className}`}
    >
      <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
        {liked ? (
          <>
            <circle cx="12" cy="12" r="9" fill="#1db954" />
            <path d="M8 12.4 10.6 15 16.2 9.4" fill="none" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ) : (
          <>
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-[#a7a7a7]" />
            <path d="M12 8v8M8 12h8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="text-[#a7a7a7]" />
          </>
        )}
      </svg>
    </button>
  )
}

export default LikeButton
