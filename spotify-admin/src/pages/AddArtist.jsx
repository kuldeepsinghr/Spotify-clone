import { useState } from 'react'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets'
import Loading from '../components/Loading'
import { catalogApi } from '../api/catalog.js'
import { apiMessage } from '../api/errors.js'

const AddArtist = () => {
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [image, setImage] = useState(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('bio', bio)
      if (image) formData.append('image', image)
      await catalogApi.createArtist(formData)
      toast.success('Artist created')
      setName('')
      setBio('')
      setImage(null)
    } catch (error) {
      toast.error(apiMessage(error, 'Could not create the artist'))
    } finally {
      setLoading(false)
    }
  }

  return loading ? (
    <Loading />
  ) : (
    <form onSubmit={onSubmit} className="flex flex-col items-start gap-8 text-gray-600">
      <div className="flex flex-col gap-4">
        <p>Image (optional)</p>
        <input
          type="file"
          id="artist-image"
          accept="image/*"
          hidden
          onChange={(e) => setImage(e.target.files[0] ?? null)}
        />
        <label htmlFor="artist-image">
          <img
            src={image ? URL.createObjectURL(image) : assets.upload_area}
            alt=""
            className="w-24 cursor-pointer"
          />
        </label>
      </div>
      <div className="flex flex-col gap-2.5">
        <p>Name</p>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-transparent outline-green-600 border-2 border-gray-400 p-2.5 w-[min(40vw,28rem)]"
        />
      </div>
      <div className="flex flex-col gap-2.5">
        <p>Bio</p>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="bg-transparent outline-green-600 border-2 border-gray-400 p-2.5 w-[min(40vw,28rem)] min-h-24"
        />
      </div>
      <button type="submit" className="text-base bg-black text-white py-2.5 px-14">
        Add
      </button>
    </form>
  )
}

export default AddArtist
