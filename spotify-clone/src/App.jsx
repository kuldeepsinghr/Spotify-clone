import React, { useContext } from 'react'
import Sidebar from './components/Sidebar'
import Player from './components/Player'
import Display from './components/Display'
import { PlayerContext } from './context/PlayerContext'

const App = () => {
  const { audioRef, track, songsData } = useContext(PlayerContext);

  return (
    <div className='bg-black h-screen'>
      {!songsData?.length ? (
        <div className="text-white flex items-center justify-center h-full">
          Loading songs...
        </div>
      ) : (
        <>
          <div className='h-[95%] flex'>
            <Sidebar />
            <Display />
          </div>
          <Player />
        </>
      )}

      <audio ref={audioRef} preload='auto' src={track?.file || ""}></audio>
    </div>
  );
};

export default App