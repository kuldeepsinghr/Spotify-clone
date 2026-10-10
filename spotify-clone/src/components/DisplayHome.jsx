import { useContext } from 'react'
import Navbar from './Navbar'
import AlbumItem from './AlbumItem'
import SongItem from './SongItem'
import { PlayerContext } from '../context/PlayerContext'

const DisplayHome = () => {
  const { songsData, albumData } = useContext(PlayerContext)

  return (
    <>
      <Navbar />

      <div className="mb-4">
        <h1 className="my-5 text-2xl font-bold">Featured Charts</h1>
        {albumData.length === 0 ? (
          <p className="text-[#a7a7a7]">No albums yet.</p>
        ) : (
          <div className="flex overflow-auto">
            {albumData.map((item) => (
              <AlbumItem
                key={item.id}
                name={item.title}
                desc={item.description}
                id={item.id}
                image={item.coverUrl}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mb-4">
        <h1 className="my-5 text-2xl font-bold">Today&apos;s biggest hits</h1>
        {songsData.length === 0 ? (
          <p className="text-[#a7a7a7]">No songs yet.</p>
        ) : (
          <div className="flex overflow-auto">
            {songsData.map((item) => (
              <SongItem
                key={item.id}
                name={item.title}
                desc={item.description}
                id={item.id}
                image={item.imageUrl}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export default DisplayHome
