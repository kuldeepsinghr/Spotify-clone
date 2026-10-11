/* eslint-disable react/prop-types */
/** Spotify-style equalizer bars for the currently playing item. */
const PlayingBars = ({ className = '' }) => (
  <span className={`playing-bars ${className}`} aria-hidden>
    <span />
    <span />
    <span />
    <span />
  </span>
)

export default PlayingBars
