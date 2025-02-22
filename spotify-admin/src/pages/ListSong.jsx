import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { url } from '../App'
import { toast } from 'react-toastify'
import DeleteIcon from '@mui/icons-material/Delete';

const ListSong = () => {

  const [songData, setSongData] =useState([])

  const fetchSong = async ()=>{
    try {
      const response = await axios.get(`${url}/api/song/list`)
      // console.log(response.data.songs)
      setSongData(response.data.songs)
    } catch (error) {
      toast.error("something went wrong")
    }
  }

  const removeSong = async (id)=>{
    try {
      const response = await axios.post(`${url}/api/song/remove`, {id})
      if(response.data.success){
        toast.success("song removed")
        fetchSong()
      }
    } catch (error) {
      toast.error('something went wrong')
    }
  }

  useEffect(()=>{
    fetchSong()
  }, [])

  return (
    <div>

      <p>All songs list</p>
      <br />

      <div>
        <div className='hidden sm:grid grid-cols-[0.5fr_1fr_2fr_1fr_0.5fr] items-center gap-2.5 p-3 border border-gray-300 text-sm mr-5 bg-gray-100'>
          <b>Image</b>
          <b>Name</b>
          <b>Album</b>
          <b>Duration</b>
          <b>Action</b>
        </div>

        {
          songData.map((item)=>{
            const {image, album, desc, duration, name, _id} = item
            return (
              <div key={_id} className='grid grid-cols-[1fr_1fr_1fr] sm:grid-cols-[0.5fr_1fr_2fr_1fr_0.5fr] items-center gap-2.5 p-3 border border-gray-300 text-sm mr-5'>
                <img src={image} alt="image" className='w-12' />
                <p>{name}</p>
                <p>{album}</p>
                <p>{duration}</p>
                <p onClick={()=>removeSong(_id)} className='cursor-pointer'><DeleteIcon style={{color:'red'}}/></p>
              </div>
            )
          })
        }
      </div>

    </div>
  )
}

export default ListSong