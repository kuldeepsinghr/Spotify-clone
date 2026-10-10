import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import DeleteIcon from '@mui/icons-material/Delete'
import { catalogApi } from '../api/catalog.js'
import { apiMessage } from '../api/errors.js'

const ListArtist = () => {
  const [artists, setArtists] = useState([])
  const [cursor, setCursor] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (nextCursor) => {
    setLoading(true)
    try {
      const page = await catalogApi.pageArtists({ cursor: nextCursor, limit: 20 })
      setArtists((current) => (nextCursor ? [...current, ...page.items] : page.items))
      setCursor(page.nextCursor)
    } catch (error) {
      toast.error(apiMessage(error, 'Could not load artists'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const removeArtist = async (id) => {
    if (!window.confirm('Remove this artist? They must have no albums.')) return
    try {
      await catalogApi.deleteArtist(id)
      toast.success('Artist removed')
      setArtists((current) => current.filter((item) => item.id !== id))
    } catch (error) {
      toast.error(apiMessage(error, 'Could not remove the artist'))
    }
  }

  return (
    <div>
      <p>All artists</p>
      <br />
      <div className="hidden sm:grid grid-cols-[0.5fr_1fr_2fr_0.5fr] items-center gap-2.5 p-3 border border-gray-300 text-sm mr-5 bg-gray-100">
        <b>Image</b>
        <b>Name</b>
        <b>Bio</b>
        <b>Action</b>
      </div>
      {artists.map((item) => (
        <div
          key={item.id}
          className="grid grid-cols-[1fr_1fr] sm:grid-cols-[0.5fr_1fr_2fr_0.5fr] items-center gap-2.5 p-3 text-sm border border-gray-300 mr-5"
        >
          {item.imageUrl ? <img src={item.imageUrl} alt="" className="w-12" /> : <span>—</span>}
          <p>{item.name}</p>
          <p>{item.bio}</p>
          <button type="button" onClick={() => removeArtist(item.id)} className="cursor-pointer text-left">
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

export default ListArtist
