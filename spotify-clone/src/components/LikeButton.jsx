import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useLibrary } from '../context/LibraryContext.jsx'

// eslint-disable-next-line react/prop-types
const LikeButton = ({ trackId, className = '' }) => {
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
    try {
      await toggleLike(trackId)
    } catch {
      /* like toggle is best-effort */
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={liked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
      aria-pressed={liked}
      className={`p-1 ${className}`}
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
        <path
          d="M12 21s-6.7-4.35-9.33-8.4C.8 9.7 2.2 6 5.6 6c1.9 0 3.1 1.1 3.9 2.3C10.3 7.1 11.5 6 13.4 6c3.4 0 4.8 3.7 2.93 6.6C18.7 16.65 12 21 12 21z"
          fill={liked ? '#1db954' : 'none'}
          stroke={liked ? '#1db954' : '#a7a7a7'}
          strokeWidth="1.6"
        />
      </svg>
    </button>
  )
}

export default LikeButton
