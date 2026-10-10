import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import DeleteIcon from '@mui/icons-material/Delete'
import { catalogApi } from '../api/catalog.js'
import { apiMessage, formatDuration } from '../api/errors.js'

const ListSong = () => {
  const [songs, setSongs] = useState([])
  const [cursor, setCursor] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (nextCursor) => {
    setLoading(true)
    try {
      const page = await catalogApi.pageTracks({ cursor: nextCursor, limit: 20 })
      setSongs((current) => (nextCursor ? [...current, ...page.items] : page.items))
      setCursor(page.nextCursor)
    } catch (error) {
      toast.error(apiMessage(error, 'Could not load songs'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const removeSong = async (id) => {
    if (!window.confirm('Remove this song?')) return
    try {
      await catalogApi.deleteTrack(id)
      toast.success('Song removed')
      setSongs((current) => current.filter((item) => item.id !== id))
    } catch (error) {
      toast.error(apiMessage(error, 'Could not remove the song'))
    }
  }

  return (
    <div>
      <p>All songs</p>
      <br />
      <div className="hidden sm:grid grid-cols-[0.5fr_1fr_2fr_1fr_0.5fr] items-center gap-2.5 p-3 border border-gray-300 text-sm mr-5 bg-gray-100">
        <b>Image</b>
        <b>Title</b>
        <b>Album</b>
        <b>Duration</b>
        <b>Action</b>
      </div>
      {songs.map((item) => (
        <div
          key={item.id}
          className="grid grid-cols-[1fr_1fr_1fr] sm:grid-cols-[0.5fr_1fr_2fr_1fr_0.5fr] items-center gap-2.5 p-3 border border-gray-300 text-sm mr-5"
        >
          <img src={item.imageUrl} alt="" className="w-12" />
          <p>{item.title}</p>
          <p>{item.album?.title}</p>
          <p>{formatDuration(item.durationMs)}</p>
          <button type="button" onClick={() => removeSong(item.id)} className="cursor-pointer text-left">
            <DeleteIcon style={{ color: 'red' }} />
          </button>
        </div>
      ))}
      {cursor ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => load(cursor)}
          className="mt-4 mr-5 border border-gray-400 px-4 py-2 text-sm"
        >
          {loading ? 'Loading…' : 'Load more'}
        </button>
      ) : null}
    </div>
  )
}

export default ListSong
