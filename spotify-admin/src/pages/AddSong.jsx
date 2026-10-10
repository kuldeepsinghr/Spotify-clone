import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets'
import Loading from '../components/Loading'
import { catalogApi } from '../api/catalog.js'
import { apiMessage } from '../api/errors.js'
import { useAuth } from '../context/AuthContext.jsx'

const AddSong = () => {
  const { isAdmin, user } = useAuth()
  const [image, setImage] = useState(null)
  const [audio, setAudio] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [albumId, setAlbumId] = useState('')
  const [albums, setAlbums] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = isAdmin
      ? catalogApi.listAlbums()
      : user?.artist?.id
        ? catalogApi.albumsByArtist(user.artist.id)
        : Promise.resolve([])
    load.then(setAlbums).catch((error) => toast.error(apiMessage(error, 'Could not load albums')))
  }, [isAdmin, user?.artist?.id])

  const onSubmit = async (event) => {
    event.preventDefault()
    if (!audio) {
      toast.error('Audio file is required')
      return
    }
    if (!albumId) {
      toast.error('Choose an album')
      return
    }
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('description', description)
      formData.append('audio', audio)
      if (image) formData.append('image', image)
      await catalogApi.addTrack(albumId, formData)
      toast.success('Song added')
      setImage(null)
      setAudio(null)
      setTitle('')
      setDescription('')
      setAlbumId('')
    } catch (error) {
      toast.error(apiMessage(error, 'Could not add the song'))
    } finally {
      setLoading(false)
    }
  }

  return loading ? (
    <Loading />
  ) : (
    <form onSubmit={onSubmit} className="flex flex-col items-start gap-8 text-gray-600">
      <div className="flex gap-8">
        <div className="flex flex-col gap-4">
          <p>Upload song</p>
          <input
            onChange={(e) => setAudio(e.target.files[0] ?? null)}
            type="file"
            id="audio"
            accept="audio/*"
            hidden
          />
          <label htmlFor="audio">
            <img src={audio ? assets.upload_added : assets.upload_song} alt="" className="w-24 cursor-pointer" />
          </label>
        </div>
        <div className="flex flex-col gap-4">
          <p>Cover (optional)</p>
          <input
            onChange={(e) => setImage(e.target.files[0] ?? null)}
            type="file"
            id="image"
            accept="image/*"
            hidden
          />
          <label htmlFor="image">
            <img
              src={image ? URL.createObjectURL(image) : assets.upload_area}
              alt=""
              className="w-24 cursor-pointer"
            />
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <p>Song title</p>
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

      <div className="flex flex-col gap-2.5">
        <p>Album</p>
        <select
          required
          value={albumId}
          onChange={(e) => setAlbumId(e.target.value)}
          className="bg-transparent outline-green-600 border-2 border-gray-400 p-2.5 min-w-[16rem]"
        >
          <option value="">Select an album</option>
          {albums.map((album) => (
            <option key={album.id} value={album.id}>
              {album.title}
            </option>
          ))}
        </select>
      </div>

      <button type="submit" className="text-base bg-black text-white py-2.5 px-14">
        Add
      </button>
    </form>
  )
}

export default AddSong
