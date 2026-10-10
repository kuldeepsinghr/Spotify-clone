import { usePlayer } from '../hooks/usePlayer.js'

const QueuePanel = () => {
  const { queue, track, playTrack, removeFromQueue, showQueue, setShowQueue, moveInQueue } = usePlayer()
  if (!showQueue) return null

  return (
    <div className="fixed right-4 bottom-[11%] z-20 w-80 max-h-[60vh] overflow-auto bg-[#181818] text-white rounded-lg shadow-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold">Queue</h2>
        <button type="button" onClick={() => setShowQueue(false)} className="text-[#a7a7a7]">
          Close
        </button>
      </div>
      {queue.length === 0 ? (
        <p className="text-sm text-[#a7a7a7]">Nothing in the queue yet. Play a song or use Play next.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {queue.map((item, index) => (
            <li
              key={`${item.id}-${index}`}
              className={`flex items-center gap-2 p-2 rounded hover:bg-[#ffffff1a] ${
                item.id === track?.id ? 'text-green-500' : ''
              }`}
            >
              <button type="button" className="flex-1 text-left min-w-0" onClick={() => playTrack(item)}>
                <p className="truncate text-sm">{item.title}</p>
                <p className="truncate text-xs text-[#a7a7a7]">{item.artist?.name}</p>
              </button>
              <button
                type="button"
                className="text-xs text-[#a7a7a7]"
                disabled={index === 0}
                onClick={() => moveInQueue(index, index - 1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="text-xs text-[#a7a7a7]"
                disabled={index === queue.length - 1}
                onClick={() => moveInQueue(index, index + 1)}
              >
                ↓
              </button>
              <button type="button" className="text-[#a7a7a7]" onClick={() => removeFromQueue(item.id)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default QueuePanel
