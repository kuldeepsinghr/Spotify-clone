import { createContext, useEffect, useRef, useState } from "react";
import axios from "axios";

export const PlayerContext = createContext();

const PlayerContextProvider = (props) => {
  const url = "https://spotify-clone-backend-rctz.onrender.com";

  // refs
  const audioRef = useRef(null);
  const seekBg = useRef(null);
  const seekBar = useRef(null);

  // state
  const [songsData, setSongData] = useState([]);
  const [albumData, setAlbumData] = useState([]);
  const [track, setTrack] = useState(null);
  const [playStatus, setPlayStatus] = useState(false);

  const [time, setTime] = useState({
    currentTime: { second: 0, minute: 0 },
    totalTime: { second: 0, minute: 0 },
  });

  // ================= PLAY / PAUSE =================
  const play = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setPlayStatus(true);
    }
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayStatus(false);
    }
  };

  // ================= PLAY WITH ID =================
  const playWithId = (id) => {
    const selectedTrack = songsData.find((item) => item._id === id);
    if (selectedTrack) {
      setTrack(selectedTrack);
    }
  };

  // ================= NEXT / PREVIOUS =================
  const previous = () => {
    if (!track) return;

    const index = songsData.findIndex((item) => item._id === track._id);
    if (index > 0) {
      setTrack(songsData[index - 1]);
    }
  };

  const next = () => {
    if (!track) return;

    const index = songsData.findIndex((item) => item._id === track._id);
    if (index < songsData.length - 1) {
      setTrack(songsData[index + 1]);
    }
  };

  // ================= SEEK =================
  const seekSong = (e) => {
    if (!audioRef.current || !seekBg.current) return;

    const percent = e.nativeEvent.offsetX / seekBg.current.offsetWidth;
    audioRef.current.currentTime = percent * audioRef.current.duration;
    setPlayStatus(true);
  };

  // ================= FETCH DATA =================
  const getSongData = async () => {
    try {
      const response = await axios.get(`${url}/api/song/list`);
      setSongData(response.data.songs);

      if (response.data.songs.length > 0) {
        setTrack(response.data.songs[0]);
      }
    } catch (error) {
      console.log("Song fetch error:", error);
    }
  };

  const getAlbumData = async () => {
    try {
      const response = await axios.get(`${url}/api/album/list`);
      setAlbumData(response.data.album);
    } catch (error) {
      console.log("Album fetch error:", error);
    }
  };

  useEffect(() => {
    getSongData();
    getAlbumData();
  }, []);

  // ================= AUTO PLAY WHEN TRACK CHANGES =================
  useEffect(() => {
    if (track && audioRef.current) {
      audioRef.current.src = track.file;
      audioRef.current
        .play()
        .then(() => setPlayStatus(true))
        .catch(() => setPlayStatus(false));
    }
  }, [track]);

  // ================= TIME UPDATE =================
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      if (!seekBar.current || !audio.duration) return;

      seekBar.current.style.width =
        Math.floor((audio.currentTime / audio.duration) * 100) + "%";

      setTime({
        currentTime: {
          second: Math.floor(audio.currentTime % 60),
          minute: Math.floor(audio.currentTime / 60),
        },
        totalTime: {
          second: Math.floor(audio.duration % 60),
          minute: Math.floor(audio.duration / 60),
        },
      });
    };

    audio.addEventListener("timeupdate", updateTime);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
    };
  }, []);

  // ================= CONTEXT VALUE =================
  const contextValue = {
    audioRef,
    seekBar,
    seekBg,
    track,
    setTrack,
    playStatus,
    setPlayStatus,
    time,
    play,
    pause,
    playWithId,
    previous,
    next,
    seekSong,
    songsData,
    albumData,
  };

  return (
    <PlayerContext.Provider value={contextValue}>
      {props.children}
    </PlayerContext.Provider>
  );
};

export default PlayerContextProvider;