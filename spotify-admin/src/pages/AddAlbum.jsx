import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets'
import Loading from '../components/Loading'
import { catalogApi } from '../api/catalog.js'
import { apiMessage } from '../api/errors.js'
import { useAuth } from '../context/AuthContext.jsx'

const AddAlbum = () => {
  const { isAdmin, user } = useAuth()
  const [image, setImage] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [bgColor, setBgColor] = useState('#121212')
  const [artistId, setArtistId] = useState('')
  const [artists, setArtists] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isAdmin) return
    catalogApi.listArtists()
      .then(setArtists)
      .catch((error) => toast.error(apiMessage(error, 'Could not load artists')))
  }, [isAdmin])

  const onSubmit = async (event) => {
    event.preventDefault()
    if (!image) {
      toast.error('Cover image is required')
      return
    }
    if (isAdmin && !artistId) {
      toast.error('Choose an artist')
      return
    }
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('description', description)
      formData.append('bgColor', bgColor)
      formData.append('cover', image)
      if (isAdmin) formData.append('artistId', artistId)
      await catalogApi.createAlbum(formData)
      toast.success('Album created')
      setImage(null)
      setTitle('')
      setDescription('')
      setBgColor('#121212')
      setArtistId('')
    } catch (error) {
      toast.error(apiMessage(error, 'Could not create the album'))
    } finally {
      setLoading(false)
    }
  }

  return loading ? (
    <Loading />
  ) : (
    <form onSubmit={onSubmit} className="flex flex-col items-start gap-8 text-gray-600">
      <div className="flex flex-col gap-4">
        <p>Cover</p>
        <input
          type="file"
          id="cover"
          accept="image/*"
          hidden
          onChange={(e) => setImage(e.target.files[0] ?? null)}
        />
        <label htmlFor="cover">
          <img
            src={image ? URL.createObjectURL(image) : assets.upload_area}
            alt=""
            className="w-24 cursor-pointer"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2.5">
        <p>Album title</p>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-transparent outline-green-600 border-2 border-gray-400 p-2.5 w-[min(40vw,28rem)]"
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <p>Description</p>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="bg-transparent outline-green-600 border-2 border-gray-400 p-2.5 w-[min(40vw,28rem)]"
        />
      </div>

      {isAdmin ? (
        <div className="flex flex-col gap-2.5">
          <p>Artist</p>
          <select
            required
            value={artistId}
            onChange={(e) => setArtistId(e.target.value)}
            className="bg-transparent outline-green-600 border-2 border-gray-400 p-2.5 min-w-[16rem]"
          >
            <option value="">Select an artist</option>
            {artists.map((artist) => (
              <option key={artist.id} value={artist.id}>
                {artist.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="text-sm">Publishing as {user?.artist?.name ?? 'your artist profile'}</p>
      )}

      <div className="flex flex-col gap-2.5">
        <p>Background color</p>
        <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
      </div>

      <button type="submit" className="text-base bg-black text-white py-2.5 px-14">
        Add
      </button>
    </form>
  )
}

export default AddAlbum
