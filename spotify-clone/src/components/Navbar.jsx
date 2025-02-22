import React from 'react'
import { assets } from '../assets/assets'
import { useNavigate } from 'react-router-dom'

const Navbar = () => {

  // for navigating the pages
  const navigate = useNavigate()

  return (
    <>
     <div className='w-full flex justify-between items-center font-semibold'>

        {/*====================== Previous and next buttons ==================================*/}
        <div className='flex items-center gap-2'>
            <img onClick={()=>navigate(-1)} src={assets.arrow_left} alt="" className='w-8 bg-black p-2 rounded-full cursor-pointer'/>
            <img onClick={()=>navigate(1)} src={assets.arrow_right} alt="" className='w-8 bg-black p-2 rounded-full cursor-pointer'/>
        </div>

        {/* ========================buttons and profile icon ==================================*/}
        <div className='flex items-center gap-4'>
            <p className='bg-white text-black text-[15px] px-4 py-1 rounded-2xl hidden md:block cursor-pointer'>Explore premium</p>
            <p className='rounded-2xl text-[15px] cursor-pointer bg-black px-3 py-1'>Install App</p>
            <p className='rounded-full flex items-center justify-center w-7 h-7 cursor-pointer bg-purple-500'>D</p>
        </div>

    </div>   

    {/* ============================Category buttons - all, music, podcast ===============================*/}
    <div className='flex items-center gap-2 mt-4'>
        <p className='bg-white text-black rounded-2xl px-4 py-1 cursor-pointer'>All</p>
        <p className='bg-black px-4 py-1 rounded-2xl cursor-pointer'>Music</p>
        <p className='bg-black px-4 py-1 rounded-2xl cursor-pointer'>Podcast</p>
    </div>

    </>
  )
}

export default Navbar