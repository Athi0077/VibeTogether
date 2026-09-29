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
  const currentSongRef = useRef(null);

  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.crossOrigin = "use-credentials";
      audioRef.current = audio;
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
        const isSrcMissing = !audio.src || audio.src === window.location.href || audio.src.endsWith('undefined');
        if (!currentSongRef.current || currentSongRef.current._id !== state.songId || isSrcMissing) {
          let songObj = library.find(s => s._id === state.songId);
          setIsLoading(true);
          
          try {
            const { data } = await api.get(`/songs/${state.songId}/playback-url`);
            songObj = songObj || data.song; // Use returned song data if not in library
            if (songObj) {
              currentSongRef.current = songObj;
              setCurrentSong(songObj);
              audio.src = data.playbackUrl;
              
              // Fire and forget history tracking
              api.post(`/songs/${songObj._id}/play`).catch(() => {});
              
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
        
        // Use an active check to ensure this async function hasn't been superseded
        if (state.revision < serverRevisionRef.current) return;

        // Wait for startAt if it's in the future
        if (state.isPlaying && state.startAt) {
          const delay = state.startAt - Date.now();
          if (delay > 0) {
            await new Promise(res => setTimeout(res, delay));
          }
        }

        // Check again after awaiting timeout
        if (state.revision < serverRevisionRef.current) return;

        if (state.isPlaying) {
           const drift = (Date.now() - state.serverTimestamp) / 1000;
           expectedPosition += drift;
        }

        if (audio.readyState >= 1) { // HAVE_METADATA
          if (Math.abs(audio.currentTime - expectedPosition) > 0.5 || !state.isPlaying) {
            audio.currentTime = expectedPosition;
            setProgress(expectedPosition);
          }
        }

        if (state.isPlaying && audio.paused) {
          try {
            const playPromise = audio.play();
            if (playPromise !== undefined) {
              await playPromise;
            }
            setIsPlaying(true);
          } catch (playError) {
            if (playError.name === 'AbortError') {
              console.log("Play aborted safely by a new request or pause.");
            } else {
              console.error("Playback failed to start:", playError);
              setIsPlaying(false);
            }
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

    const handleMusicRequestAccept = async (data) => {
      setSessionStatus('pending');
      try {
        const res = await api.get(`/songs/${data.songId}/playback-url`);
        data.playbackUrl = res.data.playbackUrl;
        data.song = res.data.song;
      } catch (err) {
        console.error("Failed to prefetch URL", err);
      }
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
        audio.removeAttribute('src'); // Better than setting to empty string for clean state
      }
      setIsPlaying(false);
      setCurrentSong(null);
      setProgress(0);
      setSessionStatus('idle');
      setPendingInitiator(false);
      setIncomingRequest(null);
      serverRevisionRef.current = 0; // Reset revision so new sessions work
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
  }, [socket, library, activeConversationId]);

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
    // (Removed unlock hack to prevent AbortError. Audio context is unlocked by user interaction in play handler or accept handler.)

    const convId = song._conversationIdOverride || activeConversationId;
    
    if (convId && socket) {
      // Shared Playback Request (Wait for approval)
      let songObj = song;
      if (!songObj.url && songObj._id) {
         // Optionally prefetch here, but for UI just show pending
      }
      currentSongRef.current = songObj;
      setCurrentSong(songObj);
      
      socket.emit('music:play', {
        conversationId: convId,
        songId: song._id,
        playbackPosition: 0
      });
      return;
    }

    // --- SOLO PLAYBACK ---
    let playUrl = song.url;
    let songObj = song;
    if (!playUrl && song._id) {
       setIsLoading(true);
       try {
         const { data } = await api.get(`/songs/${song._id}/playback-url`);
         playUrl = data.playbackUrl;
         songObj = data.song || song;
       } catch (e) {
         console.error(e);
         setIsLoading(false);
         return;
       }
    }
    
    if (playUrl) {
      audio.src = playUrl;
      audio.load();
      currentSongRef.current = songObj;
      setCurrentSong(songObj);
      
      // Fire and forget history tracking
      if (songObj && songObj._id) {
        api.post(`/songs/${songObj._id}/play`).catch(() => {});
      }
    }

    // Solo Playback (No active conversation)
    setIsLoading(true);
    
    try {
      if (!playUrl) throw new Error('No playback URL available');

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
        if (socket && !isRemoteActionRef.current && activeConversationId && sessionStatus === 'playing') {
          socket.emit('music:resume', {
            conversationId: activeConversationId,
            playbackPosition: audio.currentTime
          });
          return;
        } else if (socket && !isRemoteActionRef.current && activeConversationId) {
          // If the session isn't playing yet, maybe it was a new play from inside the chat
          socket.emit('music:play', {
            conversationId: activeConversationId,
            songId: currentSong._id,
            playbackPosition: audio.currentTime
          });
          return;
        }

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
        setIsPlaying(true);
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.error("Toggle play error:", e);
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
      audio.removeAttribute('src');
    }
    setIsPlaying(false);
    currentSongRef.current = null;
    setCurrentSong(null);
    setProgress(0);
    setSessionStatus('inactive');
    serverRevisionRef.current = 0; // Reset revision locally
    
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
        if (incomingRequest.playbackUrl) {
          audio.src = incomingRequest.playbackUrl;
          audio.load();
          const songObj = library.find(s => s._id === incomingRequest.songId) || incomingRequest.song;
          if (songObj) {
            currentSongRef.current = songObj;
            setCurrentSong(songObj);
          }
        }
        
        // Unlock audio for mobile/browsers during user interaction with actual src
        const p = audio.play();
        if (p !== undefined) {
          p.catch((err) => {
            if (err.name !== 'AbortError') console.error("Auto-play on accept failed:", err);
          });
        }
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
