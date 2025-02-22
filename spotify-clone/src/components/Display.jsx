import React, { useContext, useEffect, useRef } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import DisplayHome from './DisplayHome'
import DisplayAlbum from './DisplayAlbum'
import { PlayerContext } from '../context/PlayerContext'

const Display = () => {

  const {albumData} = useContext(PlayerContext)

  const displayRef = useRef()
  const location = useLocation() // give the current location of page
  const isAlbum = location.pathname.includes("album") // check the current location of page is /album/:id or not
  const albumId = isAlbum ? location.pathname.split('/').pop() : "" // taking the id of album page
  const bgcolor = isAlbum && albumData.length >0 ? albumData.find((x)=> (x._id == albumId)).bgColor : "#121212" // taking taking value of bgcolor from albumData array by its id

  useEffect(()=>{
    // if the current page location is /album/:id then change the bgcolor accordingly
    if(isAlbum) displayRef.current.style.background = `linear-gradient(${bgcolor}, #121212)`
    else displayRef.current.style.background = "#121212"
  }) // every time the page render the useEffect will execute
  
  return (
    <div ref={displayRef} className='w-[100%] m-2 px-6 pt-4 rounded bg-[#121212] text-white overflow-auto lg:w-[75%] lg:ml-0'>
      {
        albumData.length >0
        ? <Routes>
        <Route path='/' element={<DisplayHome/>}/>
        <Route path='/album/:id' element={<DisplayAlbum album={albumData.find((x)=>(x._id === albumId))}/>}/>
      </Routes>

      : null
      }
      
    </div>
  )
}

export default Display