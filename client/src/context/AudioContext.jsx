import { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useSocket } from './SocketContext';

const AudioContext = createContext();

export function AudioProvider({ children }) {
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState(null);
  
  const [library, setLibrary] = useState([]);
  
  const audioRef = useRef(null);
  const { socket } = useSocket();
  
  // Guard variables to prevent infinite socket broadcast loops
  const isRemoteActionRef = useRef(false);
  const serverRevisionRef = useRef(0);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    
    const audio = audioRef.current;
    
    const handleTimeUpdate = () => {
      setProgress(audio.currentTime);
    };
    
    const handleLoadedMetadata = () => setDuration(audio.duration);
    
    const handleEnded = () => {
      setIsPlaying(false);
      window.dispatchEvent(new Event('music:ended'));
    };
    
    const handleError = () => {
      console.error("Audio playback error");
      setIsPlaying(false);
      setIsLoading(false);
    };
    
    const handleCanPlay = () => setIsLoading(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, []);

  // Listen to remote music states
  useEffect(() => {
    if (!socket || !activeConversationId) return;
    
    socket.emit('music:request-state', activeConversationId);

    const handleMusicState = async (state) => {
      if (state.revision <= serverRevisionRef.current && state.revision !== 0) return; // Stale state guard
      serverRevisionRef.current = state.revision;

      const audio = audioRef.current;
      isRemoteActionRef.current = true;

      try {
        // If it's a new song, load it
        if (!currentSong || currentSong._id !== state.songId) {
          // Find the song in library or we need a way to fetch it
          // For now, we assume the song is in library if chat is loaded
          const songObj = library.find(s => s._id === state.songId);
          if (songObj) {
            setCurrentSong(songObj);
            setIsLoading(true);
            const { data } = await api.get(`/songs/${songObj._id}/playback-url`);
            audio.src = data.playbackUrl;
            
            // Wait for audio to be ready enough to seek
            await new Promise(resolve => {
              const onCanPlay = () => {
                audio.removeEventListener('canplay', onCanPlay);
                resolve();
              };
              audio.addEventListener('canplay', onCanPlay);
            });
          }
        }

        // Calculate expected position
        // expectedPosition = recorded position + (current time - server time when recorded)
        let expectedPosition = state.playbackPosition;
        if (state.isPlaying) {
           const drift = (Date.now() - state.serverTimestamp) / 1000;
           expectedPosition += drift;
        }

        // Seek if drift is > 0.5s or if it was paused
        if (Math.abs(audio.currentTime - expectedPosition) > 0.5 || !state.isPlaying) {
          audio.currentTime = expectedPosition;
          setProgress(expectedPosition);
        }

        if (state.isPlaying && audio.paused) {
          await audio.play();
          setIsPlaying(true);
        } else if (!state.isPlaying && !audio.paused) {
          audio.pause();
          setIsPlaying(false);
        }

      } catch (err) {
        console.error("Sync error", err);
      } finally {
        isRemoteActionRef.current = false;
      }
    };

    socket.on('music:state', handleMusicState);
    return () => socket.off('music:state', handleMusicState);
  }, [socket, currentSong, library, activeConversationId]);

  const playSong = async (song) => {
    const audio = audioRef.current;
    
    // Playing a new song
    setCurrentSong(song);
    setIsLoading(true);
    
    try {
      let playUrl = song.url;
      if (!playUrl && song._id) {
        const { data } = await api.get(`/songs/${song._id}/playback-url`);
        playUrl = data.playbackUrl;
      }
      
      if (!playUrl) throw new Error('No playback URL available');

      audio.src = playUrl;
      await audio.play();
      setIsPlaying(true);

      // Emit to room
      if (socket && !isRemoteActionRef.current && activeConversationId) {
        socket.emit('music:play', {
          conversationId: activeConversationId,
          songId: song._id,
          playbackPosition: audio.currentTime
        });
      }
    } catch (error) {
      console.error("Error playing:", error);
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  const togglePlay = async () => {
    if (!currentSong) return;
    const audio = audioRef.current;
    
    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        
        if (socket && !isRemoteActionRef.current && activeConversationId) {
          socket.emit('music:pause', {
            conversationId: activeConversationId,
            playbackPosition: audio.currentTime
          });
        }
      } else {
        await audio.play();
        setIsPlaying(true);
        
        if (socket && !isRemoteActionRef.current && activeConversationId) {
          socket.emit('music:play', {
            conversationId: activeConversationId,
            songId: currentSong._id,
            playbackPosition: audio.currentTime
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const seek = (time) => {
    if (!currentSong) return;
    const audio = audioRef.current;
    
    audio.currentTime = time;
    setProgress(time);
    
    if (socket && !isRemoteActionRef.current && activeConversationId) {
      socket.emit('music:seek', {
        conversationId: activeConversationId,
        playbackPosition: time
      });
    }
  };

  const setLibraryData = (songs) => {
    setLibrary(songs);
  };

  const stopSong = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
    }
    setIsPlaying(false);
    setCurrentSong(null);
    setProgress(0);
    
    if (socket && !isRemoteActionRef.current && activeConversationId) {
      socket.emit('music:pause', {
        conversationId: activeConversationId,
        playbackPosition: 0
      });
    }
  };

  return (
    <AudioContext.Provider value={{
      currentSong,
      isPlaying,
      progress,
      duration,
      isLoading,
      library,
      playSong,
      togglePlay,
      seek,
      stopSong,
      setLibraryData,
      setActiveConversationId
    }}>
      {children}
    </AudioContext.Provider>
  );
}

export const useAudio = () => useContext(AudioContext);
