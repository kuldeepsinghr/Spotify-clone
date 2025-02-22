import React, { useEffect, useState } from 'react'
import { assets } from '../assets/assets'
import Loading from '../components/Loading'
import axios from 'axios'
import { url } from '../App'
import { toast } from 'react-toastify'

const AddSong = () => {

  const [image, setImage] = useState(false)
  const [song, setSong] = useState(false)
  const [name, setName] = useState("")
  const [desc, setDesc] = useState("")
  const [album, setAlbum] = useState("none")
  const [loading, setLoading] = useState(false)
  const [albumData, setAlbumData] = useState([])

  // console.log(song, image)

  const onSubmitHandler = async (e) => {
    e.preventDefault()

    setLoading(true)
    try {
      const formData = new FormData()

      formData.append('name', name)
      formData.append('desc', desc)
      formData.append('album', album)
      formData.append('image', image)
      formData.append('audio', song)

      const response = await axios.post(`${url}/api/song/add`, formData)

      // console.log(response)

      if(response.data.success){
        toast.success("song added")

        setName("")
        setDesc("")
        setAlbum("none")
        setImage(false)
        setSong(false)
      }

      else{
        toast.error("something went wrong")
      }

    } catch (error) {
      // console.log(error)
      toast.error("error occurred")
      
    }

    setLoading(false)

  }


  const fetchAlbumData = async ()=>{
    try {
      const response = await axios.get(`${url}/api/album/list`)
      // console.log(response.data.album)
      setAlbumData(response.data.album)
    } catch (error) {
      toast.error('error')
    }
  }

  useEffect(()=>{
    fetchAlbumData()
  }, [])

  return loading ? <Loading/> : (
    <form onSubmit={onSubmitHandler} className='flex flex-col items-start gap-8 text-gray-600'>

      {/* ==============Upload songs====================== */}
      <div className='flex gap-8'>
        <div className='flex flex-col gap-4'>
          <p>Upload song</p>
          <input
            onChange={(e) => setSong(e.target.files[0])}
            type="file"
            id='song'
            accept='audio/*'
            hidden
          />
          <label htmlFor="song">
            <img src={song ? assets.upload_added : assets.upload_song} alt="song" className='w-24 cursor-pointer' />
          </label>
        </div>


        {/* ==================Upload Image======================= */}
        <div className='flex flex-col gap-4'>
          <p>Upload image</p>
          <input
            onChange={(e) => setImage(e.target.files[0])}
            type="file"
            id='image'
            accept='image/*'
            hidden
          />
          <label htmlFor="image">
            <img src={image ? URL.createObjectURL(image) : assets.upload_area} alt="" className='w-24 cursor-pointer' />
          </label>
        </div>
      </div>

      {/* ==================Song Name================ */}
      <div className='flex flex-col gap-2.5'>
        <p>Song Name</p>
        <input
          type="text"
          onChange={(e) => setName(e.target.value)}
          value={name}
          className='bg-transparent outline-green-600 border-2 border-gray-400 p-2.5 w-[max(40vw, 250px)]'
          placeholder='type here'
          required
        />
      </div>

      {/* ====================Song description============================ */}
      <div className='flex flex-col gap-2.5'>
        <p>Song Description</p>
        <input
          type="text"
          onChange={(e) => setDesc(e.target.value)}
          value={desc}
          className='bg-transparent outline-green-600 border-2 border-gray-400 p-2.5 w-[max(40vw, 250px)]'
          placeholder='type here'
          required
        />
      </div>


      {/* ===========Select Album====================== */}
      <div className='flex flex-col gap-2.5'>
        <p>Album</p>
        <select
          onChange={(e) => setAlbum(e.target.value)}
          defaultValue={album}
          className='bg-transparent outline-green-600 border-2 border-gray-400 p-2.5 w-[150px]'
        >
          <option value="none">none</option>
          {
            albumData.map((item, index)=>{
              return (
                <option key={index} value={item.name}>{item.name}</option>
              )
            })
          }
        </select>
      </div>


      <button type='submit' className='text-base bg-black text-white py-2.5 px-14 cursor-pointer'>Add</button>

    </form>
  )
}

export default AddSong