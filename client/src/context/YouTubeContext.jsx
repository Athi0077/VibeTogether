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
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [savedSongs, setSavedSongs] = useState([]);
  const { socket } = useSocket();
  const playerRef = useRef(null);

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

    const handleState = (state) => {
      setSessionStatus('playing');
      if (state.videoId && (!currentVideo || currentVideo.videoId !== state.videoId)) {
        setCurrentVideo({ videoId: state.videoId });
      }
      if (state.isPlaying) {
        setIsPlaying(true);
        if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
          const drift = (Date.now() - state.serverTimestamp) / 1000;
          const expected = state.playbackPosition + drift;
          const current = playerRef.current.getCurrentTime();
          if (Math.abs(expected - current) > 1.5) {
            playerRef.current.seekTo(expected, true);
          }
          playerRef.current.playVideo();
        }
      } else {
        setIsPlaying(false);
        if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
          playerRef.current.pauseVideo();
          playerRef.current.seekTo(state.playbackPosition, true);
        }
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
      socket.off('yt:state', handleState);
      socket.off('yt:request_accept', handleRequestAccept);
      socket.off('yt:pending', handlePending);
      socket.off('yt:rejected', handleRejected);
      socket.off('yt:stopped', handleStopped);
    };
  }, [socket, currentVideo, activeConversationId]);

  const requestPlay = (video) => {
    if (!socket || !activeConversationId) return;
    setCurrentVideo(video);
    socket.emit('yt:play', {
      conversationId: activeConversationId,
      videoId: video.videoId,
      playbackPosition: 0
    });
  };

  const acceptRequest = () => {
    if (socket && incomingRequest) {
      setCurrentVideo({ videoId: incomingRequest.videoId });
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
    if (!playerRef.current) return;
    const currentTime = playerRef.current.getCurrentTime();
    if (isPlaying) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
      if (socket && activeConversationId) {
        socket.emit('yt:pause', { conversationId: activeConversationId, playbackPosition: currentTime });
      }
    } else {
      playerRef.current.playVideo();
      setIsPlaying(true);
      if (socket && activeConversationId) {
        socket.emit('yt:play', { conversationId: activeConversationId, videoId: currentVideo.videoId, playbackPosition: currentTime });
      }
    }
  };

  const stopVideo = () => {
    if (socket && activeConversationId) {
      socket.emit('yt:stop', { conversationId: activeConversationId });
    }
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
      activeConversationId, setActiveConversationId,
      playlist, setPlaylist,
      savedSongs, saveSong, removeSavedSong,
      requestPlay,
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
