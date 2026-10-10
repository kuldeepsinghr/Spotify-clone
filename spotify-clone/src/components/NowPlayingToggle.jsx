/* eslint-disable react/prop-types */
const NowPlayingToggle = ({ open, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    title={open ? 'Hide now playing' : 'Now playing view'}
    aria-label={open ? 'Hide now playing' : 'Now playing view'}
    aria-pressed={open}
    className={`w-8 h-8 rounded-full flex items-center justify-center ${open ? 'bg-white' : 'hover:bg-[#ffffff1a]'}`}
  >
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className={open ? 'text-black' : 'text-[#b3b3b3]'}>
      <rect x="1.25" y="2.25" width="8.5" height="11.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <rect x="11" y="2.25" width="3.75" height="11.5" rx="1" fill="currentColor" />
    </svg>
  </button>
)

export default NowPlayingToggle
