import React, { useContext, useEffect, useState } from 'react'
import Navbar from './Navbar'
import { useParams } from 'react-router-dom'
import {assets } from '../assets/assets'
import { PlayerContext } from '../context/PlayerContext'

const DisplayAlbum = ({album}) => {

    // getting the id of "album/:id"
    const {id} = useParams()

    // playWithId, when the user select the song that selected song will play in the player
    const {playWithId, albumData, songsData} = useContext(PlayerContext)

    // getting the single album data from albumsData array by its id
    const [albmData, setAlbmData] = useState("")

    useEffect(()=>{
        albumData.map((item)=>{
            if(item._id === id){
                setAlbmData(item)
            }
        })
    }, [])

  return albmData ? (
    <>
    {/* ================Navbar=================== */}
     <Navbar/>

    {/* Title of album and its image */}
    <div className='mt-10 flex gap-8 flex-col md:flex-row md:items-end'>
        <img src={albmData.image} alt="image" className='w-48 rounded'/>
        <div className='flex flex-col'>
            <p>Playlist</p>
            <h2 className='text-5xl font-bold mb-4 md:text-7xl'>{albmData.name}</h2>
            <h4>{albmData.desc}</h4>
            <p className='mt-1'>
                <img src={assets.spotify_logo} alt="logo" className='inline-block w-5'/>
                <b>Spotify</b>
                . 12,16,565 likes
                . <b>50 songs,</b>
                about 2 hours 30 minutes
            </p>
        </div>
    </div>

    {/* ===========================Table titles =========================== */}
    <div className='grid grid-cols-3 sm:grid-cols-4 mt-10 mb-4 pl-2 text-[#a7a7a7]'>
        <p><b className='mr-4'>#</b>Title</p>
        <p>Album</p>
        <p className='hidden sm:block'>Date Added</p>
        <img src={assets.clock_icon} alt="" className='m-auto w-4'/>
    </div>

    <hr />

    {/* ========================List of songs in albums================================ */}
    {
        songsData.filter((item)=> item.album === album.name).map((item, index)=>{
            return (<div onClick={()=>playWithId(item._id)} className='grid grid-cols-3 sm:grid-cols-4 gap-2 p-2 text-[#a7a7a7] items-center hover:bg-[#ffffff2b] cursor-pointer' key={index}>
                <p className='text-white'>
                    <b className='mr-4 text-[#a7a7a7]'>{index+1}</b>
                    <img src={item.image} alt="" className='inline w-10 mr-5'/>
                    {item.name}
                </p>
                <p className='text-[15px]'>{albumData.name}</p>
                <p className='text-[15px] hidden sm:block'>5 days ago</p>
                <p className='text-[15px] text-center'>{item.duration}</p>
            </div>)
        })
    }
    </>
  ) : null
}

export default DisplayAlbum