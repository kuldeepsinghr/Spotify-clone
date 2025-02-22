import React, { useContext } from 'react'
import Navbar from './Navbar'
// import { albumsData, songsData } from '../assets/assets'
import AlbumItem from './AlbumItem'
import SongItem from './SongItem'
import { PlayerContext } from '../context/PlayerContext'

const DisplayHome = () => {

    const {songsData, albumData} = useContext(PlayerContext)

    return (
        <>
            {/* Navbar */}
            <Navbar />

            {/* =====================List of albums=================== */}
            <div className='mb-4'>
                <h1 className='my-5 text-2xl font-bold'>Featured Charts</h1>
                <div className='flex overflow-auto'>

                    {
                        albumData.map((item, index) => {
                            return <AlbumItem
                                key={index}
                                name={item.name}
                                desc={item.desc}
                                id={item._id}
                                image={item.image}
                            />
                        })
                    }
                </div>
            </div>


            {/* ======================List of Songs =======================*/}
            <div className='mb-4'>
                <h1 className='my-5 text-2xl font-bold'>Today's biggest hits</h1>
                <div className='flex overflow-auto'>

                    {
                        songsData.map((item, index) => {
                            return <SongItem
                                key={index}
                                name={item.name}
                                desc={item.desc}
                                id={item._id}
                                image={item.image}
                            />
                        })
                    }
                </div>
            </div>

        </>
    )
}

export default DisplayHome