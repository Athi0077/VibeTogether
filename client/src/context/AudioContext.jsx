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
  
  // Shared Session State
  const [sessionStatus, setSessionStatus] = useState('inactive'); // 'inactive' | 'pending' | 'active'
  const [incomingRequest, setIncomingRequest] = useState(null);
  const [pendingInitiator, setPendingInitiator] = useState(false);

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

      if (!state.songId) return; // Defensive check against invalid state

      const audio = audioRef.current;
      isRemoteActionRef.current = true;
      setSessionStatus('playing');
      setPendingInitiator(false);
      setIncomingRequest(null);

      try {
        // If it's a new song, load it
        if (!currentSong || currentSong._id !== state.songId) {
          let songObj = library.find(s => s._id === state.songId);
          setIsLoading(true);
          
          try {
            const { data } = await api.get(`/songs/${state.songId}/playback-url`);
            songObj = songObj || data.song; // Use returned song data if not in library
            if (songObj) {
              setCurrentSong(songObj);
              audio.src = data.playbackUrl;
              
              await new Promise((resolve) => {
                const onCanPlay = () => {
                  cleanup();
                  resolve();
                };
                const onError = () => {
                  cleanup();
                  resolve();
                };
                const cleanup = () => {
                  audio.removeEventListener('canplay', onCanPlay);
                  audio.removeEventListener('error', onError);
                  audio.removeEventListener('abort', onError);
                };
                
                if (audio.readyState >= 3) {
                  resolve();
                } else {
                  audio.addEventListener('canplay', onCanPlay);
                  audio.addEventListener('error', onError);
                  audio.addEventListener('abort', onError);
                }
              });
            }
          } catch (e) {
            console.error("Failed to load song", e);
            setIsLoading(false);
          }
        }

        let expectedPosition = state.playbackPosition;
        
        // Wait for startAt if it's in the future
        if (state.isPlaying && state.startAt) {
          const delay = state.startAt - Date.now();
          if (delay > 0) {
            await new Promise(res => setTimeout(res, delay));
          }
        }

        if (state.isPlaying) {
           const drift = (Date.now() - state.serverTimestamp) / 1000;
           expectedPosition += drift;
        }

        if (Math.abs(audio.currentTime - expectedPosition) > 0.5 || !state.isPlaying) {
          audio.currentTime = expectedPosition;
          setProgress(expectedPosition);
        }

        if (state.isPlaying && audio.paused) {
          try {
            await audio.play();
            setIsPlaying(true);
          } catch (playError) {
            console.error("Playback failed to start:", playError);
            setIsPlaying(false);
          }
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

    const handleMusicPending = (data) => {
      setSessionStatus('pending');
      setPendingInitiator(true);
    };

    const handleMusicRequestAccept = (data) => {
      setSessionStatus('pending');
      setIncomingRequest(data);
    };

    const handleMusicRejected = (data) => {
      setSessionStatus('idle');
      setPendingInitiator(false);
      setIncomingRequest(null);
      alert('Your partner rejected the music request.');
    };

    const handleMusicStopped = () => {
      isRemoteActionRef.current = true;
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
      }
      setIsPlaying(false);
      setCurrentSong(null);
      setProgress(0);
      setSessionStatus('idle');
      setPendingInitiator(false);
      setIncomingRequest(null);
      isRemoteActionRef.current = false;
    };

    socket.on('music:state', handleMusicState);
    socket.on('music:pending', handleMusicPending);
    socket.on('music:request_accept', handleMusicRequestAccept);
    socket.on('music:rejected', handleMusicRejected);
    socket.on('music:stopped', handleMusicStopped);

    return () => {
      socket.off('music:state', handleMusicState);
      socket.off('music:pending', handleMusicPending);
      socket.off('music:request_accept', handleMusicRequestAccept);
      socket.off('music:rejected', handleMusicRejected);
      socket.off('music:stopped', handleMusicStopped);
    };
  }, [socket, currentSong, library, activeConversationId]);

  useEffect(() => {
    if (socket) {
      if (currentSong) {
        socket.emit('user:listening', { songTitle: `${currentSong.title} - ${currentSong.artist}` });
      } else {
        socket.emit('user:listening', { songTitle: null });
      }
    }
  }, [currentSong, socket]);

  const playSong = async (song) => {
    const audio = audioRef.current;
    
    // Unlock audio for mobile browsers
    audio.play().catch(() => {}).finally(() => audio.pause());

    if (activeConversationId && socket) {
       // Do not set current song or loading until accepted
       socket.emit('music:play', {
         conversationId: activeConversationId,
         songId: song._id,
         playbackPosition: 0
       });
       return;
    }

    // Solo Playback (No active conversation)
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
        if (socket && !isRemoteActionRef.current && activeConversationId) {
          socket.emit('music:play', {
            conversationId: activeConversationId,
            songId: currentSong._id,
            playbackPosition: audio.currentTime
          });
          return;
        }

        await audio.play();
        setIsPlaying(true);
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
    setSessionStatus('inactive');
    
    if (socket && !isRemoteActionRef.current && activeConversationId) {
      socket.emit('music:stop', {
        conversationId: activeConversationId
      });
    }
  };

  const acceptMusicRequest = () => {
    if (socket && incomingRequest) {
      const audio = audioRef.current;
      if (audio) {
        // Unlock audio for mobile/browsers during user interaction
        audio.play().catch(() => {}).finally(() => {
          if (!isPlaying) audio.pause();
        });
      }

      socket.emit('music:accept', { 
        conversationId: incomingRequest.conversationId,
        requestId: incomingRequest.requestId 
      });
      setIncomingRequest(null);
    }
  };

  const rejectMusicRequest = () => {
    if (socket && incomingRequest) {
      socket.emit('music:reject', { 
        conversationId: incomingRequest.conversationId,
        requestId: incomingRequest.requestId
      });
      setIncomingRequest(null);
      setSessionStatus('idle');
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
      setActiveConversationId,
      sessionStatus,
      incomingRequest,
      pendingInitiator,
      acceptMusicRequest,
      rejectMusicRequest
    }}>
      {children}
    </AudioContext.Provider>
  );
}

export const useAudio = () => useContext(AudioContext);
