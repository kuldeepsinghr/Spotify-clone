import React, { useState } from 'react'
import {assets} from '../assets/assets'
import Loading from '../components/Loading'
import axios from 'axios'
import { url } from '../App'
import { toast } from 'react-toastify'

const AddAlbum = () => {

  const [image, setImage] = useState(false)
  const [name, setName] = useState("")
  const [desc, setDesc] = useState("")
  const [bgColor, setBgColor] = useState('#121212')
  const [isLoading, setIsLoading] = useState(false)

  const onSubmitHandler = async (e) =>{
    e.preventDefault()

    setIsLoading(true)
    try {
      const formData = new FormData()

      formData.append("name", name)
      formData.append("image", image)
      formData.append("desc", desc)
      formData.append("bgColor", bgColor)

      const response = await axios.post(`${url}/api/album/add`, formData)

      if(response.data.success){
        toast.success('album created')
        setImage(false)
        setName("")
        setDesc("")
        setBgColor(`#121212`)
      }
      else toast.error('something wrong')

    } catch (error) {
      toast.error('error is occurred')
    }

    setIsLoading(false)
  }

  return isLoading ? <Loading/> : (
    <form onSubmit={onSubmitHandler} className='flex flex-col items-start gap-8 text-gray-600'>

      <div className='flex flex-col gap-4'>
        <p>Upload Image</p>
        <input
         type="file" 
         id='image' 
         accept='image/*'
         onChange={(e)=>setImage(e.target.files[0])}
         hidden
         />
        <label htmlFor="image">
          <img src={image ? URL.createObjectURL(image) : assets.upload_area} alt="image" className='w-24 cursor-pointer' />
        </label>
      </div>

      <div className='flex flex-col gap-4'>
        <p>Album name</p>
        <input
         type="text" 
         placeholder='type here' 
         onChange={(e)=>setName(e.target.value)}
         value={name}
         className='bg-transparent outline-green-600 border-2 border-gray-400 p-2.5 w-[max(40vw, 250px)]'
         />
      </div>

      <div className='flex flex-col gap-4'>
        <p>Album description</p>
        <input
         type="text" 
         placeholder='type here' 
         onChange={(e)=>setDesc(e.target.value)}
         value={desc}
         className='bg-transparent outline-green-600 border-2 border-gray-400 p-2.5 w-[max(40vw, 250px)]'/>
      </div>

      <div className='flex flex-col gap-4'>
        <p>Background color</p>
        <input
         type="color"
         onChange={(e)=>setBgColor(e.target.value)}
         value={bgColor}
         />
      </div>

      <button type='submit' className='text-base bg-black text-white py-2.5 px-14 cursor-pointer'>Add</button>


    </form>
  )
}

export default AddAlbum