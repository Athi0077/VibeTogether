import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useSocket } from './SocketContext';

const YouTubeContext = createContext();

export function YouTubeProvider({ children }) {
  const [currentVideo, setCurrentVideo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sessionStatus, setSessionStatus] = useState('idle');
  const [incomingRequest, setIncomingRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [isSoloMode, setIsSoloMode] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [savedSongs, setSavedSongs] = useState([]);
  const [musicVolume, setMusicVolume] = useState(() => {
    const saved = localStorage.getItem('yt_music_volume');
    return saved !== null ? parseFloat(saved) : 100;
  });
  const { socket } = useSocket();
  const playerRef = useRef(null);

  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
      playerRef.current.setVolume(musicVolume);
    }
    localStorage.setItem('yt_music_volume', musicVolume.toString());
  }, [musicVolume]);

  useEffect(() => {
    const fetchSavedSongs = async () => {
      try {
        const { data } = await api.get('/youtube-player/saved');
        setSavedSongs(data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchSavedSongs();
  }, []);

  useEffect(() => {
    if (!socket) return;

    let checkReadyInterval = null;

    const handleState = (state) => {
      setSessionStatus(state.status);
      if (state.videoId && (!currentVideo || currentVideo.videoId !== state.videoId)) {
        setCurrentVideo({ videoId: state.videoId, ...(state.videoDetails || {}) });
      }

      if (state.status === 'preparing') {
        if (checkReadyInterval) clearInterval(checkReadyInterval);
        checkReadyInterval = setInterval(() => {
          if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
            playerRef.current.pauseVideo();
            clearInterval(checkReadyInterval);
            socket.emit('yt:ready', { conversationId: activeConversationId, version: state.version });
          }
        }, 200);
      } else if (state.status === 'playing') {
        setIsPlaying(true);
        if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
          const now = Date.now();
          const timeUntilStart = state.startAt ? (state.startAt - now) : 0;
          
          const startPlayback = () => {
            const elapsed = state.serverTimestamp ? (Date.now() - state.serverTimestamp) / 1000 : 0;
            const expected = state.playbackPosition + Math.max(0, elapsed);
            const current = playerRef.current.getCurrentTime();
            if (Math.abs(expected - current) > 1.5) {
              playerRef.current.seekTo(expected, true);
            }
            playerRef.current.playVideo();
          };

          if (timeUntilStart > 0) {
            playerRef.current.pauseVideo();
            playerRef.current.seekTo(state.playbackPosition, true);
            setTimeout(startPlayback, timeUntilStart);
          } else {
            startPlayback();
          }
        }
      } else if (state.status === 'paused' || (!state.isPlaying && state.status !== 'preparing' && state.status !== 'failed' && state.status !== 'pending' && state.status !== 'idle')) {
        setIsPlaying(false);
        if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
          playerRef.current.pauseVideo();
          playerRef.current.seekTo(state.playbackPosition, true);
        }
      } else if (state.status === 'failed') {
        alert(`Session Failed: ${state.error}`);
        setCurrentVideo(null);
        setIsPlaying(false);
        setSessionStatus('idle');
      }
    };

    const handleRequestAccept = (data) => {
      setSessionStatus('pending');
      setIncomingRequest(data);
    };

    const handlePending = (data) => {
      setSessionStatus('pending');
    };

    const handleRejected = () => {
      setSessionStatus('idle');
      alert('YouTube request rejected.');
    };

    const handleStopped = () => {
      setSessionStatus('idle');
      setCurrentVideo(null);
      setIsPlaying(false);
      setIncomingRequest(null);
    };

    socket.on('yt:state', handleState);
    socket.on('yt:request_accept', handleRequestAccept);
    socket.on('yt:pending', handlePending);
    socket.on('yt:rejected', handleRejected);
    socket.on('yt:stopped', handleStopped);

    return () => {
      if (checkReadyInterval) clearInterval(checkReadyInterval);
      socket.off('yt:state', handleState);
      socket.off('yt:request_accept', handleRequestAccept);
      socket.off('yt:pending', handlePending);
      socket.off('yt:rejected', handleRejected);
      socket.off('yt:stopped', handleStopped);
    };
  }, [socket, currentVideo, activeConversationId]);

  const syncIntervalRef = useRef(null);

  useEffect(() => {
    if (isPlaying && !isSoloMode && sessionStatus === 'playing') {
      syncIntervalRef.current = setInterval(() => {
        if (!socket || !activeConversationId || !playerRef.current) return;
        socket.emit('yt:request-state', activeConversationId, (response) => {
          if (!response || !response.state) return;
          const state = response.state;
          if (state && state.isPlaying && state.startAt) {
            const exactDrift = (Date.now() - state.startAt) / 1000;
            const expected = state.playbackPosition + Math.max(0, exactDrift);
            const current = playerRef.current.getCurrentTime();
            if (Math.abs(expected - current) > 2.0) {
              playerRef.current.seekTo(expected, true);
            }
          }
        });
      }, 5000);
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isPlaying, isSoloMode, sessionStatus, activeConversationId, socket]);

  const requestPlay = (video) => {
    if (!socket || !activeConversationId) return;
    setCurrentVideo(video);
    socket.emit('yt:play', {
      conversationId: activeConversationId,
      videoId: video.videoId,
      videoDetails: video,
      playbackPosition: 0
    });
  };

  const playSolo = (video) => {
    setCurrentVideo(video);
    setIsSoloMode(true);
    setIsMinimized(false);
    setIsPlaying(true);
    setSessionStatus('solo');
  };

  const acceptRequest = () => {
    if (socket && incomingRequest) {
      setCurrentVideo({ videoId: incomingRequest.videoId, ...(incomingRequest.videoDetails || {}) });
      socket.emit('yt:accept', {
        conversationId: incomingRequest.conversationId,
        requestId: incomingRequest.requestId
      });
      setIncomingRequest(null);
    }
  };

  const rejectRequest = () => {
    if (socket && incomingRequest) {
      socket.emit('yt:reject', {
        conversationId: incomingRequest.conversationId,
        requestId: incomingRequest.requestId
      });
      setIncomingRequest(null);
      setSessionStatus('idle');
    }
  };

  const togglePlay = () => {
    if (!playerRef.current || typeof playerRef.current.getCurrentTime !== 'function') return;
    const currentTime = playerRef.current.getCurrentTime();
    if (isPlaying) {
      if (typeof playerRef.current.pauseVideo === 'function') playerRef.current.pauseVideo();
      setIsPlaying(false);
      if (!isSoloMode && socket && activeConversationId) {
        socket.emit('yt:pause', { conversationId: activeConversationId, playbackPosition: currentTime });
      }
    } else {
      if (typeof playerRef.current.playVideo === 'function') playerRef.current.playVideo();
      setIsPlaying(true);
      if (!isSoloMode && socket && activeConversationId) {
        socket.emit('yt:play', { conversationId: activeConversationId, videoId: currentVideo.videoId, playbackPosition: currentTime });
      }
    }
  };

  const stopVideo = () => {
    if (!isSoloMode && socket && activeConversationId) {
      socket.emit('yt:stop', { conversationId: activeConversationId });
    }
    if (playerRef.current && typeof playerRef.current.stopVideo === 'function') {
      playerRef.current.stopVideo();
    }
    setCurrentVideo(null);
    setIsPlaying(false);
    setIsSoloMode(false);
    setSessionStatus('idle');
  };

  const saveSong = async (videoDetails) => {
    try {
      const { data } = await api.post('/youtube-player/saved', videoDetails);
      setSavedSongs(prev => [data, ...prev]);
      return data;
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const removeSavedSong = async (videoId) => {
    try {
      await api.delete(`/youtube-player/saved/${videoId}`);
      setSavedSongs(prev => prev.filter(s => s.videoId !== videoId));
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  return (
    <YouTubeContext.Provider value={{
      currentVideo, setCurrentVideo,
      isPlaying,
      sessionStatus,
      incomingRequest,
      isModalOpen, setIsModalOpen,
      isMinimized, setIsMinimized,
      isSoloMode, setIsSoloMode,
      activeConversationId, setActiveConversationId,
      playlist, setPlaylist,
      savedSongs, saveSong, removeSavedSong,
      musicVolume, setMusicVolume,
      requestPlay, playSolo,
      acceptRequest,
      rejectRequest,
      togglePlay,
      stopVideo,
      playerRef
    }}>
      {children}
    </YouTubeContext.Provider>
  );
}

export const useYouTube = () => useContext(YouTubeContext);
