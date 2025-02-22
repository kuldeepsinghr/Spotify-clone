import { createContext, useEffect, useRef, useState } from "react"
import axios from 'axios'


export const PlayerContext = createContext()

const PlayerContextProvider = (props)=>{

    const url = 'https://spotify-clone-backend-rctz.onrender.com'

    // reference variable for audio, seekBg, seekBar
    const audioRef = useRef()
    const seekBg = useRef()
    const seekBar = useRef()

    const [songsData, setSongData] = useState([])
    const [albumData, setAlbumData] = useState([])

    // set the song for the player
    const [track, setTrack] = useState()
    // set the player status play or pause
    const [playStatus, setPlayStatus] = useState(false)
    // set the time of track
    const [time, setTime] = useState({
        currentTime:{
            second:0,
            minute:0
        },
        totalTime:{
            second:0,
            minute:0
        }
    })

    // function for play and pause
    const play = ()=>{
        audioRef.current.play()
        setPlayStatus(true)
    }

    const pause = ()=>{
        audioRef.current.pause()
        setPlayStatus(false)
    }


    // playWithId, when the user select the song that selected song will play in the player
    const playWithId = async (id)=>{
        await songsData.map((item)=>{
            if(id === item._id){
                setTrack(item)
            }
        })

        await audioRef.current.play()
        setPlayStatus(true)
    }


    // functionality of previous and next button the change the songs
    const previous = async ()=>{
        songsData.map(async (item, index)=>{
            if(track._id === item._id && index>0){
                await setTrack(songsData[index-1])
                await audioRef.current.play()
                setPlayStatus(true)
            }
        })
    }

    const next = async ()=>{
        songsData.map(async (item, index)=>{
            if(track._id === item._id && index < songsData.length-1){
                await setTrack(songsData[index+1])
                await audioRef.current.play()
                setPlayStatus(true)
            }
        })
    }


    // seekSong functionality - whenever the user click on the seekBar then song should play from that duration
    const seekSong = (e)=>{
        // console.log(e.nativeEvent.offsetX) 
        audioRef.current.currentTime = (e.nativeEvent.offsetX/seekBg.current.offsetWidth)*audioRef.current.duration
        setPlayStatus(true)
    }


    const getSongData = async ()=>{
        try {
            const response = await axios.get(`${url}/api/song/list`)
            setSongData(response.data.songs)
            setTrack(response.data.songs[0])
        } catch (error) {
            console.log(error)
        }
    }

    const getAlbumData = async ()=>{
        try {
            const response = await axios.get(`${url}/api/album/list`)
            setAlbumData(response.data.album)
        } catch (error) {
            
        }
    }


    useEffect(()=>{
        getSongData()
        getAlbumData()
    }, [])

    // update run time of track
    useEffect(()=>{

        setTimeout(()=>{
            audioRef.current.ontimeupdate = ()=>{

                // set the width of seekBar
                // for the calculation of width we have use the formula "currentTime/totalDuration*100"
                seekBar.current.style.width = Math.floor(audioRef.current.currentTime/audioRef.current.duration*100)+"%"

                setTime({
                    currentTime:{
                        second: Math.floor(audioRef.current.currentTime%60),
                        minute: Math.floor(audioRef.current.currentTime/60)
                    },
                    totalTime:{
                        second: Math.floor(audioRef.current.duration%60),
                        minute: Math.floor(audioRef.current.duration/60)
                    }
                })
            }
        }, 1000)

    }, [audioRef]) // dependency on audioRef


    const contextValue = {
        audioRef,
        seekBar,
        seekBg,
        track, setTrack,
        playStatus, setPlayStatus,
        time,
        play, pause,
        playWithId,
        previous, next,
        seekSong,
        songsData, albumData
    }

    return (
        <PlayerContext.Provider value={contextValue}>
            {props.children}
        </PlayerContext.Provider>
    )
}

export default PlayerContextProvider
