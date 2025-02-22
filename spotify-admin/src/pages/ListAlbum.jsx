import React, { useEffect, useState } from 'react'
import axios from 'axios'
import {url} from '../App'
import { toast } from 'react-toastify'
import DeleteIcon from '@mui/icons-material/Delete';

const ListAlbum = () => {

  const [albums, setAlbums] = useState([])

  const fetchAlbums = async ()=>{
    try {
      const response = await axios.get(`${url}/api/album/list`)
      // console.log(response.data.album)
      setAlbums(response.data.album)
    } catch (error) {
      toast.error('error')
    }
  }

  const removeAlbum = async (id) =>{
    try {
      const response = await axios.post(`${url}/api/album/remove`, {id})
      if(response.data.success) {
        toast.success('album removed')
        fetchAlbums()
      }
    } catch (error) {
      toast.error('error')
    }
  }

  useEffect(()=>{
    fetchAlbums()
  }, [])

  return (
    <div>
      <p>All Albums list </p>
      <br />
      <div>

        <div className='sm:grid hidden grid-cols-[0.5fr_1fr_2fr_1fr_0.5fr] items-center gap-2.5 p-3 border border-gray-300 text-sm mr-5 bg-gray-100'>
          <b>Image</b>
          <b>Name</b>
          <b>Description</b>
          <b>Album color</b>
          <b>Action</b>
        </div>

        {
          albums.map((item)=>{
            const {bgColor, desc, image, name, _id} = item
            return (
              <div key={_id} className='grid grid-cols-[1fr_1fr_1fr] sm:grid-cols-[0.5fr_1fr_2fr_1fr_0.5fr] items-center gap-2.5 p-3 text-sm border border-gray-300 mr-5'>
                <img src={image} alt="image" className='w-12'/>
                <p>{name}</p>
                <p>{desc}</p>
                <input type="color" value={bgColor}/>
                <p onClick={()=>removeAlbum(_id)} className='cursor-pointer'><DeleteIcon style={{color:'red'}}/></p>
              </div>
            )
          })
        }

      </div>
    </div>
  )
}

export default ListAlbum